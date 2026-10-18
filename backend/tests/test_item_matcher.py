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


def _item_com_fornecedor(id: int, descricao: str, descricao_fornecedor: str | None):
    return SimpleNamespace(
        id=id, codigo=None, gtin=None, descricao=descricao, descricao_fornecedor=descricao_fornecedor
    )


def test_vinculo_pela_descricao_do_fornecedor():
    itens = [
        _item_com_fornecedor(1, "Papel sulfite A4 75g resma 500 folhas", "PAPEL CHAMEX A4 75G C/500"),
        _item_com_fornecedor(2, "Caneta esferográfica azul", "CANETA BIC CRISTAL AZUL"),
    ]
    itens_nf = [{"descricao": "PAPEL CHAMEX A4 75G C/500", "quantidade": 10, "unidade": "RS", "valor_unitario": 25}]
    vinculos = vincular_itens_nf_contrato(itens_nf, itens)

    assert vinculos[0]["item_contrato_id"] == 1
    assert vinculos[0]["status_identificacao"] == "CONFIRMADO"
    assert vinculos[0]["criterio_identificacao"] == "descricao_fornecedor"


def test_descricao_do_fornecedor_tem_prioridade_sobre_a_do_contrato():
    # A descrição da NF é idêntica à do contrato do item 2, mas bate
    # com a descrição do fornecedor do item 1, que deve prevalecer.
    itens = [
        _item_com_fornecedor(1, "Detergente neutro 500ml", "LIMPADOR MULTIUSO 500ML"),
        _item_com_fornecedor(2, "Limpador multiuso 500ml", None),
    ]
    itens_nf = [{"descricao": "LIMPADOR MULTIUSO 500ML", "quantidade": 1, "unidade": "UN", "valor_unitario": 5}]
    vinculos = vincular_itens_nf_contrato(itens_nf, itens)

    assert vinculos[0]["item_contrato_id"] == 1
    assert vinculos[0]["criterio_identificacao"] == "descricao_fornecedor"


def test_recorre_a_descricao_do_contrato_quando_fornecedor_nao_bate():
    itens = [
        _item_com_fornecedor(1, "Monitor 24 Polegadas Full HD", "MONITOR LG 24MK430H"),
        _item_com_fornecedor(2, "Teclado USB ABNT2", None),
    ]
    itens_nf = [{"descricao": "Teclado USB ABNT2", "quantidade": 1, "unidade": "UN", "valor_unitario": 80}]
    vinculos = vincular_itens_nf_contrato(itens_nf, itens)

    assert vinculos[0]["item_contrato_id"] == 2
    assert vinculos[0]["criterio_identificacao"] == "descricao_contrato"


def test_vinculo_por_codigo_informa_criterio():
    itens_nf = [{"codigo_produto": "MON-001", "descricao": "Monitor qualquer", "quantidade": 2, "unidade": "UN", "valor_unitario": 1000}]
    vinculos = vincular_itens_nf_contrato(itens_nf, ITENS_CONTRATO)

    assert vinculos[0]["criterio_identificacao"] == "codigo"
