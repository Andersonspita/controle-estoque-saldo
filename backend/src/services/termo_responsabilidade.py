"""Termo de responsabilidade da baixa de NF em contrato vencido (PDF)."""

from datetime import date, datetime
from html import escape

import pymupdf


def _data_br(valor) -> str:
    if isinstance(valor, str):
        valor = date.fromisoformat(valor[:10])
    return valor.strftime("%d/%m/%Y") if valor else "-"


def _moeda(valor) -> str:
    texto = f"{float(valor or 0):,.2f}"
    return "R$ " + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def gerar_termo_contrato_vencido(
    *,
    nf_numero: str,
    nf_serie: str | None,
    nf_valor,
    fornecedor: str,
    contrato_numero: str,
    contrato_ano,
    contrato_data_fim,
    motivo: str,
    solicitante: str,
    admin_nome: str,
    data_baixa: datetime,
) -> bytes:
    e = lambda v: escape(str(v or ""))  # noqa: E731
    # O número muitas vezes já traz o ano ("012/2024"); não repete.
    numero_contrato = contrato_numero if not contrato_ano or "/" in str(contrato_numero) else f"{contrato_numero}/{contrato_ano}"
    nf = f"{e(nf_numero)}{'/' + e(nf_serie) if nf_serie else ''}"
    html = f"""
    <h2 style="text-align:center">TERMO DE RESPONSABILIDADE</h2>
    <p style="text-align:center"><b>Baixa de Nota Fiscal em Contrato Vencido</b></p>
    <br/>
    <table style="width:100%; border-collapse:collapse" border="1" cellpadding="4">
      <tr><td><b>Nota fiscal</b></td><td>{nf}</td></tr>
      <tr><td><b>Valor da nota</b></td><td>{_moeda(nf_valor)}</td></tr>
      <tr><td><b>Fornecedor</b></td><td>{e(fornecedor)}</td></tr>
      <tr><td><b>Contrato</b></td><td>{e(numero_contrato)}</td></tr>
      <tr><td><b>Vigência encerrada em</b></td><td>{_data_br(contrato_data_fim)}</td></tr>
      <tr><td><b>Data da baixa</b></td><td>{data_baixa:%d/%m/%Y %H:%M}</td></tr>
    </table>
    <br/>
    <p style="text-align:justify">Declaramos, para os devidos fins, que a baixa da nota fiscal acima
    foi efetuada após o término da vigência do contrato, assumindo os signatários a
    responsabilidade pela operação, pelos motivos a seguir expostos.</p>
    <p><b>Motivo da baixa:</b></p>
    <p style="text-align:justify">{e(motivo).replace(chr(10), "<br/>")}</p>
    <br/><br/><br/>
    <table style="width:100%">
      <tr>
        <td style="text-align:center">______________________________<br/>{e(admin_nome)}<br/>Administrador responsável</td>
        <td style="text-align:center">______________________________<br/>{e(solicitante)}<br/>Solicitante da baixa</td>
      </tr>
    </table>
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4
    page.insert_htmlbox(pymupdf.Rect(56, 56, 539, 786), html, css="* {font-family: sans-serif; font-size: 11pt}")
    return doc.tobytes()
