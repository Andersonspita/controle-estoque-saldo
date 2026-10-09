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


def _similaridade(a: str | None, b: str | None) -> float:
    desc_a = _normalize_descricao(a)
    desc_b = _normalize_descricao(b)
    if not desc_a or not desc_b:
        return 0.0
    return SequenceMatcher(None, desc_a, desc_b).ratio()


def _status_por_score(score: float) -> str:
    if score >= 0.95:
        return "CONFIRMADO"
    if score >= 0.85:
        return "PROVAVEL"
    if score >= 0.55:
        return "SUGERIDO"
    return "NAO_IDENTIFICADO"


def _score_fornecedor(nf_item: dict[str, Any], contrato_item: Any) -> tuple[float, str]:
    """
    Critérios ligados ao que o fornecedor escreve na NF: código, GTIN
    e a descrição do fornecedor cadastrada no item do contrato.
    """
    nf_codigo = _normalize_codigo(nf_item.get("codigo") or nf_item.get("codigo_produto"))
    ic_codigo = _normalize_codigo(getattr(contrato_item, "codigo", None))
    if nf_codigo and ic_codigo and nf_codigo == ic_codigo:
        return 1.0, "codigo"

    nf_gtin = _normalize_codigo(nf_item.get("gtin") or nf_item.get("cEAN"))
    ic_gtin = _normalize_codigo(getattr(contrato_item, "gtin", None))
    if _gtin_valido(nf_gtin) and _gtin_valido(ic_gtin) and nf_gtin == ic_gtin:
        return 1.0, "gtin"

    ratio = _similaridade(
        nf_item.get("descricao"),
        getattr(contrato_item, "descricao_fornecedor", None),
    )
    return ratio, "descricao_fornecedor"


def _score_contrato(nf_item: dict[str, Any], contrato_item: Any) -> tuple[float, str]:
    ratio = _similaridade(nf_item.get("descricao"), getattr(contrato_item, "descricao", None))
    return ratio, "descricao_contrato"


def _melhor(
    nf_item: dict[str, Any],
    itens_contrato: list[Any],
    pontuar,
) -> tuple[Any, float, str | None]:
    melhor_item = None
    melhor_score = 0.0
    melhor_criterio: str | None = None
    for contrato_item in itens_contrato:
        score, criterio = pontuar(nf_item, contrato_item)
        if score > melhor_score:
            melhor_item, melhor_score, melhor_criterio = contrato_item, score, criterio
    return melhor_item, melhor_score, melhor_criterio


def _score_combinado(nf_item: dict[str, Any], contrato_item: Any) -> tuple[float, str]:
    fornecedor = _score_fornecedor(nf_item, contrato_item)
    contrato = _score_contrato(nf_item, contrato_item)
    return fornecedor if fornecedor[0] >= contrato[0] else contrato


MIN_CONFIANCA_VINCULO = 0.55
# A partir deste score a descrição do fornecedor é aceita sem consultar a do contrato
MIN_CONFIANCA_FORNECEDOR = 0.85


def vincular_itens_nf_contrato(
    itens_nf: list[dict[str, Any]],
    itens_contrato: list[Any],
) -> list[dict[str, Any]]:
    """
    Para cada item da NF, encontra o item de contrato mais compatível.

    Ordem de validação:
    1. Código, GTIN e descrição do fornecedor (como ele escreve na NF);
    2. Se nada disso for ao menos "provável", compara também com a
       descrição do contrato e fica com o melhor resultado.
    """
    vinculos: list[dict[str, Any]] = []

    for indice, nf_item in enumerate(itens_nf):
        melhor_item, melhor_score, criterio = _melhor(nf_item, itens_contrato, _score_fornecedor)
        if melhor_score < MIN_CONFIANCA_FORNECEDOR:
            melhor_item, melhor_score, criterio = _melhor(nf_item, itens_contrato, _score_combinado)

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
            "status_identificacao": (
                _status_por_score(melhor_score) if item_contrato_id else "NAO_IDENTIFICADO"
            ),
            "criterio_identificacao": criterio if item_contrato_id else None,
        })

    return vinculos
