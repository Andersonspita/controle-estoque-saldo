import os
import re
from datetime import datetime

from fastapi import HTTPException


def nome_arquivo_seguro(nome: str | None) -> str:
    base = os.path.basename(nome or "arquivo")
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    if not base:
        base = "arquivo"
    return base[:180]


def caminho_upload_seguro(pasta: str, nome_original: str | None) -> str:
    os.makedirs(pasta, exist_ok=True)
    pasta_abs = os.path.abspath(pasta)
    carimbo = datetime.now().strftime("%Y%m%d%H%M%S")
    nome = f"{carimbo}_{nome_arquivo_seguro(nome_original)}"
    destino = os.path.abspath(os.path.join(pasta_abs, nome))
    try:
        comum = os.path.commonpath([destino, pasta_abs])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido") from exc
    if comum != pasta_abs:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido")
    return destino
