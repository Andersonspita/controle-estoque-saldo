from functools import lru_cache
from io import BytesIO

import pymupdf
from PIL import Image
import numpy as np

from .danfe_parser import parse_danfe_blocos

# As heurísticas de posição do danfe_parser são calibradas na escala usada
# pela rasterização; a camada de texto é convertida para a mesma escala.
ESCALA = 2.5

# Espaçamento entre as linhas da tabela de itens: a camada de texto entrega
# coordenadas exatas, o OCR precisa de folga para o ruído vertical.
TOLERANCIA_TEXTO = 10.0
TOLERANCIA_OCR = 14.0


@lru_cache(maxsize=1)
def _ocr_engine():
    from rapidocr import RapidOCR
    return RapidOCR()


def _blocos_da_camada_de_texto(doc) -> tuple[list[dict], float]:
    """Lê o texto nativo do PDF, uma célula do layout por bloco."""
    blocos: list[dict] = []
    largura = 0.0
    offset_y = 0.0
    for pagina in doc:
        for bloco in pagina.get_text("dict")["blocks"]:
            for linha in bloco.get("lines", []):
                texto = "".join(span["text"] for span in linha["spans"]).strip()
                if not texto:
                    continue
                x0, y0 = linha["bbox"][0], linha["bbox"][1]
                blocos.append({
                    "text": texto,
                    "x": x0 * ESCALA,
                    "y": y0 * ESCALA + offset_y,
                })
        largura = max(largura, pagina.rect.width * ESCALA)
        offset_y += pagina.rect.height * ESCALA
    return blocos, largura


def _pdf_para_pngs(doc) -> list[tuple[bytes, int, int]]:
    imagens: list[tuple[bytes, int, int]] = []
    matriz = pymupdf.Matrix(ESCALA, ESCALA)
    for pagina in doc:
        pix = pagina.get_pixmap(matrix=matriz, alpha=False)
        imagens.append((pix.tobytes("png"), pix.width, pix.height))
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


def _blocos_por_ocr(doc) -> tuple[list[dict], float]:
    """Rasteriza cada página e reconhece o texto por OCR."""
    todos_blocos: list[dict] = []
    largura = 0.0
    offset_y = 0.0
    for png_bytes, largura_pag, altura_pag in _pdf_para_pngs(doc):
        for bloco in _ocr_png(png_bytes):
            bloco["y"] += offset_y
            todos_blocos.append(bloco)
        largura = max(largura, float(largura_pag))
        offset_y += altura_pag
    return todos_blocos, largura


def parse_nfe_pdf(conteudo: bytes) -> dict:
    """
    Lê um DANFE em PDF.

    Emissores que geram o PDF com texto nativo (Omie, NFe.io, a maioria dos
    ERPs) são lidos direto da camada de texto, o que é exato e dispensa OCR.
    DANFEs digitalizados ou gerados em PostScript (Ghostscript) não têm texto
    extraível; nesse caso a página é rasterizada e passa por OCR.
    """
    doc = pymupdf.open(stream=conteudo, filetype="pdf")
    if doc.page_count == 0:
        raise ValueError("PDF sem páginas")

    blocos, largura = _blocos_da_camada_de_texto(doc)
    if blocos:
        try:
            return parse_danfe_blocos(
                blocos,
                largura=largura,
                tolerancia_linha=TOLERANCIA_TEXTO,
                origem="pdf-texto",
            )
        except ValueError:
            # Camada de texto ausente ou incompleta: tenta pelo OCR.
            pass

    blocos, largura = _blocos_por_ocr(doc)
    return parse_danfe_blocos(
        blocos, largura=largura, tolerancia_linha=TOLERANCIA_OCR, origem="ocr"
    )
