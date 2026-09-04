from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from src.deps import tem_permissao_estorno


def _usuario(perfil: str, pode_estornar: bool = False):
    return SimpleNamespace(perfil=perfil, pode_estornar=pode_estornar)


def test_admin_sempre_pode_estornar():
    assert tem_permissao_estorno(_usuario("ADMIN")) is True


def test_operador_sem_liberacao_nao_pode():
    assert tem_permissao_estorno(_usuario("OPERADOR")) is False


def test_operador_liberado_pode():
    assert tem_permissao_estorno(_usuario("OPERADOR", pode_estornar=True)) is True


def test_perfil_com_espaco_e_caixa_baixa_conta_como_admin():
    assert tem_permissao_estorno(_usuario(" admin ")) is True


def test_usuario_sem_o_campo_nao_quebra():
    """Sessões antigas podem não trazer o campo novo."""
    assert tem_permissao_estorno(SimpleNamespace(perfil="OPERADOR")) is False


@pytest.mark.asyncio
async def test_estorno_negado_para_operador_sem_permissao(
    async_client: AsyncClient, as_operador
):
    response = await async_client.post(
        "/api/v1/notas-fiscais/1/estornar",
        json={"justificativa": "lancada no contrato errado"},
    )
    assert response.status_code == 403
    assert "permissão" in response.json()["detail"]


@pytest.mark.asyncio
async def test_exclusao_negada_para_operador_sem_permissao(
    async_client: AsyncClient, as_operador
):
    response = await async_client.request(
        "DELETE",
        "/api/v1/notas-fiscais/1",
        json={"motivo": "nota duplicada"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_estorno_exige_justificativa(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/notas-fiscais/1/estornar", json={"justificativa": "abc"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_exclusao_exige_motivo(async_client: AsyncClient):
    response = await async_client.request(
        "DELETE", "/api/v1/notas-fiscais/1", json={"motivo": ""}
    )
    assert response.status_code == 422
