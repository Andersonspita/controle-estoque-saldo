import pytest
from httpx import AsyncClient


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
