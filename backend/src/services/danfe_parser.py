import re
from datetime import datetime

CNPJ_RE = re.compile(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}")
DATE_RE = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
SERIE_RE = re.compile(r"S[ée]rie\s+(\d+)", re.IGNORECASE)
NUMERO_RE = re.compile(r"N[ºo°.]+\s*([\d.]+)", re.IGNORECASE)
MONEY_RE = re.compile(r"^\d{1,3}(?:\.\d{3})*,\d{2}$")
QTD_RE = re.compile(r"^\d{1,6},\d{2}$")
NCM_RE = re.compile(r"^\d{8}$")

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
        if y0 < b["y"] < y0 + 80 and b["x"] < 400 and len(b["text"]) > 8
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


def _parse_itens(blocos: list[dict], largura: float) -> list[dict]:
    y_ini = min((b["y"] for b in blocos if "DADOS DOS PRODUTOS" in b["text"].upper()), default=None)
    y_fim = min((b["y"] for b in blocos if "DADOS ADICIONAIS" in b["text"].upper()), default=10**9)
    if y_ini is None:
        return []

    corpo = [b for b in blocos if y_ini < b["y"] < y_fim]
    linhas = _agrupar_linhas(corpo, tolerancia=22.0)
    itens = []

    for linha in linhas:
        linha = sorted(linha, key=lambda b: b["x"])
        textos = " ".join(b["text"] for b in linha).upper()
        if any(lab in textos for lab in LABELS_IGNORAR):
            continue

        codigo = None
        descricao_partes = []
        unidade = None
        ncm = None
        cfop = None
        quantidade = None
        valor_unitario = None
        valor_total = None

        for bloco in linha:
            x_rel = bloco["x"] / largura if largura else 0
            txt = bloco["text"].strip()

            if x_rel < 0.08 and codigo is None and re.match(r"^[A-Za-z0-9.\-]{1,20}$", txt):
                codigo = txt
                continue
            if 0.08 <= x_rel < 0.30 and not NCM_RE.match(txt) and not MONEY_RE.match(txt):
                descricao_partes.append(txt)
                continue
            if 0.30 <= x_rel < 0.38 and NCM_RE.match(txt):
                ncm = txt
                continue
            if 0.38 <= x_rel < 0.47:
                if txt.upper() in {"UNID", "UN", "KG", "CX", "PC", "MT", "M", "L"}:
                    unidade = txt
                elif re.fullmatch(r"\d{4}", txt):
                    cfop = txt
                continue
            if 0.47 <= x_rel < 0.53 and quantidade is None:
                quantidade = _numero_br(txt)
                continue
            if 0.53 <= x_rel < 0.62 and valor_unitario is None and _numero_br(txt) is not None:
                valor_unitario = _numero_br(txt)
                continue
            if 0.62 <= x_rel < 0.72 and valor_total is None and MONEY_RE.match(txt):
                valor_total = _numero_br(txt)

        descricao = " ".join(descricao_partes).strip()
        if not descricao:
            continue
        if quantidade is None:
            continue

        if valor_total is None and valor_unitario is not None:
            valor_total = round(quantidade * valor_unitario, 2)
        elif valor_unitario is None and valor_total is not None and quantidade:
            valor_unitario = round(valor_total / quantidade, 2)

        itens.append({
            "codigo_produto": codigo,
            "descricao": descricao,
            "gtin": None,
            "ncm": ncm,
            "cfop": cfop,
            "unidade": unidade or "UN",
            "quantidade": quantidade,
            "valor_unitario": valor_unitario or 0.0,
            "valor_total": valor_total or 0.0,
        })

    return itens


def parse_danfe_blocos(blocos: list[dict], largura: float = 1488.0) -> dict:
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

    itens = _parse_itens(blocos, largura)
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
        "origem": "ocr",
    }
