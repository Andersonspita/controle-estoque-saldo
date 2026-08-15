def fator_aditivo(percentual: float | None) -> float:
    percentual = float(percentual or 0)
    if percentual < 0:
        raise ValueError("O percentual de aditivo não pode ser negativo")
    return 1 + percentual / 100.0


def quantidade_com_aditivo(quantidade_inicial: float, percentual: float | None) -> float:
    return round(float(quantidade_inicial or 0) * fator_aditivo(percentual), 6)


def valor_total_inicial_itens(itens) -> float:
    return round(
        sum(
            float(getattr(item, "quantidade_inicial", 0) or 0)
            * float(getattr(item, "valor_unitario_inicial", 0) or 0)
            for item in itens
        ),
        2,
    )


def aplicar_aditivo_item(item, percentual: float | None, *, consumido: float | None = None) -> None:
    percentual = float(percentual or 0)
    qtd_inicial = float(item.quantidade_inicial or 0)
    vu_inicial = float(item.valor_unitario_inicial or 0)
    if consumido is None:
        consumido = float(item.quantidade_contratada or 0) - float(item.saldo_atual or 0)
    nova_quantidade = quantidade_com_aditivo(qtd_inicial, percentual)
    if nova_quantidade + 1e-9 < consumido:
        raise ValueError(
            f"O aditivo de {percentual:g}% deixaria a quantidade do item abaixo do já baixado ({consumido:g})"
        )
    item.quantidade_contratada = nova_quantidade
    item.valor_unitario = vu_inicial
    item.saldo_atual = round(nova_quantidade - consumido, 6)
