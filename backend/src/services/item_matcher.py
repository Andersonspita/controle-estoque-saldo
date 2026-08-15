import re
from difflib import SequenceMatcher
from typing import Any


def _normalize_codigo(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", "", value.upper())


def _normalize_descricao(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.lower().strip())


def _gtin_valido(value: str | None) -> bool:
    gtin = _normalize_codigo(value)
    return bool(gtin) and gtin not in {"SEMGTIN", "SEM GTIN", "0"}


def _score_item(nf_item: dict[str, Any], contrato_item: Any) -> tuple[float, str]:
    nf_codigo = _normalize_codigo(nf_item.get("codigo") or nf_item.get("codigo_produto"))
    ic_codigo = _normalize_codigo(getattr(contrato_item, "codigo", None))

    if nf_codigo and ic_codigo and nf_codigo == ic_codigo:
        return 1.0, "CONFIRMADO"

    nf_gtin = _normalize_codigo(nf_item.get("gtin") or nf_item.get("cEAN"))
    ic_gtin = _normalize_codigo(getattr(contrato_item, "gtin", None))
    if _gtin_valido(nf_gtin) and _gtin_valido(ic_gtin) and nf_gtin == ic_gtin:
        return 1.0, "CONFIRMADO"

    desc_nf = _normalize_descricao(nf_item.get("descricao"))
    desc_ic = _normalize_descricao(getattr(contrato_item, "descricao", None))
    if not desc_nf or not desc_ic:
        return 0.0, "NAO_IDENTIFICADO"

    ratio = SequenceMatcher(None, desc_nf, desc_ic).ratio()

    if ratio >= 0.95:
        return ratio, "CONFIRMADO"
    if ratio >= 0.85:
        return ratio, "PROVAVEL"
    if ratio >= 0.55:
        return ratio, "SUGERIDO"
    return ratio, "NAO_IDENTIFICADO"


MIN_CONFIANCA_VINCULO = 0.55


def vincular_itens_nf_contrato(
    itens_nf: list[dict[str, Any]],
    itens_contrato: list[Any],
) -> list[dict[str, Any]]:
    """
    Para cada item da NF, encontra o item de contrato mais compatível
    com base em código, GTIN e similaridade de descrição.
    """
    vinculos: list[dict[str, Any]] = []

    for indice, nf_item in enumerate(itens_nf):
        melhor_item = None
        melhor_score = 0.0
        melhor_status = "NAO_IDENTIFICADO"

        for contrato_item in itens_contrato:
            score, status = _score_item(nf_item, contrato_item)
            if score > melhor_score:
                melhor_score = score
                melhor_status = status
                melhor_item = contrato_item

        item_contrato_id = None
        item_contrato_codigo = None
        item_contrato_descricao = None

        if melhor_item and melhor_score >= MIN_CONFIANCA_VINCULO:
            item_contrato_id = melhor_item.id
            item_contrato_codigo = melhor_item.codigo
            item_contrato_descricao = melhor_item.descricao

        vinculos.append({
            "indice_nf": indice,
            "codigo_nf": nf_item.get("codigo") or nf_item.get("codigo_produto"),
            "descricao_nf": nf_item.get("descricao", ""),
            "quantidade": nf_item.get("quantidade", 0),
            "unidade": nf_item.get("unidade", ""),
            "valor_unitario": nf_item.get("valor_unitario", 0),
            "item_contrato_id": item_contrato_id,
            "item_contrato_codigo": item_contrato_codigo,
            "item_contrato_descricao": item_contrato_descricao,
            "percentual_confianca": round(melhor_score * 100, 1),
            "status_identificacao": melhor_status if item_contrato_id else "NAO_IDENTIFICADO",
        })

    return vinculos
