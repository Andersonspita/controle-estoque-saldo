import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import List

from ..core.audit import registrar_auditoria
from ..database.models import NotaFiscal, ItemContrato, Movimentacao
from ..schemas import BaixaRequest
from ..http_errors import MENSAGEM_GENERICA, logger

async def efetuar_baixa_nf(
    nf_id: int, 
    baixa_req: BaixaRequest, 
    db: AsyncSession,
    usuario_id: int,
    ip: str | None = None,
) -> List[Movimentacao]:
    
    # 1. Busca a NF bloqueando a linha (FOR UPDATE) para evitar baixa duplicada
    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.id == nf_id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    nf = result.scalar_one_or_none()
    
    if not nf or nf.excluida_em is not None:
        raise HTTPException(status_code=404, detail="Nota Fiscal não encontrada")
    
    if nf.status == "Baixada":
        raise HTTPException(status_code=400, detail="Esta Nota Fiscal já foi baixada")

    if not nf.itens:
        raise HTTPException(status_code=400, detail="Nota Fiscal não possui itens vinculados")

    movimentacoes_geradas = []
    justificativa = baixa_req.justificativa or f"Baixa automática referente à NF {nf.numero}/{nf.serie}"

    # 2. Iterar sobre os Itens da Nota e atualizar os Saldos do Contrato
    for item_nf in nf.itens:
        if not item_nf.item_contrato_id:
            raise HTTPException(status_code=400, detail=f"Item {item_nf.codigo} não está vinculado a nenhum Item de Contrato")

        # Busca o Item do Contrato
        stmt_ic = select(ItemContrato).where(ItemContrato.id == item_nf.item_contrato_id).with_for_update()
        result_ic = await db.execute(stmt_ic)
        item_contrato = result_ic.scalar_one_or_none()

        if not item_contrato:
            raise HTTPException(status_code=404, detail=f"Item de Contrato ID {item_nf.item_contrato_id} não encontrado")

        saldo_anterior = item_contrato.saldo_atual
        novo_saldo = saldo_anterior - item_nf.quantidade

        # Atualiza o saldo no banco (se ficar < 0, o banco dará rollback ao final no commit)
        item_contrato.saldo_atual = novo_saldo

        # Registra a Movimentação
        movimentacao = Movimentacao(
            nota_fiscal_id=nf.id,
            item_contrato_id=item_contrato.id,
            tipo_movimento="BAIXA",
            quantidade=item_nf.quantidade,
            saldo_anterior=saldo_anterior,
            saldo_posterior=novo_saldo,
            usuario_id=usuario_id,
            justificativa=justificativa
        )
        db.add(movimentacao)
        movimentacoes_geradas.append(movimentacao)

    # 3. Atualizar Status da NF
    nf.status = "Baixada"

    await registrar_auditoria(
        db,
        usuario_id=usuario_id,
        operacao="UPDATE",
        tabela="notas_fiscais",
        registro_id=str(nf.id),
        dados_novos={
            "operacao": "baixa",
            "numero": nf.numero,
            "serie": nf.serie,
            "status": nf.status,
            "qtd_itens": len(movimentacoes_geradas),
            "justificativa": justificativa,
        },
        ip=ip,
    )

    try:
        await db.commit()
        
        for mov in movimentacoes_geradas:
            await db.refresh(mov)
            
        return movimentacoes_geradas
    except Exception as e:
        await db.rollback()
        if 'ck_itens_contrato_saldo' in str(e) or 'IntegrityError' in str(e):
             raise HTTPException(
                 status_code=422, 
                 detail="A quantidade total de um ou mais itens excede o saldo disponível no contrato. Operação abortada e desfeita integralmente."
             )
        logger.exception("Falha ao efetuar baixa da NF")
        raise HTTPException(status_code=400, detail=MENSAGEM_GENERICA)
