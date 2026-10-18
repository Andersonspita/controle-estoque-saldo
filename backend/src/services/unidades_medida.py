"""Lookup de unidades de medida usadas nos itens do contrato."""

from __future__ import annotations

from typing import TypedDict
import unicodedata


class UnidadeMedida(TypedDict):
    sigla: str
    nome: str
    grupo: str


UNIDADES_MEDIDA: list[UnidadeMedida] = [
    {"sigla": "UN", "nome": "Unidade", "grupo": "Quantidade"},
    {"sigla": "PC", "nome": "Peça", "grupo": "Quantidade"},
    {"sigla": "PR", "nome": "Par", "grupo": "Quantidade"},
    {"sigla": "JG", "nome": "Jogo", "grupo": "Quantidade"},
    {"sigla": "CJ", "nome": "Conjunto", "grupo": "Quantidade"},
    {"sigla": "KIT", "nome": "Kit", "grupo": "Quantidade"},
    {"sigla": "DZ", "nome": "Dúzia", "grupo": "Quantidade"},
    {"sigla": "CT", "nome": "Cento", "grupo": "Quantidade"},
    {"sigla": "MIL", "nome": "Milheiro", "grupo": "Quantidade"},
    {"sigla": "FOL", "nome": "Folha", "grupo": "Quantidade"},
    {"sigla": "CX", "nome": "Caixa", "grupo": "Embalagem"},
    {"sigla": "PCT", "nome": "Pacote", "grupo": "Embalagem"},
    {"sigla": "FD", "nome": "Fardo", "grupo": "Embalagem"},
    {"sigla": "SC", "nome": "Saco", "grupo": "Embalagem"},
    {"sigla": "RL", "nome": "Rolo", "grupo": "Embalagem"},
    {"sigla": "BD", "nome": "Balde", "grupo": "Embalagem"},
    {"sigla": "TMB", "nome": "Tambor", "grupo": "Embalagem"},
    {"sigla": "GL", "nome": "Galão", "grupo": "Embalagem"},
    {"sigla": "LT", "nome": "Lata", "grupo": "Embalagem"},
    {"sigla": "FR", "nome": "Frasco", "grupo": "Embalagem"},
    {"sigla": "AMP", "nome": "Ampola", "grupo": "Embalagem"},
    {"sigla": "VD", "nome": "Vidro", "grupo": "Embalagem"},
    {"sigla": "GF", "nome": "Garrafa", "grupo": "Embalagem"},
    {"sigla": "TB", "nome": "Tubo", "grupo": "Embalagem"},
    {"sigla": "BL", "nome": "Blister", "grupo": "Embalagem"},
    {"sigla": "CART", "nome": "Cartela", "grupo": "Embalagem"},
    {"sigla": "RES", "nome": "Resma", "grupo": "Embalagem"},
    {"sigla": "M", "nome": "Metro", "grupo": "Comprimento"},
    {"sigla": "CM", "nome": "Centímetro", "grupo": "Comprimento"},
    {"sigla": "MM", "nome": "Milímetro", "grupo": "Comprimento"},
    {"sigla": "KM", "nome": "Quilômetro", "grupo": "Comprimento"},
    {"sigla": "M2", "nome": "Metro quadrado", "grupo": "Área"},
    {"sigla": "CM2", "nome": "Centímetro quadrado", "grupo": "Área"},
    {"sigla": "HA", "nome": "Hectare", "grupo": "Área"},
    {"sigla": "L", "nome": "Litro", "grupo": "Volume"},
    {"sigla": "ML", "nome": "Mililitro", "grupo": "Volume"},
    {"sigla": "M3", "nome": "Metro cúbico", "grupo": "Volume"},
    {"sigla": "CM3", "nome": "Centímetro cúbico", "grupo": "Volume"},
    {"sigla": "KG", "nome": "Quilograma", "grupo": "Massa"},
    {"sigla": "G", "nome": "Grama", "grupo": "Massa"},
    {"sigla": "MG", "nome": "Miligrama", "grupo": "Massa"},
    {"sigla": "T", "nome": "Tonelada", "grupo": "Massa"},
    {"sigla": "H", "nome": "Hora", "grupo": "Tempo e serviço"},
    {"sigla": "D", "nome": "Dia", "grupo": "Tempo e serviço"},
    {"sigla": "MES", "nome": "Mês", "grupo": "Tempo e serviço"},
    {"sigla": "ANO", "nome": "Ano", "grupo": "Tempo e serviço"},
    {"sigla": "HH", "nome": "Homem-hora", "grupo": "Tempo e serviço"},
    {"sigla": "SV", "nome": "Serviço", "grupo": "Tempo e serviço"},
    {"sigla": "US", "nome": "Unidade de serviço", "grupo": "Tempo e serviço"},
    {"sigla": "VB", "nome": "Verba", "grupo": "Tempo e serviço"},
]

