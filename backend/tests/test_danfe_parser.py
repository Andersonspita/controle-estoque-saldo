import json
from pathlib import Path

import pytest

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


def _danfe_com_linha(celulas: list[tuple[float, str]]) -> list[dict]:
    """Monta o mínimo que o parser precisa: rótulos da seção e uma linha de item."""
    blocos = [
        {"text": "DADOS DOS PRODUTOS / SERVIÇOS", "x": 10.0, "y": 100.0},
        {"text": "DADOS ADICIONAIS", "x": 10.0, "y": 300.0},
    ]
    blocos += [{"text": texto, "x": x, "y": 200.0} for x, texto in celulas]
    return blocos


def test_quantidade_com_quatro_casas_decimais():
    """O padrão da NF-e usa 4 decimais na quantidade (ex.: 90,0000)."""
    blocos = _danfe_com_linha([
        (32.0, "7"), (60.0, "Banana Prata Und"), (240.0, "08039000"),
        (278.0, "040"), (298.0, "5101"), (320.0, "UND"),
        (341.0, "90,0000"), (392.0, "0,89"), (428.0, "80,10"),
        (466.0, "0,00"), (500.0, "0,00"),
    ])

    itens = parse_danfe_blocos(blocos)["itens"]

    assert len(itens) == 1
    item = itens[0]
    assert item["codigo_produto"] == "7"
    assert item["descricao"] == "Banana Prata Und"
    assert item["ncm"] == "08039000"
    assert item["cfop"] == "5101"
    assert item["unidade"] == "UND"
    assert item["quantidade"] == 90.0
    assert item["valor_unitario"] == 0.89
    assert item["valor_total"] == 80.10


def test_coluna_de_desconto_entre_unitario_e_total():
    """Alguns emissores inserem o desconto antes do valor total."""
    blocos = _danfe_com_linha([
        (32.0, "0030"), (60.0, "TUBO PVC DE 100 MM PN 80"), (240.0, "39172300"),
        (278.0, "102"), (298.0, "5102"), (320.0, "UNID"),
        (341.0, "18,00"), (392.0, "151,00"), (420.0, "0,00"),
        (450.0, "2.718,00"), (490.0, "0,00"),
    ])

    item = parse_danfe_blocos(blocos)["itens"][0]

    assert item["quantidade"] == 18.0
    assert item["valor_unitario"] == 151.0
    assert item["valor_total"] == 2718.0


def test_valor_total_ausente_e_calculado():
    blocos = _danfe_com_linha([
        (32.0, "15"), (60.0, "Melancia Kg"), (240.0, "08071100"),
        (278.0, "040"), (298.0, "5101"), (320.0, "KG"),
        (341.0, "22,0000"), (392.0, "4,67"),
    ])

    item = parse_danfe_blocos(blocos)["itens"][0]

    assert item["quantidade"] == 22.0
    assert item["valor_total"] == 102.74


def test_linha_sem_ncm_nao_vira_item():
    blocos = _danfe_com_linha([
        (32.0, "TOTAL"), (341.0, "22,0000"), (392.0, "4,67"),
    ])

    with pytest.raises(ValueError, match="itens do DANFE"):
        parse_danfe_blocos(blocos)
