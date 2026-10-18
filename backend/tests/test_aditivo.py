import pytest
from pydantic import ValidationError

from src.schemas import ContratoAditivoIn
from src.services.aditivo import (
    aplicar_percentual_quantidade,
    aplicar_reequilibrio,
    quantidade_por_percentual,
)


class _Item:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _item(**kwargs):
    base = dict(unidade="UN", quantidade_inicial=100, quantidade_contratada=100, valor_unitario=10, saldo_atual=40)
    return _Item(**{**base, **kwargs})


def test_percentual_soma_quantidade_e_saldo():
    item = _item()
    assert aplicar_percentual_quantidade(item, 25) == 25
    assert item.quantidade_contratada == 125
    assert item.saldo_atual == 65
    assert item.valor_unitario == 10


def test_percentual_usa_quantidade_inicial_mesmo_apos_outro_aditivo():
    item = _item(quantidade_contratada=110)
    assert aplicar_percentual_quantidade(item, 10) == 10
    assert item.quantidade_contratada == 120


def test_percentual_em_un_arredonda_para_baixo():
    assert quantidade_por_percentual(_item(quantidade_inicial=10), 25) == 2


def test_percentual_em_kg_aceita_decimal():
    assert quantidade_por_percentual(_item(unidade="KG", quantidade_inicial=10), 25) == 2.5


def test_reequilibrio_altera_so_valor_unitario():
    item = _item(valor_unitario=8.5)
    assert aplicar_reequilibrio(item, 10) == 9.35
    assert item.quantidade_contratada == 100


def test_reequilibrio_negativo_reduz_valor():
    item = _item()
    aplicar_reequilibrio(item, -5)
    assert item.valor_unitario == 9.5


def test_prazo_exige_vigencia():
    with pytest.raises(ValidationError, match="vigência"):
        ContratoAditivoIn(numero="1", tipo="PRAZO")


def test_valor_exige_percentual_e_ignora_datas():
    with pytest.raises(ValidationError, match="percentual"):
        ContratoAditivoIn(numero="1", tipo="VALOR")
    body = ContratoAditivoIn(numero=" 2 ", tipo="VALOR", percentual=10, data_inicio="2026-01-01", data_fim="2026-12-31")
    assert body.numero == "2" and body.data_fim is None


def test_prazo_descarta_percentual():
    body = ContratoAditivoIn(numero="1", tipo="PRAZO", percentual=10, data_inicio="2026-10-01", data_fim="2027-09-30")
    assert body.percentual is None


def test_reequilibrio_nao_aceita_zero():
    with pytest.raises(ValidationError):
        ContratoAditivoIn(numero="1", tipo="REEQUILIBRIO", percentual=0)
