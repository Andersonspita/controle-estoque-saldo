from pathlib import Path

import pytest

from src.services.nfe_parser import parse_nfe_xml

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_parse_nfe_xml_nfeproc():
    xml_content = (FIXTURES_DIR / "sample_nfe.xml").read_text(encoding="utf-8")
    result = parse_nfe_xml(xml_content)

    assert result["numero"] == "12345"
    assert result["serie"] == "1"
    assert result["chave_acesso"] == "35201214234567890123456789012345678901234"
    assert result["data_emissao"] == "2024-03-21"
    assert result["fornecedor"]["cnpj"] == "12345678000199"
    assert result["fornecedor"]["nome"] == "FORNECEDOR TESTE LTDA"
    assert result["valor_total"] == 2000.0
    assert len(result["itens"]) == 1
    assert result["itens"][0]["codigo_produto"] == "MON-001"
    assert result["itens"][0]["descricao"] == "Monitor 24 Polegadas"
    assert result["itens"][0]["quantidade"] == 2.0
    assert result["itens"][0]["valor_unitario"] == 1000.0


def test_parse_nfe_xml_direto_sem_protocolo():
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe11111111111111111111111111111111111111111" versao="4.00">
    <ide>
      <nNF>99</nNF>
      <serie>2</serie>
      <dEmi>2023-01-15</dEmi>
    </ide>
    <emit>
      <CNPJ>00000000000191</CNPJ>
      <xNome>EMITENTE SIMPLES</xNome>
    </emit>
    <det nItem="1">
      <prod>
        <cProd>ABC</cProd>
        <xProd>Produto Teste</xProd>
        <uCom>UN</uCom>
        <qCom>1.0000</qCom>
        <vUnCom>50.0000000000</vUnCom>
        <vProd>50.00</vProd>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vNF>50.00</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>"""
    result = parse_nfe_xml(xml_content)

    assert result["numero"] == "99"
    assert result["serie"] == "2"
    assert result["data_emissao"] == "2023-01-15"
    assert result["chave_acesso"] == "11111111111111111111111111111111111111111"
    assert result["valor_total"] == 50.0


def test_parse_nfe_xml_invalido():
    with pytest.raises(ValueError, match="NF-e válida"):
        parse_nfe_xml("<root><invalido/></root>")
