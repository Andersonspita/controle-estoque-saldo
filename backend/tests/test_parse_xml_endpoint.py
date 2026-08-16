from pathlib import Path

import pytest
from httpx import AsyncClient

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_parse_xml_endpoint(async_client: AsyncClient):
    xml_bytes = (FIXTURES_DIR / "sample_nfe.xml").read_bytes()

    response = await async_client.post(
        "/api/v1/notas-fiscais/parse-xml",
        files={"arquivo_xml": ("sample_nfe.xml", xml_bytes, "application/xml")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["numero"] == "12345"
    assert data["chave_acesso"] == "35201214234567890123456789012345678901234"
    assert len(data["itens"]) == 1


@pytest.mark.asyncio
async def test_parse_xml_endpoint_arquivo_invalido(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/notas-fiscais/parse-xml",
        files={"arquivo_xml": ("invalido.xml", b"<root/>", "application/xml")},
    )

    assert response.status_code == 400
    assert "Não foi possível ler o XML" in response.json()["detail"]
