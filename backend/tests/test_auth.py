from pathlib import Path

import pytest
from httpx import AsyncClient

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.no_auth_override
@pytest.mark.asyncio
async def test_atualizar_vinculos_sem_token(async_client: AsyncClient):
    response = await async_client.patch(
        "/api/v1/notas-fiscais/1/vinculos",
        json={"itens": [{"id": 1, "item_contrato_id": 1}]},
    )
    assert response.status_code == 401


@pytest.mark.no_auth_override
@pytest.mark.asyncio
async def test_rota_protegida_sem_token(async_client: AsyncClient):
    response = await async_client.get("/api/v1/contratos/")
    assert response.status_code == 401


@pytest.mark.no_auth_override
@pytest.mark.asyncio
async def test_parse_xml_sem_token(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/notas-fiscais/parse-xml",
        files={"arquivo_xml": ("invalido.xml", b"<root/>", "application/xml")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_health_continua_publico(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_users_me_retorna_perfil_admin(async_client: AsyncClient):
    response = await async_client.get("/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["perfil"] == "ADMIN"
    assert data["is_superuser"] is True


@pytest.mark.asyncio
async def test_users_me_retorna_perfil_operador(async_client: AsyncClient, as_operador):
    response = await async_client.get("/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["perfil"] == "OPERADOR"
    assert data["is_superuser"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url,payload",
    [
        (
            "/api/v1/contratos/",
            {
                "fornecedor_id": 1,
                "numero": "1",
                "ano": 2026,
                "valor_total": 1,
                "situacao": "Ativo",
                "itens": [],
            },
        ),
        (
            "/api/v1/fornecedores/",
            {"razao_social": "Fornecedor Teste", "cnpj": "00000000000000"},
        ),
        (
            "/api/v1/almoxarifados/",
            {"nome": "Almoxarifado Central"},
        ),
        (
            "/api/v1/licitacoes/",
            {
                "numero": "1",
                "ano": 2026,
                "modalidade": "Pregão",
                "objeto": "Material",
                "situacao": "Aberta",
            },
        ),
    ],
)
async def test_operador_nao_cria_cadastros(async_client: AsyncClient, as_operador, url, payload):
    response = await async_client.post(url, json=payload)
    assert response.status_code == 403
    assert "administradores" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_operador_nao_lista_usuarios(async_client: AsyncClient, as_operador):
    response = await async_client.get("/users/")
    assert response.status_code == 403
    assert "administradores" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_operador_nao_cria_usuario(async_client: AsyncClient, as_operador):
    response = await async_client.post(
        "/users/",
        json={
            "email": "novo@example.com",
            "password": "senha1234",
            "full_name": "Novo Operador",
            "perfil": "OPERADOR",
        },
    )
    assert response.status_code == 403
    assert "administradores" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_operador_pode_parsear_xml(async_client: AsyncClient, as_operador):
    xml_bytes = (FIXTURES_DIR / "sample_nfe.xml").read_bytes()
    response = await async_client.post(
        "/api/v1/notas-fiscais/parse-xml",
        files={"arquivo_xml": ("sample_nfe.xml", xml_bytes, "application/xml")},
    )
    assert response.status_code == 200
    assert response.json()["numero"] == "12345"
