import re
from datetime import datetime

CNPJ_RE = re.compile(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}")
DATE_RE = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
SERIE_RE = re.compile(r"S[ée]rie\s+(\d+)", re.IGNORECASE)
NUMERO_RE = re.compile(r"N[ºo°.]+\s*([\d.]+)", re.IGNORECASE)
MONEY_RE = re.compile(r"^\d{1,3}(?:\.\d{3})*,\d{2}$")
# Quantidades no DANFE vêm com até 4 casas decimais (ex.: 10,0000).
QTD_RE = re.compile(r"^\d{1,3}(?:\.\d{3})*,\d{1,4}$")
NCM_RE = re.compile(r"^\d{8}$")
CFOP_RE = re.compile(r"^[1-7]\d{3}$")
CODIGO_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9./\-]{0,19}$")
UNIDADE_RE = re.compile(r"^[A-Za-zÀ-ÿ]{1,6}\.?$")

LABELS_IGNORAR = (
    "CÓDIGO", "CODIGO", "DESCRIÇÃO", "DESCRICAO", "DADOS DOS PRODUTOS",
    "DADOS ADICIONAIS", "INFORMAÇÕES", "INFORMACOES", "PROD. /SERV",
    "NCM / SH", "VALOR", "UNID.", "QUANT.", "CST", "CFOP",
)


def _so_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")


def _numero_br(texto: str) -> float | None:
    texto = (texto or "").strip()
    if not MONEY_RE.match(texto) and not QTD_RE.match(texto):
        return None
    return float(texto.replace(".", "").replace(",", "."))


