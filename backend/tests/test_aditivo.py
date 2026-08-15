from src.services.aditivo import (
    aplicar_aditivo_item,
    fator_aditivo,
    quantidade_com_aditivo,
    valor_total_inicial_itens,
)


class _Item:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def test_fator_aditivo():
    assert fator_aditivo(0) == 1
    assert fator_aditivo(25) == 1.25
    assert fator_aditivo(None) == 1


def test_fator_aditivo_rejeita_negativo():
    try:
        fator_aditivo(-1)
        assert False
    except ValueError as exc:
        assert "negativo" in str(exc).lower()


def test_quantidade_com_aditivo():
    assert quantidade_com_aditivo(100, 25) == 125
    assert quantidade_com_aditivo(10, 0) == 10


def test_aplicar_aditivo_aumenta_saldo_pela_quantidade_extra():
    item = _Item(
        quantidade_inicial=100,
        valor_unitario_inicial=10,
        quantidade_contratada=100,
        valor_unitario=10,
        saldo_atual=40,
    )
    aplicar_aditivo_item(item, 25)
    assert item.quantidade_contratada == 125
    assert item.valor_unitario == 10
    assert item.saldo_atual == 65


def test_aplicar_aditivo_recalcula_a_partir_do_inicial():
    item = _Item(
        quantidade_inicial=100,
        valor_unitario_inicial=10,
        quantidade_contratada=125,
        valor_unitario=10,
        saldo_atual=65,
    )
    aplicar_aditivo_item(item, 10, consumido=60)
    assert item.quantidade_contratada == 110
    assert item.saldo_atual == 50


def test_aplicar_aditivo_bloqueia_abaixo_do_baixado():
    item = _Item(
        quantidade_inicial=100,
        valor_unitario_inicial=10,
        quantidade_contratada=100,
        valor_unitario=10,
        saldo_atual=0,
    )
    try:
        aplicar_aditivo_item(item, 0, consumido=120)
        assert False
    except ValueError as exc:
        assert "baixado" in str(exc).lower()


def test_valor_total_inicial_itens():
    itens = [
        _Item(quantidade_inicial=10, valor_unitario_inicial=2),
        _Item(quantidade_inicial=5, valor_unitario_inicial=4),
    ]
    assert valor_total_inicial_itens(itens) == 40
