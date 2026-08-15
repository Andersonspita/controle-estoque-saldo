from types import SimpleNamespace

from src.services.item_matcher import vincular_itens_nf_contrato


def _item_contrato(id: int, codigo: str | None, descricao: str, gtin: str | None = None):
    return SimpleNamespace(id=id, codigo=codigo, descricao=descricao, gtin=gtin)


ITENS_CONTRATO = [
    _item_contrato(1, "MON-001", "Monitor 24 Polegadas Full HD"),
    _item_contrato(2, "TEC-100", "Teclado USB ABNT2"),
    _item_contrato(3, "MOU-200", "Mouse óptico sem fio"),
]


def test_vinculo_por_codigo_exato():
    itens_nf = [{"codigo_produto": "MON-001", "descricao": "Monitor qualquer", "quantidade": 2, "unidade": "UN", "valor_unitario": 1000}]
    vinculos = vincular_itens_nf_contrato(itens_nf, ITENS_CONTRATO)

    assert vinculos[0]["item_contrato_id"] == 1
    assert vinculos[0]["status_identificacao"] == "CONFIRMADO"
    assert vinculos[0]["percentual_confianca"] == 100.0


def test_vinculo_por_gtin():
    itens_nf = [{"gtin": "7891234567890", "descricao": "Produto X", "quantidade": 1, "unidade": "UN", "valor_unitario": 50}]
    itens = [_item_contrato(10, "X-1", "Produto X", gtin="7891234567890")]
    vinculos = vincular_itens_nf_contrato(itens_nf, itens)

    assert vinculos[0]["item_contrato_id"] == 10
    assert vinculos[0]["status_identificacao"] == "CONFIRMADO"


def test_vinculo_por_descricao_similar():
    itens_nf = [{"descricao": "Monitor 24 Polegadas Full HD", "quantidade": 1, "unidade": "UN", "valor_unitario": 900}]
    vinculos = vincular_itens_nf_contrato(itens_nf, ITENS_CONTRATO)

    assert vinculos[0]["item_contrato_id"] == 1
    assert vinculos[0]["status_identificacao"] == "CONFIRMADO"


def test_item_nao_identificado():
    itens_nf = [{"descricao": "Cadeira ergonômica premium", "quantidade": 1, "unidade": "UN", "valor_unitario": 500}]
    vinculos = vincular_itens_nf_contrato(itens_nf, ITENS_CONTRATO)

    assert vinculos[0]["item_contrato_id"] is None
    assert vinculos[0]["status_identificacao"] == "NAO_IDENTIFICADO"


def test_multiplos_itens_nf():
    itens_nf = [
        {"codigo_produto": "TEC-100", "descricao": "Teclado", "quantidade": 5, "unidade": "UN", "valor_unitario": 80},
        {"codigo_produto": "MOU-200", "descricao": "Mouse", "quantidade": 5, "unidade": "UN", "valor_unitario": 60},
    ]
    vinculos = vincular_itens_nf_contrato(itens_nf, ITENS_CONTRATO)

    assert vinculos[0]["item_contrato_id"] == 2
    assert vinculos[1]["item_contrato_id"] == 3
