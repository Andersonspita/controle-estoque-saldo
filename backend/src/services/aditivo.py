from .unidades_medida import quantidade_inteira as unidade_quantidade_inteira


def quantidade_inteira(unidade: str | None) -> bool:
    return unidade_quantidade_inteira(unidade)


def validar_quantidade_aditivo(quantidade: float, unidade: str | None = "UN") -> float:
    extra = float(quantidade or 0)
    if extra <= 0:
        raise ValueError("A quantidade do aditivo deve ser maior que zero")
    if quantidade_inteira(unidade):
        if abs(extra - round(extra)) > 1e-9:
            raise ValueError("Em unidade, a quantidade do aditivo deve ser inteira")
        return float(int(round(extra)))
    return extra


def aplicar_aditivo_item(item, quantidade_aditivada: float, valor_unitario: float | None = None) -> None:
    extra = validar_quantidade_aditivo(quantidade_aditivada, getattr(item, "unidade", "UN"))
    item.quantidade_contratada = float(item.quantidade_contratada or 0) + extra
    item.saldo_atual = float(item.saldo_atual or 0) + extra
    if valor_unitario is not None:
        if float(valor_unitario) < 0:
            raise ValueError("O valor unitário do aditivo não pode ser negativo")
        item.valor_unitario = float(valor_unitario)


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
