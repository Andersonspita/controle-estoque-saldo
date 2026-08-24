import pytest
from httpx import AsyncClient

from src.schemas import ItemNotaFiscalCreate, NotaFiscalManualCreate
from src.services.nota_fiscal import normalizar_chave_acesso, validar_itens_nf


def test_chave_vazia_vira_none():
    assert normalizar_chave_acesso(None) is None
    assert normalizar_chave_acesso("") is None
    assert normalizar_chave_acesso("   ") is None


def test_chave_44_digitos_ok():
    chave = "1" * 44
    assert normalizar_chave_acesso(chave) == chave


def test_chave_com_mascara_mantem_digitos():
    assert normalizar_chave_acesso("1234 5678") == "12345678"


def test_exigir_44_rejeita_tamanho_errado():
    try:
        normalizar_chave_acesso("123", exigir_44=True)
        assert False
    except ValueError as exc:
        assert "44" in str(exc)


def test_validar_itens_exige_vinculo():
    item = ItemNotaFiscalCreate(
        descricao="Papel",
        quantidade=1,
        unidade="UN",
        valor_unitario=10,
        item_contrato_id=None,
    )
    try:
        validar_itens_nf([item], {1})
        assert False
    except ValueError as exc:
        assert "vínculo" in str(exc).lower()


def test_validar_itens_rejeita_item_de_outro_contrato():
    item = ItemNotaFiscalCreate(
        descricao="Papel",
        quantidade=1,
        unidade="UN",
        valor_unitario=10,
        item_contrato_id=99,
    )
    try:
        validar_itens_nf([item], {1, 2})
        assert False
    except ValueError as exc:
        assert "não pertence" in str(exc)


def test_schema_manual_exige_item():
    try:
        NotaFiscalManualCreate(
            contrato_id=1,
            fornecedor_id=1,
            numero="100",
            itens=[],
        )
        assert False
    except Exception:
        pass


def test_schema_manual_chave_invalida():
    try:
        NotaFiscalManualCreate(
            contrato_id=1,
            fornecedor_id=1,
            numero="100",
            chave_acesso="123",
            itens=[
                {
                    "descricao": "Item",
                    "quantidade": 1,
                    "unidade": "UN",
                    "valor_unitario": 1,
                    "item_contrato_id": 1,
                }
            ],
        )
        assert False
    except Exception as exc:
        assert "44" in str(exc)


@pytest.mark.asyncio
async def test_criar_manual_payload_invalido(async_client: AsyncClient):
    response = await async_client.post("/api/v1/notas-fiscais/", json={})
    assert response.status_code == 422


@pytest.mark.no_auth_override
@pytest.mark.asyncio
async def test_criar_manual_sem_token(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/notas-fiscais/",
        json={
            "contrato_id": 1,
            "fornecedor_id": 1,
            "numero": "1",
            "itens": [
                {
                    "descricao": "Item",
                    "quantidade": 1,
                    "unidade": "UN",
                    "valor_unitario": 1,
                    "item_contrato_id": 1,
                }
            ],
        },
    )
    assert response.status_code == 401
