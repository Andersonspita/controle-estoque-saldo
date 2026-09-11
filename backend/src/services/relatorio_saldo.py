"""Cálculo do Relatório de Saldo de Contrato.

Cada item é aberto em quatro grupos — Contratado (o que foi assinado),
Aditivado, Utilizado e Saldo — de modo que ``Contratado + Aditivado`` sempre
fecha com ``Utilizado + Saldo``. O aditivo pode alterar quantidade e preço
unitário, então o valor aditivado é a diferença entre o total vigente e o
total original, e não apenas a quantidade extra vezes o preço novo.
"""

from __future__ import annotations


def _num(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


def _dinheiro(valor: float) -> float:
    return round(valor, 2)


def _percentual(parte: float, total: float) -> float:
    if total <= 0:
        return 0.0
    return round(min(100.0, max(0.0, parte / total * 100)), 2)


def linha_item(item) -> dict:
    """Abre um ``ItemContrato`` nas colunas do relatório."""
    valor_unitario = _num(getattr(item, "valor_unitario", 0))
    valor_unitario_inicial = _num(getattr(item, "valor_unitario_inicial", 0)) or valor_unitario

    quantidade_vigente = _num(getattr(item, "quantidade_contratada", 0))
    quantidade_inicial = getattr(item, "quantidade_inicial", None)
    quantidade_inicial = quantidade_vigente if quantidade_inicial is None else _num(quantidade_inicial)
    quantidade_aditivada = max(0.0, quantidade_vigente - quantidade_inicial)

    saldo = max(0.0, _num(getattr(item, "saldo_atual", 0)))
    quantidade_utilizada = max(0.0, quantidade_vigente - saldo)

    valor_inicial = _dinheiro(quantidade_inicial * valor_unitario_inicial)
    valor_vigente = _dinheiro(quantidade_vigente * valor_unitario)

    return {
        "item_id": getattr(item, "id", 0),
        "numero_item": getattr(item, "numero_item", 0) or 0,
        "codigo": getattr(item, "codigo", None),
        "descricao": getattr(item, "descricao", ""),
        "marca": getattr(item, "marca", None),
        "observacao": getattr(item, "observacao", None),
        "unidade": getattr(item, "unidade", "UN"),
        "valor_unitario": valor_unitario,
        "valor_unitario_inicial": valor_unitario_inicial,
        "quantidade_contratada": quantidade_inicial,
        "valor_contratado": valor_inicial,
        "quantidade_aditivada": quantidade_aditivada,
        "valor_aditivado": _dinheiro(valor_vigente - valor_inicial),
        "quantidade_vigente": quantidade_vigente,
        "valor_vigente": valor_vigente,
        "quantidade_utilizada": quantidade_utilizada,
        "valor_utilizado": _dinheiro(quantidade_utilizada * valor_unitario),
        "quantidade_saldo": saldo,
        "valor_saldo": _dinheiro(saldo * valor_unitario),
        "percentual_utilizado": _percentual(quantidade_utilizada, quantidade_vigente),
    }


CAMPOS_SOMADOS = (
    "quantidade_contratada",
    "valor_contratado",
    "quantidade_aditivada",
    "valor_aditivado",
    "quantidade_vigente",
    "valor_vigente",
    "quantidade_utilizada",
    "valor_utilizado",
    "quantidade_saldo",
    "valor_saldo",
)


def totalizar(linhas) -> dict:
    """Soma as colunas numéricas das linhas — de itens ou de contratos."""
    totais = {campo: 0.0 for campo in CAMPOS_SOMADOS}
    for linha in linhas:
        for campo in CAMPOS_SOMADOS:
            totais[campo] += _num(linha.get(campo))
    for campo in CAMPOS_SOMADOS:
        totais[campo] = _dinheiro(totais[campo])
    totais["percentual_utilizado"] = _percentual(
        totais["valor_utilizado"], totais["valor_vigente"]
    )
    return totais
