import math

from .unidades_medida import arredondar_quantidade

TIPOS_ADITIVO = {
    "PRAZO": "Prazo",
    "VALOR": "Valor (acréscimo)",
    "VALOR_PRAZO": "Valor e prazo",
    "REEQUILIBRIO": "Reequilíbrio econômico-financeiro",
}
TIPOS_COM_PRAZO = {"PRAZO", "VALOR_PRAZO"}
TIPOS_COM_QUANTIDADE = {"VALOR", "VALOR_PRAZO"}


def quantidade_por_percentual(item, percentual: float) -> float:
    """Acréscimo sobre a quantidade inicial do item (base do limite legal do aditivo)."""
    base = float(getattr(item, "quantidade_inicial", None) or item.quantidade_contratada or 0)
    # Trunca na 3ª casa: o acréscimo nunca passa do percentual aprovado.
    return math.floor(base * float(percentual) * 10 + 1e-6) / 1000


def aplicar_percentual_quantidade(item, percentual: float) -> float:
    extra = quantidade_por_percentual(item, percentual)
    item.quantidade_contratada = arredondar_quantidade(float(item.quantidade_contratada or 0) + extra)
    item.saldo_atual = arredondar_quantidade(float(item.saldo_atual or 0) + extra)
    return extra


def aplicar_reequilibrio(item, percentual: float) -> float:
    novo = round(float(item.valor_unitario or 0) * (1 + float(percentual) / 100), 2)
    item.valor_unitario = novo
    return novo


def valor_total_inicial_itens(itens) -> float:
    return round(
        sum(
            float(getattr(item, "quantidade_inicial", 0) or 0)
            * float(getattr(item, "valor_unitario_inicial", 0) or 0)
            for item in itens
        ),
        2,
    )


def valor_total_itens(itens) -> float:
    return round(
        sum(
            float(getattr(item, "quantidade_contratada", 0) or 0)
            * float(getattr(item, "valor_unitario", 0) or 0)
            for item in itens
        ),
        2,
    )
