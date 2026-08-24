"""Lookup de unidades de medida usadas nos itens do contrato."""

from __future__ import annotations

from typing import TypedDict
import unicodedata


class UnidadeMedida(TypedDict):
    sigla: str
    nome: str
    grupo: str
    inteira: bool


UNIDADES_MEDIDA: list[UnidadeMedida] = [
    {"sigla": "UN", "nome": "Unidade", "grupo": "Quantidade", "inteira": True},
    {"sigla": "PC", "nome": "Peça", "grupo": "Quantidade", "inteira": True},
    {"sigla": "PR", "nome": "Par", "grupo": "Quantidade", "inteira": True},
    {"sigla": "JG", "nome": "Jogo", "grupo": "Quantidade", "inteira": True},
    {"sigla": "CJ", "nome": "Conjunto", "grupo": "Quantidade", "inteira": True},
    {"sigla": "KIT", "nome": "Kit", "grupo": "Quantidade", "inteira": True},
    {"sigla": "DZ", "nome": "Dúzia", "grupo": "Quantidade", "inteira": True},
    {"sigla": "CT", "nome": "Cento", "grupo": "Quantidade", "inteira": True},
    {"sigla": "MIL", "nome": "Milheiro", "grupo": "Quantidade", "inteira": True},
    {"sigla": "FOL", "nome": "Folha", "grupo": "Quantidade", "inteira": True},
    {"sigla": "CX", "nome": "Caixa", "grupo": "Embalagem", "inteira": True},
    {"sigla": "PCT", "nome": "Pacote", "grupo": "Embalagem", "inteira": True},
    {"sigla": "FD", "nome": "Fardo", "grupo": "Embalagem", "inteira": True},
    {"sigla": "SC", "nome": "Saco", "grupo": "Embalagem", "inteira": True},
    {"sigla": "RL", "nome": "Rolo", "grupo": "Embalagem", "inteira": True},
    {"sigla": "BD", "nome": "Balde", "grupo": "Embalagem", "inteira": True},
    {"sigla": "TMB", "nome": "Tambor", "grupo": "Embalagem", "inteira": True},
    {"sigla": "GL", "nome": "Galão", "grupo": "Embalagem", "inteira": True},
    {"sigla": "LT", "nome": "Lata", "grupo": "Embalagem", "inteira": True},
    {"sigla": "FR", "nome": "Frasco", "grupo": "Embalagem", "inteira": True},
    {"sigla": "AMP", "nome": "Ampola", "grupo": "Embalagem", "inteira": True},
    {"sigla": "VD", "nome": "Vidro", "grupo": "Embalagem", "inteira": True},
    {"sigla": "GF", "nome": "Garrafa", "grupo": "Embalagem", "inteira": True},
    {"sigla": "TB", "nome": "Tubo", "grupo": "Embalagem", "inteira": True},
    {"sigla": "BL", "nome": "Blister", "grupo": "Embalagem", "inteira": True},
    {"sigla": "CART", "nome": "Cartela", "grupo": "Embalagem", "inteira": True},
    {"sigla": "RES", "nome": "Resma", "grupo": "Embalagem", "inteira": True},
    {"sigla": "M", "nome": "Metro", "grupo": "Comprimento", "inteira": False},
    {"sigla": "CM", "nome": "Centímetro", "grupo": "Comprimento", "inteira": False},
    {"sigla": "MM", "nome": "Milímetro", "grupo": "Comprimento", "inteira": False},
    {"sigla": "KM", "nome": "Quilômetro", "grupo": "Comprimento", "inteira": False},
    {"sigla": "M2", "nome": "Metro quadrado", "grupo": "Área", "inteira": False},
    {"sigla": "CM2", "nome": "Centímetro quadrado", "grupo": "Área", "inteira": False},
    {"sigla": "HA", "nome": "Hectare", "grupo": "Área", "inteira": False},
    {"sigla": "L", "nome": "Litro", "grupo": "Volume", "inteira": False},
    {"sigla": "ML", "nome": "Mililitro", "grupo": "Volume", "inteira": False},
    {"sigla": "M3", "nome": "Metro cúbico", "grupo": "Volume", "inteira": False},
    {"sigla": "CM3", "nome": "Centímetro cúbico", "grupo": "Volume", "inteira": False},
    {"sigla": "KG", "nome": "Quilograma", "grupo": "Massa", "inteira": False},
    {"sigla": "G", "nome": "Grama", "grupo": "Massa", "inteira": False},
    {"sigla": "MG", "nome": "Miligrama", "grupo": "Massa", "inteira": False},
    {"sigla": "T", "nome": "Tonelada", "grupo": "Massa", "inteira": False},
    {"sigla": "H", "nome": "Hora", "grupo": "Tempo e serviço", "inteira": False},
    {"sigla": "D", "nome": "Dia", "grupo": "Tempo e serviço", "inteira": True},
    {"sigla": "MES", "nome": "Mês", "grupo": "Tempo e serviço", "inteira": True},
    {"sigla": "ANO", "nome": "Ano", "grupo": "Tempo e serviço", "inteira": True},
    {"sigla": "HH", "nome": "Homem-hora", "grupo": "Tempo e serviço", "inteira": False},
    {"sigla": "SV", "nome": "Serviço", "grupo": "Tempo e serviço", "inteira": True},
    {"sigla": "US", "nome": "Unidade de serviço", "grupo": "Tempo e serviço", "inteira": True},
    {"sigla": "VB", "nome": "Verba", "grupo": "Tempo e serviço", "inteira": True},
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


def quantidade_inteira(unidade: str | None) -> bool:
    try:
        sigla = normalizar_unidade(unidade)
    except ValueError:
        texto = (unidade or "UN").strip().lower()
        return texto.startswith("un")
    encontrada = unidade_por_sigla(sigla)
    return bool(encontrada and encontrada["inteira"])
