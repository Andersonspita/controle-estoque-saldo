from datetime import date

import pytest
from pydantic import ValidationError

from src.schemas import ContratoCreate, ItemContratoCreate
from src.services.unidades_medida import quantidade_inteira, normalizar_unidade


def test_ano_vem_da_vigencia_inicial():
    contrato = ContratoCreate(
        fornecedor_id=1,
        numero="015",
        objeto="Aquisição de material de expediente",
        data_inicio=date(2026, 3, 10),
        data_fim=date(2027, 3, 9),
        valor_total=1,
        situacao="Ativo",
        itens=[],
    )
    assert contrato.ano == 2026
    assert "expediente" in contrato.objeto


def test_rejeita_vigencia_final_antes_da_inicial():
    try:
        ContratoCreate(
            fornecedor_id=1,
            numero="015",
            objeto="Objeto do contrato",
            data_inicio=date(2026, 12, 1),
            data_fim=date(2026, 1, 1),
            valor_total=1,
            situacao="Ativo",
        )
        assert False
    except ValidationError as exc:
        assert "vigência" in str(exc).lower() or "posterior" in str(exc).lower()


def test_unidade_do_item_usa_lookup_de_sigla():
    item = ItemContratoCreate(
        descricao="Água sanitária",
        unidade="litro",
        quantidade_contratada=10,
        valor_unitario=2.5,
    )
    assert item.unidade == "L"


def test_unidade_invalida_e_rejeitada():
    try:
        ItemContratoCreate(
            descricao="Item",
            unidade="XYZ",
            quantidade_contratada=1,
            valor_unitario=1,
        )
        assert False
    except ValidationError:
        pass


def test_normalizar_aliases_comuns():
    assert normalizar_unidade("unid") == "UN"
    assert normalizar_unidade("kg") == "KG"
    assert normalizar_unidade("m²") == "M2"


def test_quantidade_inteira_nas_unidades_discretas():
    assert quantidade_inteira("UN") is True
    assert quantidade_inteira("CX") is True
    assert quantidade_inteira("KG") is False
    assert quantidade_inteira("L") is False


def test_contrato_aceita_dados_da_licitacao_e_observacao():
    contrato = ContratoCreate(
        fornecedor_id=1,
        numero="015",
        objeto="Aquisição de material de expediente",
        licitacao_numero="012/2026",
        modalidade="pregao eletronico",
        objeto_licitacao="Registro de preços de material de expediente",
        observacao="Ata vigente até 2027",
        data_inicio=date(2026, 3, 10),
        data_fim=date(2027, 3, 9),
        valor_total=1,
        situacao="Ativo",
    )
    assert contrato.modalidade == "Pregão eletrônico"
    assert contrato.licitacao_numero == "012/2026"
    assert contrato.objeto_licitacao.startswith("Registro")
    assert contrato.observacao == "Ata vigente até 2027"


def test_modalidade_invalida_e_rejeitada():
    try:
        ContratoCreate(
            fornecedor_id=1,
            numero="015",
            objeto="Objeto do contrato",
            modalidade="Modalidade inventada",
            data_inicio=date(2026, 1, 1),
            data_fim=date(2026, 12, 31),
            valor_total=1,
            situacao="Ativo",
        )
        assert False
    except ValidationError:
        pass


@pytest.mark.asyncio
async def test_lista_unidades_medida(async_client):
    response = await async_client.get("/api/v1/unidades-medida/")
    assert response.status_code == 200
    siglas = {item["sigla"] for item in response.json()}
    assert {"UN", "KG", "L", "M", "CX"} <= siglas


@pytest.mark.asyncio
async def test_lista_modalidades_licitacao(async_client):
    response = await async_client.get("/api/v1/modalidades-licitacao/")
    assert response.status_code == 200
    nomes = set(response.json())
    assert "Pregão eletrônico" in nomes
    assert "Dispensa de licitação" in nomes