_ALIAS = {
    "unid": "UN",
    "und": "UN",
    "unidade": "UN",
    "unidades": "UN",
    "peca": "PC",
    "pecas": "PC",
    "pç": "PC",
    "par": "PR",
    "pares": "PR",
    "jogo": "JG",
    "conjunto": "CJ",
    "duzia": "DZ",
    "caixa": "CX",
    "pacote": "PCT",
    "fardo": "FD",
    "saco": "SC",
    "rolo": "RL",
    "balde": "BD",
    "tambor": "TMB",
    "galao": "GL",
    "lata": "LT",
    "frasco": "FR",
    "ampola": "AMP",
    "vidro": "VD",
    "garrafa": "GF",
    "tubo": "TB",
    "resma": "RES",
    "metro": "M",
    "centimetro": "CM",
    "milimetro": "MM",
    "quilometro": "KM",
    "m²": "M2",
    "metro quadrado": "M2",
    "hectare": "HA",
    "litro": "L",
    "litros": "L",
    "mililitro": "ML",
    "m³": "M3",
    "metro cubico": "M3",
    "quilograma": "KG",
    "kilo": "KG",
    "quilo": "KG",
    "grama": "G",
    "tonelada": "T",
    "ton": "T",
    "hora": "H",
    "horas": "H",
    "dia": "D",
    "dias": "D",
    "mes": "MES",
    "meses": "MES",
    "ano": "ANO",
    "anos": "ANO",
    "servico": "SV",
    "verba": "VB",
}

_POR_SIGLA = {u["sigla"].upper(): u for u in UNIDADES_MEDIDA}


def _normalizar_chave(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", (texto or "").strip().lower())
    sem_acento = "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")
    return (
        sem_acento.replace("²", "2")
        .replace("³", "3")
        .replace(" ", "")
        .replace("-", "")
        .replace(".", "")
    )


_POR_NOME = {_normalizar_chave(u["nome"]): u["sigla"] for u in UNIDADES_MEDIDA}


def unidade_por_sigla(sigla: str | None) -> UnidadeMedida | None:
    if not sigla:
        return None
    return _POR_SIGLA.get(sigla.strip().upper())


def normalizar_unidade(valor: str | None, *, padrao: str = "UN") -> str:
    texto = (valor or "").strip()
    if not texto:
        return padrao
    chave = _normalizar_chave(texto)
    if chave in _ALIAS:
        return _ALIAS[chave]
    if texto.upper() in _POR_SIGLA:
        return texto.upper()
    if chave in _POR_NOME:
        return _POR_NOME[chave]
    # sigla digitada sem acento (ex.: m2)
    if chave.upper() in _POR_SIGLA:
        return chave.upper()
    raise ValueError(f"Unidade de medida inválida: {texto}")


CASAS_QUANTIDADE = 3


def arredondar_quantidade(valor) -> float:
    """Toda quantidade (item, NF, saldo) tem até 3 casas; evita resíduo de float como -1e-17."""
    return round(float(valor or 0), CASAS_QUANTIDADE)