def _data_iso(texto: str) -> str | None:
    match = DATE_RE.search(texto or "")
    if not match:
        return None
    try:
        return datetime.strptime(match.group(1), "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def _agrupar_linhas(blocos: list[dict], tolerancia: float = 18.0) -> list[list[dict]]:
    ordenados = sorted(blocos, key=lambda b: (b["y"], b["x"]))
    linhas: list[list[dict]] = []
    atual: list[dict] = []
    y_ref: float | None = None
    for bloco in ordenados:
        if y_ref is None or abs(bloco["y"] - y_ref) <= tolerancia:
            atual.append(bloco)
            if y_ref is None:
                y_ref = bloco["y"]
        else:
            linhas.append(atual)
            atual = [bloco]
            y_ref = bloco["y"]
    if atual:
        linhas.append(atual)
    return linhas


def _extrair_chave(blocos: list[dict]) -> str | None:
    for bloco in blocos:
        digitos = _so_digitos(bloco["text"])
        if len(digitos) == 44:
            return digitos
    # Chave pode vir quebrada em tokens próximos
    for bloco in blocos:
        if "CHAVE" in bloco["text"].upper():
            vizinhos = [
                b for b in blocos
                if abs(b["y"] - bloco["y"]) < 40 and b["x"] >= bloco["x"] - 20
            ]
            texto = " ".join(b["text"] for b in sorted(vizinhos, key=lambda b: (b["y"], b["x"])))
            digitos = _so_digitos(texto)
            if len(digitos) >= 44:
                return digitos[:44]
    return None


def _cnpj_entre(blocos: list[dict], inicio: str, fim: str | None) -> str | None:
    ys = [b["y"] for b in blocos if inicio.upper() in b["text"].upper()]
    if not ys:
        return None
    y0 = min(ys)
    y1 = max(b["y"] for b in blocos)
    if fim:
        ys_fim = [b["y"] for b in blocos if fim.upper() in b["text"].upper() and b["y"] > y0]
        if ys_fim:
            y1 = min(ys_fim)
    for bloco in blocos:
        if y0 <= bloco["y"] <= y1:
            match = CNPJ_RE.search(bloco["text"])
            if match:
                return _so_digitos(match.group(0))
    return None


def _nome_emitente(blocos: list[dict]) -> str | None:
    ys = [b["y"] for b in blocos if "IDENTIFICAÇÃO DO EMITENTE" in b["text"].upper() or "IDENTIFICACAO DO EMITENTE" in b["text"].upper()]
    if not ys:
        ys = [b["y"] for b in blocos if b["text"].strip().upper() == "DANFE"]
    if not ys:
        return None
    y0 = min(ys)
    candidatos = [
        b for b in blocos
        if y0 < b["y"] < y0 + 180 and b["x"] < 400 and len(b["text"]) > 8
    ]
    ignorar = ("DOCUMENTO AUXILIAR", "FISCAL ELETR", "ENTRADA", "SAÍDA", "SAIDA")
    for cand in sorted(candidatos, key=lambda b: b["y"]):
        texto = cand["text"].strip()
        if any(i in texto.upper() for i in ignorar):
            continue
        if CNPJ_RE.search(texto) or DATE_RE.search(texto):
            continue
        return texto
    return None


def _item_de_linha(linha: list[dict]) -> dict | None:
    """
    Monta um item a partir de uma linha da tabela de produtos.

    O NCM (8 dígitos) é a âncora que separa código e descrição dos campos
    numéricos, e a unidade marca o início da sequência quantidade / valor
    unitário / valor total. Ancorar no conteúdo em vez de em posições de
    coluna fixas mantém a leitura válida entre layouts de emissores.
    """
    textos = [b["text"].strip() for b in linha if b["text"].strip()]
    idx_ncm = next((i for i, t in enumerate(textos) if NCM_RE.match(t)), None)
    if idx_ncm is None:
        return None

    cabeca = textos[:idx_ncm]
    ncm = textos[idx_ncm]
    cauda = textos[idx_ncm + 1:]

    codigo = None
    if len(cabeca) > 1 and CODIGO_RE.match(cabeca[0]):
        codigo = cabeca[0]
        cabeca = cabeca[1:]
    descricao = " ".join(cabeca).strip()
    if not descricao:
        return None

    cfop = next((t for t in cauda if CFOP_RE.match(t)), None)

    idx_un = next((i for i, t in enumerate(cauda) if UNIDADE_RE.match(t)), None)
    unidade = cauda[idx_un] if idx_un is not None else None
    # CST e CFOP não têm vírgula decimal, então caem fora sozinhos.
    numericos = cauda[idx_un + 1:] if idx_un is not None else cauda
    numeros = [v for v in (_numero_br(t) for t in numericos) if v is not None]
    if not numeros:
        return None

    quantidade = numeros[0]
    valor_unitario = numeros[1] if len(numeros) > 1 else None
    valor_total = None
    if valor_unitario is not None:
        # Entre o valor unitário e o total alguns layouts inserem uma coluna
        # de desconto, então o total é o primeiro número à direita que fecha
        # com quantidade x unitário — e não simplesmente o próximo da linha.
        esperado = round(quantidade * valor_unitario, 2)
        margem = max(0.02, abs(esperado) * 0.005)
        valor_total = next(
            (v for v in numeros[2:] if abs(v - esperado) <= margem),
            esperado,
        )

    return {
        "codigo_produto": codigo,
        "descricao": descricao,
        "gtin": None,
        "ncm": ncm,
        "cfop": cfop,
        "unidade": (unidade or "UN").upper(),
        "quantidade": quantidade,
        "valor_unitario": valor_unitario or 0.0,
        "valor_total": valor_total or 0.0,
    }


def _parse_itens(blocos: list[dict], tolerancia_linha: float = 22.0) -> list[dict]:
    y_ini = min((b["y"] for b in blocos if "DADOS DOS PRODUTOS" in b["text"].upper()), default=None)
    y_fim = min((b["y"] for b in blocos if "DADOS ADICIONAIS" in b["text"].upper()), default=10**9)
    if y_ini is None:
        return []

    corpo = [b for b in blocos if y_ini < b["y"] < y_fim]
    itens = []
    for linha in _agrupar_linhas(corpo, tolerancia=tolerancia_linha):
        linha = sorted(linha, key=lambda b: b["x"])
        textos = " ".join(b["text"] for b in linha).upper()
        if any(lab in textos for lab in LABELS_IGNORAR):
            continue
        item = _item_de_linha(linha)
        if item:
            itens.append(item)

    return itens


def parse_danfe_blocos(
    blocos: list[dict],
    largura: float = 1488.0,
    tolerancia_linha: float = 22.0,
    origem: str = "ocr",
) -> dict:
    """Converte blocos OCR (x, y, text) de um DANFE no mesmo formato do parser XML."""
    if not blocos:
        raise ValueError("Nenhum texto reconhecido no DANFE")

    chave = _extrair_chave(blocos)
    numero_txt = None
    for bloco in blocos:
        match = NUMERO_RE.search(bloco["text"])
        if match:
            numero_txt = _so_digitos(match.group(1)).lstrip("0") or "0"
            break

    serie = None
    for bloco in blocos:
        match = SERIE_RE.search(bloco["text"])
        if match:
            serie = str(int(match.group(1)))
            break

    data_emissao = None
    ys_emissao = [b["y"] for b in blocos if "DATA DA EMISSÃO" in b["text"].upper() or "DATA DA EMISSAO" in b["text"].upper()]
    if ys_emissao:
        y0 = min(ys_emissao)
        for bloco in blocos:
            if 0 <= bloco["y"] - y0 <= 40:
                data_emissao = _data_iso(bloco["text"])
                if data_emissao:
                    break
    if not data_emissao:
        for bloco in blocos:
            if "EMISSÃO" in bloco["text"].upper() or "EMISSAO" in bloco["text"].upper():
                data_emissao = _data_iso(bloco["text"])
                if data_emissao:
                    break

    valor_total = None
    for bloco in blocos:
        if "V. TOTAL DA NOTA" in bloco["text"].upper() or "VALOR TOTAL DA NOTA" in bloco["text"].upper():
            for cand in blocos:
                if 0 <= cand["y"] - bloco["y"] <= 45 and cand["x"] > largura * 0.7:
                    valor_total = _numero_br(cand["text"])
                    if valor_total:
                        break
        if valor_total:
            break
    if valor_total is None:
        for bloco in blocos:
            if bloco["text"].startswith("R$"):
                valor_total = _numero_br(bloco["text"].replace("R$", "").strip().split()[0])
                if valor_total:
                    break

    itens = _parse_itens(blocos, tolerancia_linha)
    if not itens:
        raise ValueError("Não foi possível identificar os itens do DANFE")

    return {
        "numero": numero_txt,
        "serie": serie or "1",
        "chave_acesso": chave,
        "data_emissao": data_emissao,
        "fornecedor": {
            "cnpj": _cnpj_entre(blocos, "IDENTIFICAÇÃO DO EMITENTE", "DESTINATÁRIO")
                    or _cnpj_entre(blocos, "CNPJ / CPF", "DESTINATÁRIO"),
            "nome": _nome_emitente(blocos),
        },
        "valor_total": valor_total or 0.0,
        "itens": itens,
        "origem": origem,
    }
