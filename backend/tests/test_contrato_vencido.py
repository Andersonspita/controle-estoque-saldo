from datetime import date, datetime
from types import SimpleNamespace

import pymupdf
import pytest
from httpx import AsyncClient

from src.services.baixa_service import contrato_vencido
from src.services.termo_responsabilidade import gerar_termo_contrato_vencido

HOJE = date(2026, 10, 18)


def test_contrato_vencido_ontem():
    assert contrato_vencido(SimpleNamespace(data_fim=date(2026, 10, 17)), HOJE) is True


def test_contrato_vence_hoje_ainda_vigente():
    assert contrato_vencido(SimpleNamespace(data_fim=HOJE), HOJE) is False


def test_contrato_sem_data_fim_nao_vence():
    assert contrato_vencido(SimpleNamespace(data_fim=None), HOJE) is False
    assert contrato_vencido(None, HOJE) is False


def test_termo_pdf_traz_motivo_e_assinaturas():
    pdf = gerar_termo_contrato_vencido(
        nf_numero="123",
        nf_serie="1",
        nf_valor=1500.5,
        fornecedor="Fornecedor <Teste>",
        contrato_numero="45",
        contrato_ano=2025,
        contrato_data_fim="2026-09-30",
        motivo="Entrega feita dentro da vigência, nota emitida depois.",
        solicitante="Maria Solicitante",
        admin_nome="João Admin",
        data_baixa=datetime(2026, 10, 18, 9, 30),
    )
    texto = pymupdf.open(stream=pdf, filetype="pdf")[0].get_text()
    for esperado in ("TERMO DE RESPONSABILIDADE", "Fornecedor <Teste>", "30/09/2026",
                     "R$ 1.500,50", "nota emitida depois", "Maria Solicitante", "João Admin"):
        assert esperado in texto


@pytest.mark.asyncio
async def test_termo_negado_para_operador(async_client: AsyncClient, as_operador):
    response = await async_client.get("/api/v1/notas-fiscais/1/termo-contrato-vencido")
    assert response.status_code == 403
