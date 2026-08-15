from functools import lru_cache
from io import BytesIO

import pymupdf
from PIL import Image
import numpy as np

from .danfe_parser import parse_danfe_blocos


@lru_cache(maxsize=1)
def _ocr_engine():
    from rapidocr import RapidOCR
    return RapidOCR()


def _pdf_para_pngs(conteudo: bytes, escala: float = 2.5) -> list[tuple[bytes, int, int]]:
    doc = pymupdf.open(stream=conteudo, filetype="pdf")
    imagens: list[tuple[bytes, int, int]] = []
    matriz = pymupdf.Matrix(escala, escala)
    for pagina in doc:
        pix = pagina.get_pixmap(matrix=matriz, alpha=False)
        imagens.append((pix.tobytes("png"), pix.width, pix.height))
    if not imagens:
        raise ValueError("PDF sem páginas")
    return imagens


def _ocr_png(png_bytes: bytes) -> list[dict]:
    imagem = np.array(Image.open(BytesIO(png_bytes)).convert("RGB"))
    resultado = _ocr_engine()(imagem)
    blocos = []
    textos = resultado.txts or []
    caixas = resultado.boxes if resultado.boxes is not None else []
    for texto, caixa in zip(textos, caixas):
        blocos.append({
            "text": str(texto).strip(),
            "x": float(caixa[0][0]),
            "y": float(caixa[0][1]),
        })
    return blocos


def parse_nfe_pdf(conteudo: bytes) -> dict:
    """
    Lê um DANFE em PDF. DANFEs gerados em PostScript (Ghostscript) não
    têm texto extraível; nesse caso a página é rasterizada e passa por OCR.
    """
    pngs = _pdf_para_pngs(conteudo)
    todos_blocos: list[dict] = []
    largura = pngs[0][1]
    offset_y = 0.0
    for png_bytes, largura_pag, altura_pag in pngs:
        blocos = _ocr_png(png_bytes)
        for bloco in blocos:
            bloco["y"] = bloco["y"] + offset_y
        todos_blocos.extend(blocos)
        offset_y += altura_pag
        largura = max(largura, largura_pag)

    return parse_danfe_blocos(todos_blocos, largura=float(largura))
