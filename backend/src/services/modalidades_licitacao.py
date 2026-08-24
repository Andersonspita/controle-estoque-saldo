"""Lookup de modalidades de licitação e contratação direta (Lei 14.133/2021 e 8.666/93)."""

import unicodedata

MODALIDADES_LICITACAO = [
    "Pregão eletrônico",
    "Pregão presencial",
    "Concorrência",
    "Concorrência eletrônica",
    "Concurso",
    "Leilão",
    "Diálogo competitivo",
    "Dispensa de licitação",
    "Inexigibilidade de licitação",
    "Credenciamento",
    "Pré-qualificação",
    "Chamada pública",
    "Registro de preços",
    "Adesão à ata de registro de preços",
    "Convite",
    "Tomada de preços",
    "RDC",
    "Contratação direta",
]


def _chave(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", (texto or "").strip().casefold())
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


_POR_CHAVE = {_chave(item): item for item in MODALIDADES_LICITACAO}


def normalizar_modalidade(valor: str | None) -> str | None:
    texto = (valor or "").strip()
    if not texto:
        return None
    encontrada = _POR_CHAVE.get(_chave(texto))
    if encontrada:
        return encontrada
    raise ValueError(f"Modalidade de licitação inválida: {texto}")
