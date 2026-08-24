import re
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from ..database.models import Contrato, ItemNotaFiscal, NotaFiscal
from ..http_errors import http_erro_interno
from ..schemas import ItemNotaFiscalCreate, NotaFiscalCreate

STATUS_AGUARDANDO_CONFERENCIA = "Aguardando conferência"


def normalizar_chave_acesso(chave: Optional[str], exigir_44: bool = False) -> Optional[str]:
    if chave is None:
        return None
    digitos = re.sub(r"\D", "", str(chave).strip())
    if not digitos:
        return None
    if exigir_44 and len(digitos) != 44:
        raise ValueError("A chave de acesso deve ter 44 dígitos.")
    return digitos


def validar_itens_nf(itens: Iterable[ItemNotaFiscalCreate], ids_contrato: set[int]) -> None:
    itens = list(itens)
    if not itens:
        raise ValueError("Informe ao menos um item da nota fiscal.")
    for item in itens:
        if not item.item_contrato_id:
            raise ValueError(
                f"Item '{item.descricao}' não possui vínculo com item do contrato."
            )
        if item.item_contrato_id not in ids_contrato:
            raise ValueError(
                f"Item de contrato ID {item.item_contrato_id} não pertence ao contrato selecionado."
            )
        if item.quantidade <= 0:
            raise ValueError(
                f"A quantidade do item '{item.descricao}' deve ser maior que zero."
            )
        if item.valor_unitario < 0:
            raise ValueError(
                f"O valor unitário do item '{item.descricao}' não pode ser negativo."
            )


async def persistir_nota_fiscal(
    db: AsyncSession,
    nf_create: NotaFiscalCreate,
    itens: list[ItemNotaFiscalCreate],
    arquivo_path: Optional[str] = None,
) -> NotaFiscal:
    dados = nf_create.model_dump()

    stmt_contrato = (
        select(Contrato)
        .options(selectinload(Contrato.itens))
        .where(Contrato.id == nf_create.contrato_id)
    )
    result_contrato = await db.execute(stmt_contrato)
    contrato = result_contrato.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    ids_itens_contrato = {item.id for item in contrato.itens}
    try:
        dados["chave_acesso"] = normalizar_chave_acesso(dados.get("chave_acesso"))
        validar_itens_nf(itens, ids_itens_contrato)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if dados.get("valor_total") is None:
        dados["valor_total"] = round(
            sum(item.quantidade * item.valor_unitario for item in itens),
            2,
        )

    if dados["chave_acesso"]:
        existente = await db.execute(
            select(NotaFiscal.id).where(NotaFiscal.chave_acesso == dados["chave_acesso"])
        )
        if existente.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=400,
                detail="Já existe uma nota fiscal com esta chave de acesso.",
            )

    db_nf = NotaFiscal(
        **dados,
        arquivo_pdf_path=arquivo_path,
        status=STATUS_AGUARDANDO_CONFERENCIA,
    )
    db.add(db_nf)
    try:
        await db.commit()
        await db.refresh(db_nf)

        for item in itens:
            dump = item.model_dump()
            if not dump.get("status_identificacao"):
                dump["status_identificacao"] = "MANUAL"
            if dump.get("percentual_confianca") is None:
                dump["percentual_confianca"] = 100
            db.add(ItemNotaFiscal(**dump, nota_fiscal_id=db_nf.id))

        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Já existe uma nota fiscal com esta chave de acesso.",
        ) from exc
    except Exception as exc:
        await db.rollback()
        raise http_erro_interno(exc)

    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.id == db_nf.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()
