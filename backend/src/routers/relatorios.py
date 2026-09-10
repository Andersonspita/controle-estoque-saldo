from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings

from ..database.session import get_db
from ..deps import get_current_active_user
from ..database.models import Contrato
from ..schemas import (
    RelatorioContratoSaldoOut,
    RelatorioEmitenteOut,
    RelatorioSaldoOut,
    RelatorioTotaisOut,
)
from ..services.relatorio_saldo import linha_item, totalizar

router = APIRouter(
    prefix="/api/v1/relatorios",
    tags=["Relatórios"],
    dependencies=[Depends(get_current_active_user)],
)


def _emitente() -> RelatorioEmitenteOut:
    return RelatorioEmitenteOut(
        nome=settings.ORGAO_NOME or settings.PROJECT_NAME,
        estado=settings.ORGAO_ESTADO,
        setor=settings.ORGAO_SETOR,
    )


@router.get("/saldo-contratos", response_model=RelatorioSaldoOut)
async def relatorio_saldo_contratos(
    contrato_id: Optional[int] = Query(
        default=None, description="Restringe o relatório a um único contrato"
    ),
    fornecedor_id: Optional[int] = Query(default=None),
    situacao: Optional[str] = Query(
        default=None, description="Situação do contrato; omitido traz todas"
    ),
    vigencia_inicio: Optional[date] = Query(
        default=None,
        description="Traz contratos cuja vigência começa nesta data ou depois",
    ),
    vigencia_fim: Optional[date] = Query(
        default=None,
        description="Traz contratos cuja vigência termina nesta data ou antes",
    ),
    objeto: Optional[str] = Query(
        default=None,
        description="Busca parcial no objeto do contrato e no objeto da licitação",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Saldo de cada item do contrato aberto em contratado, aditivado, utilizado e saldo."""
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.fornecedor), selectinload(Contrato.itens))
        .order_by(Contrato.ano.desc(), Contrato.numero)
    )
    if contrato_id is not None:
        stmt = stmt.where(Contrato.id == contrato_id)
    if fornecedor_id is not None:
        stmt = stmt.where(Contrato.fornecedor_id == fornecedor_id)
    if situacao:
        stmt = stmt.where(Contrato.situacao == situacao)
    if vigencia_inicio is not None:
        stmt = stmt.where(Contrato.data_inicio >= vigencia_inicio)
    if vigencia_fim is not None:
        stmt = stmt.where(Contrato.data_fim <= vigencia_fim)
    termo_objeto = (objeto or "").strip()
    if termo_objeto:
        curinga = f"%{termo_objeto}%"
        stmt = stmt.where(
            or_(
                Contrato.objeto.ilike(curinga),
                Contrato.objeto_licitacao.ilike(curinga),
            )
        )

    contratos = (await db.execute(stmt)).scalars().all()
    if contrato_id is not None and not contratos:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    saida: List[RelatorioContratoSaldoOut] = []
    for contrato in contratos:
        itens = sorted(contrato.itens, key=lambda item: (item.numero_item or 0, item.id))
        linhas = [linha_item(item) for item in itens]
        fornecedor = contrato.fornecedor

        saida.append(
            RelatorioContratoSaldoOut(
                contrato_id=contrato.id,
                numero=contrato.numero,
                ano=contrato.ano,
                objeto=contrato.objeto or "",
                situacao=contrato.situacao,
                data_inicio=contrato.data_inicio,
                data_fim=contrato.data_fim,
                licitacao_numero=contrato.licitacao_numero,
                modalidade=contrato.modalidade,
                objeto_licitacao=contrato.objeto_licitacao,
                observacao=contrato.observacao,
                fornecedor_id=contrato.fornecedor_id,
                fornecedor_razao_social=getattr(fornecedor, "razao_social", "") or "",
                fornecedor_nome_fantasia=getattr(fornecedor, "nome_fantasia", None),
                fornecedor_cnpj=getattr(fornecedor, "cnpj", None),
                fornecedor_cidade=getattr(fornecedor, "cidade", None),
                fornecedor_estado=getattr(fornecedor, "estado", None),
                fornecedor_telefone=getattr(fornecedor, "telefone", None),
                fornecedor_email=getattr(fornecedor, "email", None),
                itens=linhas,
                totais=RelatorioTotaisOut(**totalizar(linhas)),
            )
        )

    totais_gerais = totalizar([contrato.totais.model_dump() for contrato in saida])

    return RelatorioSaldoOut(
        emitente=_emitente(),
        gerado_em=datetime.now(timezone.utc),
        contratos=saida,
        totais=RelatorioTotaisOut(**totais_gerais),
    )
