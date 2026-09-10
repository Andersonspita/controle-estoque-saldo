from typing import List

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from ..database.models import (
    ItemContrato,
    Movimentacao,
    NotaFiscal,
)
from ..http_errors import MENSAGEM_GENERICA, logger

STATUS_BAIXADA = "Baixada"
STATUS_ESTORNADA = "Estornada"


async def _baixas_a_estornar(db: AsyncSession, nf_id: int) -> List[Movimentacao]:
    """
    As baixas ainda não revertidas: as gravadas depois do último estorno.

    Uma nota pode ser baixada, estornada e baixada de novo, então não basta
    pegar todas as movimentações de baixa da nota.
    """
    ultimo_estorno = (
        await db.execute(
            select(func.max(Movimentacao.data_hora)).where(
                Movimentacao.nota_fiscal_id == nf_id,
                Movimentacao.tipo_movimento == "ESTORNO",
            )
        )
    ).scalar_one_or_none()

    stmt = select(Movimentacao).where(
        Movimentacao.nota_fiscal_id == nf_id,
        Movimentacao.tipo_movimento == "BAIXA",
    )
    if ultimo_estorno is not None:
        stmt = stmt.where(Movimentacao.data_hora > ultimo_estorno)

    return list((await db.execute(stmt)).scalars().all())


async def estornar_baixa_nf(
    nf_id: int,
    justificativa: str,
    db: AsyncSession,
    usuario_id: int,
) -> List[Movimentacao]:
    """
    Desfaz a baixa de uma nota: devolve o saldo ao contrato e registra
    uma movimentação de ESTORNO.
    """
    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.id == nf_id)
        .with_for_update()
    )
    nf = (await db.execute(stmt)).scalar_one_or_none()

    if not nf or nf.excluida_em is not None:
        raise HTTPException(status_code=404, detail="Nota Fiscal não encontrada")

    if nf.status != STATUS_BAIXADA:
        raise HTTPException(
            status_code=400,
            detail="Só é possível estornar uma nota que esteja baixada",
        )

    baixas = await _baixas_a_estornar(db, nf.id)
    if not baixas:
        raise HTTPException(
            status_code=400,
            detail="Não há movimentações de baixa a estornar para esta nota",
        )

    estornos: List[Movimentacao] = []

    for baixa in baixas:
        stmt_ic = (
            select(ItemContrato)
            .where(ItemContrato.id == baixa.item_contrato_id)
            .with_for_update()
        )
        item_contrato = (await db.execute(stmt_ic)).scalar_one_or_none()
        if not item_contrato:
            raise HTTPException(
                status_code=404,
                detail=f"Item de contrato ID {baixa.item_contrato_id} não encontrado",
            )

        saldo_anterior = item_contrato.saldo_atual
        saldo_posterior = saldo_anterior + baixa.quantidade
        item_contrato.saldo_atual = saldo_posterior

        estorno = Movimentacao(
            nota_fiscal_id=nf.id,
            item_contrato_id=item_contrato.id,
            tipo_movimento="ESTORNO",
            quantidade=baixa.quantidade,
            saldo_anterior=saldo_anterior,
            saldo_posterior=saldo_posterior,
            usuario_id=usuario_id,
            justificativa=justificativa,
        )
        db.add(estorno)
        estornos.append(estorno)

    nf.status = STATUS_ESTORNADA

    try:
        await db.commit()
        for mov in estornos:
            await db.refresh(mov)
        return estornos
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Falha ao estornar a baixa da NF %s", nf_id)
        raise HTTPException(status_code=400, detail=MENSAGEM_GENERICA) from exc
