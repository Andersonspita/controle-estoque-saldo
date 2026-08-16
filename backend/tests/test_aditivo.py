from src.services.aditivo import aplicar_aditivo_item, validar_quantidade_aditivo


class _Item:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def test_quantidade_aditivo_deve_ser_positiva():
    try:
        validar_quantidade_aditivo(0, "UN")
        assert False
    except ValueError as exc:
        assert "maior que zero" in str(exc).lower()


def test_quantidade_aditivo_em_un_nao_aceita_fracao():
    try:
        validar_quantidade_aditivo(21.5, "UN")
        assert False
    except ValueError as exc:
        assert "inteira" in str(exc).lower()


def test_quantidade_aditivo_em_kg_aceita_decimal():
    assert validar_quantidade_aditivo(2.5, "KG") == 2.5


def test_aplicar_aditivo_soma_quantidade_e_saldo():
    item = _Item(
        unidade="UN",
        quantidade_contratada=100,
        valor_unitario=10,
        saldo_atual=40,
    )
    aplicar_aditivo_item(item, 8, 10)
    assert item.quantidade_contratada == 108
    assert item.saldo_atual == 48
    assert item.valor_unitario == 10


def test_aplicar_aditivo_pode_atualizar_valor_unitario():
    item = _Item(
        unidade="UN",
        quantidade_contratada=20,
        valor_unitario=5,
        saldo_atual=20,
    )
    aplicar_aditivo_item(item, 4, 6.5)
    assert item.quantidade_contratada == 24
    assert item.valor_unitario == 6.5
    assert item.saldo_atual == 24
