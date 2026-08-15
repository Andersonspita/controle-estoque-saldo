from pathlib import Path

import pytest
from httpx import AsyncClient

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_parse_pdf_danfe_real(async_client: AsyncClient):
    pdf_bytes = (FIXTURES_DIR / "sample_danfe.pdf").read_bytes()

    response = await async_client.post(
        "/api/v1/notas-fiscais/parse-pdf",
        files={"arquivo_pdf": ("sample_danfe.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["numero"] == "69"
    assert data["chave_acesso"] == "29260832183420000147550010000000691333202248"
    assert data["valor_total"] == 26001.0
    assert len(data["itens"]) == 13
    assert data["origem"] == "ocr"
