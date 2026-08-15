import json
from pathlib import Path

from src.services.danfe_parser import parse_danfe_blocos

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_danfe_nf_cipo():
    blocos = json.loads((FIXTURES / "danfe_ocr.json").read_text(encoding="utf-8"))
    dados = parse_danfe_blocos(blocos, largura=1488.0)

    assert dados["numero"] == "69"
    assert dados["serie"] == "1"
    assert dados["chave_acesso"] == "29260832183420000147550010000000691333202248"
    assert dados["data_emissao"] == "2026-08-04"
    assert dados["fornecedor"]["cnpj"] == "32183420000147"
    assert dados["fornecedor"]["nome"] == "MARIA EUNICE JESUS DE OLIVEIRA DE CIPO"
    assert dados["valor_total"] == 26001.0
    assert dados["origem"] == "ocr"

    assert len(dados["itens"]) == 13
    primeiro = dados["itens"][0]
    assert primeiro["codigo_produto"] == "0075"
    assert "BOMBEADOR" in primeiro["descricao"]
    assert primeiro["quantidade"] == 1.0
    assert primeiro["valor_unitario"] == 1050.0

    tubo = next(i for i in dados["itens"] if i["codigo_produto"] == "0030")
    assert tubo["quantidade"] == 18.0
    assert tubo["valor_unitario"] == 151.0
    assert tubo["valor_total"] == 2718.0

    soma = round(sum(i["valor_total"] for i in dados["itens"]), 2)
    assert soma == 26001.0
