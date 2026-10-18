"""
Gera o Manual do Usuário do SaldoContratual em PDF.

Uso (na raiz do repositório):
    uv run --no-project --with reportlab python docs/manual/gerar_manual_usuario.py

Saída: docs/Manual_do_Usuario_SaldoContratual.pdf

O conteúdo está neste arquivo. Ao mudar uma tela ou regra de negócio,
atualize a seção correspondente e gere o PDF de novo.
"""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "docs" / "Manual_do_Usuario_SaldoContratual.pdf"
VERSAO = "Versão 1.0"
DATA_REVISAO = date.today().strftime("%d/%m/%Y")

# Cores da marca (tokens de frontend/src/index.css convertidos para RGB)
PRIMARIA = colors.HexColor("#1E9488")
PRIMARIA_ESCURA = colors.HexColor("#0E5A53")
PRIMARIA_CLARA = colors.HexColor("#E6F4F2")
TEXTO = colors.HexColor("#1F2328")
TEXTO_SUAVE = colors.HexColor("#5B6470")
BORDA = colors.HexColor("#D9DEE3")
FUNDO_SUAVE = colors.HexColor("#F5F7F8")
AVISO = colors.HexColor("#8A5300")
AVISO_FUNDO = colors.HexColor("#FDF3E1")
CRITICO = colors.HexColor("#B3261E")
CRITICO_FUNDO = colors.HexColor("#FCEBEA")
SUCESSO = colors.HexColor("#2F7D5B")
SUCESSO_FUNDO = colors.HexColor("#E7F4EE")
INFO_FUNDO = colors.HexColor("#EAF1FB")
INFO = colors.HexColor("#2B5797")


# ---------------------------------------------------------------- fontes ---

def _registrar_fontes() -> tuple[str, str]:
    """Usa Segoe UI/Arial (Windows) ou DejaVu (Linux); senão Helvetica."""
    candidatos = [
        ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ),
    ]
    for regular, negrito in candidatos:
        if os.path.exists(regular) and os.path.exists(negrito):
            pdfmetrics.registerFont(TTFont("Manual", regular))
            pdfmetrics.registerFont(TTFont("Manual-Bold", negrito))
            pdfmetrics.registerFontFamily(
                "Manual", normal="Manual", bold="Manual-Bold",
                italic="Manual", boldItalic="Manual-Bold",
            )
            return "Manual", "Manual-Bold"
    return "Helvetica", "Helvetica-Bold"


FONTE, FONTE_NEGRITO = _registrar_fontes()

# --------------------------------------------------------------- estilos ---

CORPO = ParagraphStyle(
    "corpo", fontName=FONTE, fontSize=10, leading=15, textColor=TEXTO,
    spaceAfter=6,
)
CORPO_SUAVE = ParagraphStyle("corpo_suave", parent=CORPO, textColor=TEXTO_SUAVE)
CELULA = ParagraphStyle("celula", parent=CORPO, fontSize=9, leading=12.5, spaceAfter=0)
CELULA_CAB = ParagraphStyle(
    "celula_cab", parent=CELULA, fontName=FONTE_NEGRITO, textColor=colors.white,
)
H1 = ParagraphStyle(
    "h1", fontName=FONTE_NEGRITO, fontSize=20, leading=25, textColor=PRIMARIA_ESCURA,
    spaceBefore=0, spaceAfter=4,
)
H2 = ParagraphStyle(
    "h2", fontName=FONTE_NEGRITO, fontSize=13, leading=17, textColor=TEXTO,
    spaceBefore=12, spaceAfter=5,
)
H3 = ParagraphStyle(
    "h3", fontName=FONTE_NEGRITO, fontSize=10.5, leading=14, textColor=PRIMARIA_ESCURA,
    spaceBefore=8, spaceAfter=3,
)
RESUMO_CAPITULO = ParagraphStyle(
    "resumo", parent=CORPO, fontSize=10.5, leading=15.5, textColor=TEXTO_SUAVE,
    spaceAfter=10,
)
ITEM_LISTA = ParagraphStyle("item", parent=CORPO, spaceAfter=3)
CAIXA_TITULO = ParagraphStyle(
    "caixa_titulo", parent=CORPO, fontName=FONTE_NEGRITO, fontSize=9.5, spaceAfter=2,
)
CAIXA_TEXTO = ParagraphStyle("caixa_texto", parent=CORPO, fontSize=9.5, leading=14, spaceAfter=0)
FLUXO = ParagraphStyle(
    "fluxo", parent=CORPO, fontName=FONTE_NEGRITO, fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=PRIMARIA_ESCURA, spaceAfter=0,
)
FLUXO_SUB = ParagraphStyle(
    "fluxo_sub", parent=CORPO, fontSize=8, leading=10.5, alignment=TA_CENTER,
    textColor=TEXTO_SUAVE, spaceAfter=0,
)
SETA = ParagraphStyle(
    "seta", parent=CORPO, fontName=FONTE_NEGRITO, fontSize=13, alignment=TA_CENTER,
    textColor=PRIMARIA, spaceAfter=0,
)
TITULO_SUMARIO = ParagraphStyle("titulo_sumario", parent=None, fontName=FONTE_NEGRITO,
                                fontSize=20, leading=25, textColor=PRIMARIA_ESCURA)
TOC_1 = ParagraphStyle(
    "toc1", fontName=FONTE_NEGRITO, fontSize=10, leading=15, spaceBefore=2, textColor=TEXTO,
    leftIndent=0,
)
TOC_2 = ParagraphStyle(
    "toc2", fontName=FONTE, fontSize=9, leading=12, textColor=TEXTO_SUAVE,
    leftIndent=16,
)


# ----------------------------------------------------- documento e páginas ---

class ManualDoc(BaseDocTemplate):
    """Documento com capa, sumário automático e rodapé numerado."""

    def __init__(self, caminho: str):
        super().__init__(
            caminho, pagesize=A4,
            leftMargin=20 * mm, rightMargin=20 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm,
            title="Manual do Usuário — SaldoContratual",
            author="SaldoContratual",
            subject="Manual do usuário",
        )
        largura, altura = A4
        frame = Frame(
            self.leftMargin, self.bottomMargin,
            largura - self.leftMargin - self.rightMargin,
            altura - self.topMargin - self.bottomMargin,
            id="normal",
        )
        self.addPageTemplates([
            PageTemplate(id="capa", frames=[frame], onPage=_desenhar_capa),
            PageTemplate(id="conteudo", frames=[frame], onPage=_desenhar_moldura),
        ])
        self._capitulo = 0

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        nome = flowable.style.name
        if nome == "h1":
            texto = flowable.getPlainText()
            chave = f"cap-{texto}"
            self.canv.bookmarkPage(chave)
            self.canv.addOutlineEntry(texto, chave, level=0)
            self.notify("TOCEntry", (0, texto, self.page, chave))
        elif nome == "h2":
            texto = flowable.getPlainText()
            chave = f"sec-{self.page}-{texto}"
            self.canv.bookmarkPage(chave)
            self.canv.addOutlineEntry(texto, chave, level=1, closed=True)
            self.notify("TOCEntry", (1, texto, self.page, chave))


def _desenhar_capa(canv, doc):
    largura, altura = A4
    canv.saveState()
    canv.setFillColor(PRIMARIA_ESCURA)
    canv.rect(0, altura * 0.42, largura, altura * 0.58, stroke=0, fill=1)
    canv.setFillColor(PRIMARIA)
    canv.rect(0, altura * 0.42 - 6 * mm, largura, 6 * mm, stroke=0, fill=1)

    # Selo simples da marca
    cx, cy = 20 * mm + 11 * mm, altura - 42 * mm
    canv.setFillColor(colors.white)
    canv.circle(cx, cy, 11 * mm, stroke=0, fill=1)
    canv.setFillColor(PRIMARIA_ESCURA)
    canv.setFont(FONTE_NEGRITO, 15)
    canv.drawCentredString(cx, cy - 5, "SC")

    canv.setFillColor(colors.white)
    canv.setFont(FONTE_NEGRITO, 12)
    canv.drawString(20 * mm + 26 * mm, cy - 4, "SaldoContratual")

    canv.setFont(FONTE_NEGRITO, 34)
    canv.drawString(20 * mm, altura * 0.62, "Manual do Usuário")
    canv.setFont(FONTE, 14)
    canv.setFillColor(colors.HexColor("#CFEAE6"))
    canv.drawString(20 * mm, altura * 0.62 - 12 * mm, "Gestão de saldos e itens de contratos")

    canv.setFillColor(TEXTO)
    canv.setFont(FONTE_NEGRITO, 11)
    canv.drawString(20 * mm, altura * 0.30, "Para quem é este manual")
    canv.setFont(FONTE, 10)
    canv.setFillColor(TEXTO_SUAVE)
    linhas = [
        "Operadores que importam notas fiscais e dão baixa no saldo dos contratos,",
        "gestores que cadastram fornecedores, contratos e aditivos,",
        "e administradores que liberam acessos e acompanham o log de usuários.",
    ]
    for i, linha in enumerate(linhas):
        canv.drawString(20 * mm, altura * 0.30 - (7 + i * 5.5) * mm, linha)

    canv.setStrokeColor(BORDA)
    canv.line(20 * mm, 30 * mm, largura - 20 * mm, 30 * mm)
    canv.setFont(FONTE, 9)
    canv.setFillColor(TEXTO_SUAVE)
    canv.drawString(20 * mm, 23 * mm, f"{VERSAO} · revisado em {DATA_REVISAO}")
    canv.drawRightString(largura - 20 * mm, 23 * mm, "Documento de uso interno")
    canv.restoreState()


def _desenhar_moldura(canv, doc):
    largura, _ = A4
    canv.saveState()
    canv.setStrokeColor(BORDA)
    canv.setLineWidth(0.6)
    canv.line(20 * mm, 14 * mm, largura - 20 * mm, 14 * mm)
    canv.setFont(FONTE, 8)
    canv.setFillColor(TEXTO_SUAVE)
    canv.drawString(20 * mm, 9.5 * mm, "SaldoContratual · Manual do Usuário")
    canv.drawRightString(largura - 20 * mm, 9.5 * mm, f"Página {doc.page}")
    canv.restoreState()


# ------------------------------------------------------ blocos de conteúdo ---

def p(texto: str, estilo: ParagraphStyle = CORPO) -> Paragraph:
    return Paragraph(texto, estilo)


def capitulo(numero: int, titulo: str, resumo: str) -> list:
    return [
        PageBreak(),
        p(f"{numero}. {titulo}", H1),
        Table(
            [[""]], colWidths=[24 * mm], rowHeights=[1.6 * mm],
            style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PRIMARIA)]),
            hAlign="LEFT",
        ),
        Spacer(1, 8),
        p(resumo, RESUMO_CAPITULO),
    ]


def secao(titulo: str) -> list:
    return [CondPageBreak(40 * mm), p(titulo, H2)]


def topicos(itens: list[str]) -> list:
    return [p(f"•&nbsp;&nbsp;{texto}", ParagraphStyle(
        "topico", parent=ITEM_LISTA, leftIndent=12, firstLineIndent=-9,
    )) for texto in itens]


def passos(itens: list[str]) -> Table:
    """Lista numerada com marcador circular."""
    linhas = []
    for indice, texto in enumerate(itens, start=1):
        selo = Table(
            [[p(f"<b>{indice}</b>", ParagraphStyle(
                "num", parent=CELULA, alignment=TA_CENTER, textColor=colors.white,
                fontName=FONTE_NEGRITO, leading=10,
            ))]],
            colWidths=[5.5 * mm], rowHeights=[5.5 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARIA),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]),
        )
        linhas.append([
            selo,
            p(texto, ParagraphStyle("passo", parent=CORPO, spaceAfter=0)),
        ])
    tabela = Table(linhas, colWidths=[7 * mm, None], hAlign="LEFT")
    estilo = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
    ]
    tabela.setStyle(TableStyle(estilo))
    return KeepTogether([tabela, Spacer(1, 6)])


_CAIXAS = {
    "dica": ("Dica", SUCESSO, SUCESSO_FUNDO),
    "atencao": ("Atenção", AVISO, AVISO_FUNDO),
    "importante": ("Importante", CRITICO, CRITICO_FUNDO),
    "permissao": ("Quem pode", INFO, INFO_FUNDO),
    "exemplo": ("Exemplo", PRIMARIA_ESCURA, PRIMARIA_CLARA),
}


def caixa(tipo: str, texto: str, titulo: str | None = None) -> list:
    rotulo, cor, fundo = _CAIXAS[tipo]
    conteudo = [
        p(titulo or rotulo, ParagraphStyle("ct", parent=CAIXA_TITULO, textColor=cor)),
        p(texto, CAIXA_TEXTO),
    ]
    tabela = Table([[conteudo]], colWidths=["100%"])
    tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fundo),
        ("LINEBEFORE", (0, 0), (0, -1), 3, cor),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [Spacer(1, 2), KeepTogether(tabela), Spacer(1, 8)]


def tabela(cabecalho: list[str], linhas: list[list[str]], larguras: list[float]) -> list:
    dados = [[p(c, CELULA_CAB) for c in cabecalho]]
    dados += [[p(c, CELULA) for c in linha] for linha in linhas]
    t = Table(dados, colWidths=[l * mm for l in larguras], repeatRows=1, hAlign="LEFT")
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARIA_ESCURA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, BORDA),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(dados)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), FUNDO_SUAVE))
    t.setStyle(TableStyle(estilo))
    return [t, Spacer(1, 10)]


def fluxo(etapas: list[tuple[str, str]]) -> list:
    """Diagrama horizontal de etapas ligadas por setas."""
    linha: list = []
    larguras: list[float] = []
    disponivel = 170 * mm
    seta = 7 * mm
    caixa_larg = (disponivel - seta * (len(etapas) - 1)) / len(etapas)
    for indice, (titulo, sub) in enumerate(etapas):
        linha.append([p(titulo, FLUXO), Spacer(1, 2), p(sub, FLUXO_SUB)])
        larguras.append(caixa_larg)
        if indice < len(etapas) - 1:
            linha.append(p("›", SETA))
            larguras.append(seta)
    t = Table([linha], colWidths=larguras, hAlign="LEFT")
    estilo = [("VALIGN", (0, 0), (-1, -1), "MIDDLE")]
    for coluna in range(0, len(linha), 2):
        estilo += [
            ("BACKGROUND", (coluna, 0), (coluna, 0), PRIMARIA_CLARA),
            ("BOX", (coluna, 0), (coluna, 0), 0.8, PRIMARIA),
            ("TOPPADDING", (coluna, 0), (coluna, 0), 8),
            ("BOTTOMPADDING", (coluna, 0), (coluna, 0), 8),
        ]
    t.setStyle(TableStyle(estilo))
    return [Spacer(1, 4), KeepTogether(t), Spacer(1, 12)]


# --------------------------------------------------------------- conteúdo ---

def conteudo() -> list:
    historia: list = [NextPageTemplate("conteudo"), PageBreak()]

    # Sumário
    historia.append(p("Sumário", TITULO_SUMARIO))
    historia.append(Spacer(1, 10))
    sumario = TableOfContents()
    sumario.levelStyles = [TOC_1, TOC_2]
    sumario.dotsMinLevel = 0
    sumario.tableStyle = TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ])
    historia.append(sumario)

    # 1 -------------------------------------------------------------------
    historia += capitulo(
        1, "Apresentação",
        "O SaldoContratual controla quanto ainda resta de cada item dos contratos, em "
        "quantidade e em reais, a partir das notas fiscais que os fornecedores emitem.",
    )
    historia += secao("O que o sistema controla")
    historia.append(p(
        "O “estoque” do SaldoContratual é o <b>saldo dos itens do contrato</b>. Quando o "
        "contrato é cadastrado, cada item começa com saldo igual à quantidade contratada. "
        "Cada nota fiscal baixada desconta desse saldo a quantidade entregue e, na mesma "
        "proporção, o valor em reais."
    ))
    historia += caixa(
        "exemplo",
        "Contrato de 12 meses com 1 item de 100 unidades a R$ 10,00. O item começa com "
        "100 unidades e R$ 1.000,00 de saldo. Após baixar uma nota com 10 unidades, "
        "restam 90 unidades e R$ 900,00.",
    )
    historia += secao("Ciclo de trabalho")
    historia.append(p(
        "O uso do sistema segue sempre a mesma sequência. Os capítulos seguintes "
        "detalham cada etapa."
    ))
    historia += fluxo([
        ("Fornecedor", "cadastro do credor"),
        ("Contrato", "itens, valores e vigência"),
        ("Nota fiscal", "importar ou digitar"),
        ("Vínculos", "item da NF → item do contrato"),
        ("Baixa", "desconta o saldo"),
    ])
    historia += secao("Menu principal")
    historia += tabela(
        ["Menu", "Para que serve"],
        [
            ["Dashboard", "Visão geral: valor contratado, saldo disponível, baixas do mês, alertas de esgotamento e de fim de vigência."],
            ["Fornecedores", "Cadastro dos credores (CPF ou CNPJ) usados nos contratos."],
            ["Contratos", "Cadastro de contratos e itens, PDF do contrato, edição e aditivos."],
            ["Notas Fiscais", "Importação (XML/PDF) ou digitação de notas, conferência de vínculos, baixa, edição, estorno e exclusão."],
            ["Estornos e exclusões", "Histórico de baixas desfeitas e notas excluídas, com responsável e motivo."],
            ["Relatórios", "Relatório de Saldo de Contrato, pronto para imprimir ou salvar em PDF."],
            ["Log de usuários", "Registro de inclusões, alterações e exclusões feitas por cada usuário (somente administrador)."],
            ["Admin", "Cadastro de usuários, perfis e permissões (somente administrador)."],
        ],
        [42, 128],
    )

    # 2 -------------------------------------------------------------------
    historia += capitulo(
        2, "Acesso ao sistema",
        "Como entrar, sair, trocar a senha e ajustar a aparência da tela.",
    )
    historia += secao("Entrar")
    historia.append(passos([
        "Abra o endereço do sistema no navegador (Chrome, Edge ou Firefox atualizados).",
        "Informe o <b>e-mail</b> e a <b>senha</b> cadastrados pelo administrador.",
        "Clique em <b>Entrar</b>. O sistema abre o Dashboard.",
    ]))
    historia += caixa(
        "atencao",
        "Depois de <b>5 tentativas erradas</b> com o mesmo e-mail em 15 minutos, o acesso "
        "fica bloqueado temporariamente. Aguarde 15 minutos e tente de novo, ou peça ao "
        "administrador para conferir seu cadastro.",
    )
    historia += caixa(
        "dica",
        "Não existe cadastro público nem “esqueci minha senha”. Novos acessos e "
        "redefinição de senha são feitos pelo administrador, na tela <b>Admin</b>.",
    )
    historia += secao("Configurações da conta")
    historia.append(p(
        "Clique no seu nome, no rodapé do menu lateral, e escolha <b>Configurações</b>."
    ))
    historia += topicos([
        "<b>Meu perfil</b>: altere nome e e-mail e veja as permissões liberadas para a sua "
        "conta (somente leitura).",
        "<b>Senha</b>: informe a senha atual, a nova senha (mínimo de 8 caracteres) e a "
        "confirmação.",
    ])
    historia += secao("Aparência e saída")
    historia += topicos([
        "Em <b>Aparência</b>, no menu lateral, escolha <b>Claro</b>, <b>Escuro</b> ou "
        "<b>Sistema</b> (segue o tema do computador).",
        "Para sair, clique no seu nome no rodapé do menu e escolha <b>Sair</b>. Em "
        "computadores compartilhados, sempre saia ao terminar.",
        "Em celulares, o menu fica recolhido no ícone do canto superior e as tabelas "
        "rolam para o lado.",
    ])

    # 3 -------------------------------------------------------------------
    historia += capitulo(
        3, "Perfis e permissões",
        "O que cada tipo de usuário pode fazer. Se um botão descrito neste manual não "
        "aparece para você, provavelmente sua conta não tem a permissão correspondente.",
    )
    historia += tabela(
        ["Ação", "Operador", "Operador com permissão", "Administrador"],
        [
            ["Consultar dashboard, fornecedores, contratos, notas e relatórios", "Sim", "Sim", "Sim"],
            ["Importar ou digitar nota fiscal, conferir vínculos e dar baixa", "Sim", "Sim", "Sim"],
            ["Editar nota fiscal ainda não baixada", "Sim", "Sim", "Sim"],
            ["Cadastrar e editar contratos, aplicar aditivo, anexar PDF", "Não", "Com “Gerir contratos”", "Sim"],
            ["Estornar baixa e excluir nota fiscal", "Não", "Com “Estornar”", "Sim"],
            ["Cadastrar e editar fornecedores", "Não", "Não", "Sim"],
            ["Cadastrar usuários e liberar permissões", "Não", "Não", "Sim"],
            ["Consultar o Log de usuários", "Não", "Não", "Sim"],
        ],
        [70, 25, 40, 35],
    )
    historia += caixa(
        "permissao",
        "As permissões extras do operador — <b>Gerir contratos</b> e <b>Estornar</b> — "
        "são marcadas pelo administrador no cadastro do usuário (capítulo 10). Você pode "
        "conferir as suas em <b>Configurações › Meu perfil</b>.",
    )

    # 4 -------------------------------------------------------------------
    historia += capitulo(
        4, "Dashboard",
        "A tela inicial resume a execução dos contratos ativos e aponta o que precisa "
        "de atenção.",
    )
    historia += secao("Indicadores")
    historia += tabela(
        ["Indicador", "O que mostra"],
        [
            ["Valor contratado", "Soma do valor dos contratos ativos."],
            ["Saldo disponível", "Quanto ainda pode ser consumido, em reais, nos contratos ativos."],
            ["Baixas neste mês", "Valor baixado a partir de notas fiscais no mês corrente."],
            ["Contratos ativos", "Quantidade de contratos ativos e quantos encerram em até 90 dias."],
        ],
        [45, 125],
    )
    historia += secao("Gráfico e alertas")
    historia += topicos([
        "<b>Execução financeira dos contratos ativos</b>: evolução mensal do valor baixado.",
        "<b>Risco de esgotamento (45 dias)</b>: itens cujo saldo deve acabar em até 45 "
        "dias, calculado pelo ritmo de consumo. Itens com 15 dias ou menos aparecem em "
        "vermelho.",
        "<b>Vigências a encerrar em até 90 dias</b>: contratos ativos próximos do fim da "
        "vigência — hora de providenciar aditivo ou nova contratação.",
    ])

    # 5 -------------------------------------------------------------------
    historia += capitulo(
        5, "Fornecedores",
        "Os fornecedores (credores) precisam estar cadastrados antes dos contratos.",
    )
    historia += caixa("permissao", "Somente o <b>administrador</b> cadastra e edita fornecedores. Os demais usuários consultam.")
    historia += secao("Cadastrar fornecedor")
    historia.append(passos([
        "Acesse <b>Fornecedores</b> e clique em <b>Novo Fornecedor</b>.",
        "Preencha <b>Razão social</b> e <b>CPF/CNPJ</b> (obrigatórios). O sistema confere "
        "os dígitos verificadores e formata o número.",
        "Opcionalmente, informe <b>Nome fantasia</b>, <b>Estado (UF)</b> e "
        "<b>Município</b>. A lista de municípios é carregada depois de escolher a UF.",
        "Clique em <b>Salvar fornecedor</b>.",
    ]))
    historia += caixa(
        "atencao",
        "Não é possível cadastrar dois fornecedores com o mesmo CPF/CNPJ. O sistema "
        "compara só os números, sem pontos ou barras.",
    )
    historia += secao("Consultar e editar")
    historia += topicos([
        "Use a busca por razão social, CPF/CNPJ ou município e o filtro <b>Ativos</b> / "
        "<b>Inativos</b> / <b>Todos</b>.",
        "Para corrigir dados, clique em <b>Editar</b> na linha do fornecedor.",
    ])

    # 6 -------------------------------------------------------------------
    historia += capitulo(
        6, "Contratos",
        "Cadastro do contrato e dos seus itens. É aqui que nasce o saldo que as notas "
        "fiscais vão consumir.",
    )
    historia += caixa(
        "permissao",
        "Cadastrar, editar, anexar PDF e aplicar aditivo: <b>administrador</b> ou "
        "operador com a permissão <b>Gerir contratos</b>. Todos os usuários consultam.",
    )
    historia += secao("Cadastrar contrato")
    historia.append(passos([
        "Acesse <b>Contratos</b> e clique em <b>Novo Contrato</b>.",
        "Escolha o <b>Fornecedor</b> e informe <b>Número do contrato</b> e <b>Objeto do "
        "contrato</b>.",
        "Informe a <b>vigência inicial</b> e a <b>vigência final</b> (obrigatórias) e a "
        "<b>Situação</b> (Ativo ou Encerrado).",
        "Se houver, preencha <b>Número da licitação</b>, <b>Modalidade</b> e "
        "<b>Observação</b>.",
        "Opcionalmente, anexe o <b>PDF do contrato</b>.",
        "Inclua os itens (veja abaixo) e clique em <b>Salvar Contrato</b>.",
    ]))
    historia += secao("Itens do contrato")
    historia.append(p("Cada item tem os campos abaixo. O sistema mostra o <b>valor total</b> do item "
                      "(quantidade × valor unitário) e o <b>total do contrato</b>."))
    historia += tabela(
        ["Campo", "Descrição"],
        [
            ["Item", "Número do item no contrato (preenchido em sequência; pode ser ajustado)."],
            ["Descrição *", "Descrição do item como está no contrato."],
            ["Unidade *", "Unidade de medida (UN, CX, KG, L...). Em unidades inteiras, como UN, não se aceita quantidade fracionada."],
            ["Quantidade *", "Quantidade contratada. É o saldo inicial do item."],
            ["Marca", "Marca ofertada, se houver."],
            ["Valor unitário *", "Valor por unidade, em reais."],
            ["Observação", "Informação livre sobre o item."],
            ["Descrição do fornecedor (na NF)", "Opcional. Como o fornecedor escreve esse item na nota fiscal, quando é diferente da descrição do contrato. Melhora o vínculo automático (capítulo 7)."],
        ],
        [48, 122],
    )
    historia += caixa(
        "dica",
        "Preencha a <b>Descrição do fornecedor</b> sempre que a nota trouxer o produto com "
        "outro nome — por exemplo, contrato “Papel sulfite A4 75g” e nota “PAPEL CHAMEX A4 "
        "75G C/500”. Na importação, o sistema procura primeiro por essa descrição.",
        "Dica: descrição do fornecedor",
    )
    historia += secao("Importar itens por planilha")
    historia.append(p(
        "Para contratos com muitos itens, use a planilha modelo em vez de digitar."
    ))
    historia.append(passos([
        "No formulário do contrato, clique em <b>Baixar modelo</b>.",
        "Preencha a planilha sem alterar o cabeçalho. As colunas obrigatórias, nesta "
        "ordem, são: <b>Item, Descrição, Unidade, Quantidade, Marca, Valor_unitário, "
        "Observação</b>.",
        "Se quiser, acrescente depois delas a coluna opcional <b>Descrição_fornecedor</b>.",
        "Clique em <b>Importar planilha</b> e escolha o arquivo <b>.xlsx</b>.",
        "Revise os itens carregados e salve o contrato.",
    ]))
    historia += caixa(
        "atencao",
        "Só é aceito o modelo em Excel (<b>.xlsx</b>). Arquivos CSV ou com cabeçalho "
        "diferente são recusados com a mensagem “Planilha fora do modelo”. Valores no "
        "formato brasileiro (1.234,56) são aceitos. No cadastro, a planilha substitui as "
        "linhas em branco; na edição, os itens são acrescentados aos existentes.",
    )
    historia += secao("Consultar contratos")
    historia += topicos([
        "A lista mostra fornecedor, valor total, <b>saldo atual</b> em reais, barra de "
        "consumo e situação. Contratos com aditivo exibem a marca “Com aditivo”.",
        "Busque por número, objeto, licitação ou fornecedor e filtre por <b>Ativos</b>, "
        "<b>Encerrados</b> ou <b>Todos</b>.",
        "Clique na seta da linha para ver os itens, ou em <b>Visualizar</b> para abrir o "
        "painel de detalhe com dados do contrato, itens (com filtro) e o PDF anexado "
        "(visualizar ou baixar).",
    ])
    historia += secao("Editar contrato")
    historia.append(p(
        "Clique em <b>Editar</b> na linha do contrato. É possível alterar o cabeçalho e "
        "os itens, respeitando duas regras:"
    ))
    historia += topicos([
        "A quantidade de um item <b>não pode ficar menor do que a já baixada</b>.",
        "Item que já teve baixa <b>não pode ser removido</b>.",
    ])
    historia += caixa(
        "dica",
        "Para acrescentar quantidade a itens existentes por termo aditivo, use o botão "
        "<b>Aditivo</b>, e não a edição. Assim o sistema guarda o histórico e a vigência "
        "do aditivo e o relatório mostra o valor aditivado separado do original.",
    )
    historia += secao("Aplicar aditivo")
    historia.append(passos([
        "Na linha do contrato, clique em <b>Aditivo</b>.",
        "Marque os itens que entram no aditivo.",
        "Para cada item marcado, informe a <b>quantidade extra</b> (maior que zero) e o "
        "<b>valor unitário</b>.",
        "Informe a <b>vigência do aditivo</b> (data inicial e final — obrigatória).",
        "Confirme. A quantidade extra é somada ao contratado e ao saldo do item.",
    ]))
    historia += caixa(
        "exemplo",
        "Se a data final do aditivo for posterior à do contrato, a vigência do contrato "
        "é prorrogada automaticamente. A quantidade inicial do contrato fica guardada "
        "para comparação no relatório.",
        "Prorrogação",
    )

    # 7 -------------------------------------------------------------------
    historia += capitulo(
        7, "Notas fiscais",
        "Entrada das notas, ligação de cada item da nota a um item do contrato e baixa "
        "do saldo.",
    )
    historia += secao("Visão geral do fluxo")
    historia += fluxo([
        ("Nova nota", "XML, PDF ou digitação"),
        ("Pendente", "aguarda conferência"),
        ("Conferir vínculos", "ajustar se preciso"),
        ("Executar baixa", "desconta o saldo"),
        ("Baixada", "pode ser estornada"),
    ])
    historia += tabela(
        ["Situação", "Significado", "Ações disponíveis"],
        [
            ["Pendente", "Nota registrada, saldo ainda não descontado.", "Conferir vínculos, Executar baixa, Editar, Excluir, Baixar PDF"],
            ["Baixada", "Saldo já descontado do contrato.", "Baixar PDF, Estornar baixa"],
            ["Estornada", "Baixa desfeita; o saldo voltou ao contrato.", "Editar, Excluir ou baixar de novo"],
        ],
        [28, 70, 72],
    )
    historia += secao("Importar nota por XML ou PDF")
    historia.append(passos([
        "Acesse <b>Notas Fiscais</b> e clique em <b>Nova nota fiscal</b>.",
        "Escolha <b>Importar XML ou PDF</b> e selecione o <b>contrato de origem do "
        "saldo</b>.",
        "Envie o arquivo <b>XML</b> da NF-e ou o <b>PDF do DANFE</b>. O sistema lê "
        "número, fornecedor, valor total e itens.",
        "Confira a tabela de vínculos: cada linha mostra o item da nota, o item do "
        "contrato sugerido e o nível de confiança.",
        "Corrija qualquer vínculo escolhendo o item certo na lista. Todos os itens "
        "precisam estar vinculados.",
        "Clique em <b>Confirmar Importação</b>. A nota fica <b>Pendente</b>, aguardando a baixa.",
    ]))
    historia += caixa(
        "dica",
        "Prefira o <b>XML</b> sempre que tiver. A leitura é exata. O PDF é lido por "
        "reconhecimento de texto (OCR); a primeira leitura pode levar cerca de 20 "
        "segundos e o resultado deve ser conferido com atenção.",
    )
    historia += secao("Como o sistema sugere os vínculos")
    historia.append(p(
        "Para cada item da nota, o sistema procura o item do contrato correspondente "
        "nesta ordem:"
    ))
    historia.append(passos([
        "<b>Código do produto</b> ou <b>GTIN</b> (código de barras) iguais.",
        "<b>Descrição do fornecedor</b> cadastrada no item do contrato, comparada com a "
        "descrição da nota.",
        "Se nada disso chegar a “Provável”, compara também com a <b>descrição do "
        "contrato</b> e fica com o melhor resultado.",
    ]))
    historia.append(p(
        "Abaixo da confiança aparece o critério usado — por exemplo, “pela descrição do "
        "fornecedor”."
    ))
    historia += tabela(
        ["Confiança", "Quando aparece", "O que fazer"],
        [
            ["Confirmado", "Código/GTIN iguais ou descrição 95% ou mais parecida.", "Normalmente nada."],
            ["Provável", "Descrição entre 85% e 95% parecida.", "Dar uma olhada rápida."],
            ["Sugerido", "Descrição entre 55% e 85% parecida.", "Conferir com cuidado."],
            ["Não identificado", "Nenhum item parecido o bastante.", "Escolher o item manualmente."],
            ["Manual", "Vínculo escolhido pelo usuário.", "—"],
        ],
        [32, 80, 58],
    )
    historia += caixa(
        "dica",
        "Se um fornecedor sempre descreve um item de forma diferente e o vínculo vem "
        "como “Sugerido” ou “Não identificado”, peça a quem gere contratos para "
        "preencher a <b>Descrição do fornecedor</b> desse item. Nas próximas notas o "
        "vínculo sai como “Confirmado”.",
    )
    historia += secao("Incluir nota manualmente")
    historia.append(p("Use quando não houver XML nem PDF da nota."))
    historia.append(passos([
        "Clique em <b>Nova nota fiscal</b> e escolha <b>Incluir manualmente</b>.",
        "Selecione o contrato. O fornecedor é preenchido a partir dele.",
        "Informe número, série, data de emissão e, se tiver, a chave de acesso (44 "
        "dígitos).",
        "Inclua os itens: descrição, quantidade, unidade, valor unitário e o item do "
        "contrato vinculado.",
        "Clique em <b>Salvar nota fiscal</b>. Ela fica <b>Pendente</b>.",
    ]))
    historia += secao("Conferir vínculos")
    historia.append(p(
        "Em uma nota pendente, clique em <b>Conferir vínculos</b> para revisar ou trocar "
        "o item do contrato de cada linha antes da baixa. As listas mostram descrição, "
        "marca, valor unitário e saldo de cada item do contrato."
    ))
    historia += secao("Executar baixa")
    historia.append(passos([
        "Na nota pendente, clique em <b>Executar baixa</b>.",
        "Confira, item a item, o <b>saldo após a baixa</b>.",
        "Se quiser, escreva uma <b>justificativa</b> (por exemplo, nota emitida em "
        "atraso).",
        "Clique em <b>Confirmar baixa</b>. O saldo é descontado e a nota passa a "
        "<b>Baixada</b>.",
    ]))
    historia += caixa(
        "importante",
        "A baixa é “tudo ou nada”: se algum item não tiver saldo suficiente, nenhum item "
        "é baixado e aparece a mensagem <b>“Operação abortada: Saldo Insuficiente”</b>. "
        "Verifique o vínculo ou providencie um aditivo antes de tentar de novo.",
    )
    historia += secao("Editar, estornar, excluir e baixar o PDF")
    historia.append(p("Use o botão <b>⋯ (Mais ações)</b> na linha da nota."))
    historia += tabela(
        ["Ação", "Quando", "Efeito"],
        [
            ["Baixar PDF", "Sempre que a nota foi importada com arquivo.", "Baixa o PDF/XML original, mesmo depois da baixa."],
            ["Editar", "Nota não baixada.", "Regrava cabeçalho e itens por inteiro."],
            ["Estornar baixa", "Nota baixada. Requer permissão “Estornar”.", "Devolve o saldo ao contrato e registra uma movimentação de estorno. Exige justificativa."],
            ["Excluir", "Nota não baixada. Requer permissão “Estornar”.", "Tira a nota das listagens. Exige motivo. Fica registrada em Estornos e exclusões."],
        ],
        [30, 55, 85],
    )
    historia += caixa(
        "atencao",
        "Para corrigir uma nota já baixada, primeiro <b>estorne a baixa</b>. Depois a nota "
        "pode ser editada, excluída ou baixada de novo.",
    )

    # 8 -------------------------------------------------------------------
    historia += capitulo(
        8, "Estornos e exclusões",
        "Histórico das baixas desfeitas e das notas excluídas.",
    )
    historia += topicos([
        "Cada registro mostra a nota, o fornecedor, a data, o <b>responsável</b> e o "
        "<b>motivo</b> informado.",
        "Filtre por <b>Estornadas</b>, <b>Excluídas</b> ou <b>Todas</b> e busque por "
        "número, fornecedor, chave ou motivo.",
        "Notas excluídas não voltam para a lista de notas fiscais, mas continuam "
        "registradas aqui para auditoria.",
    ])

    # 9 -------------------------------------------------------------------
    historia += capitulo(
        9, "Relatórios",
        "O Relatório de Saldo de Contrato mostra, item a item, o contratado, o "
        "aditivado, o utilizado e o saldo.",
    )
    historia += secao("Gerar o relatório")
    historia.append(passos([
        "Acesse <b>Relatórios</b>.",
        "Escolha a <b>Situação</b> (Ativos, Encerrados ou Todas), o <b>Credor</b> e o "
        "<b>Contrato</b> — ou deixe “Todos”.",
        "Se precisar, abra <b>Filtros avançados</b> para filtrar por <b>vigência final "
        "até</b> uma data ou por palavras do <b>objeto do contrato</b>.",
        "Clique em <b>Visualizar relatório</b>.",
        "Use <b>Imprimir / Salvar PDF</b> para imprimir ou gerar o arquivo.",
    ]))
    historia += secao("Conteúdo do relatório")
    historia += topicos([
        "Cabeçalho com o órgão emitente, número do contrato, CNPJ/CPF do contratado, "
        "licitação, modalidade, objeto, vigência e, quando houver, a <b>vigência do(s) "
        "aditivo(s)</b>.",
        "Valores do contrato: contratado, aditivado, <b>vigente</b>, utilizado e saldo "
        "disponível.",
        "Tabela dos itens com percentual de utilização e um <b>resumo consolidado</b> "
        "quando vários contratos são listados.",
    ])
    historia += caixa(
        "dica",
        "No modo escuro, a pré-visualização continua em fundo branco para mostrar a "
        "folha A4 exatamente como será impressa.",
    )

    # 10 ------------------------------------------------------------------
    historia += capitulo(
        10, "Administração",
        "Cadastro de usuários, liberação de permissões e acompanhamento do que cada "
        "usuário fez. Disponível somente para administradores.",
    )
    historia += secao("Cadastrar usuário")
    historia.append(passos([
        "Acesse <b>Admin</b> e clique em <b>Novo usuário</b>.",
        "Informe <b>nome completo</b>, <b>e-mail</b> e <b>senha</b> (mínimo de 8 "
        "caracteres, com confirmação).",
        "Escolha o perfil: <b>Administrador</b> ou <b>Operador</b>.",
        "Para operadores, marque as permissões extras, se for o caso: <b>Gerir "
        "contratos</b> (cadastro, edição, aditivo e PDF do contrato) e <b>Estornar</b> "
        "(desfazer baixas e excluir notas).",
        "Deixe <b>Ativo</b> marcado e salve. Informe a senha ao usuário por um canal "
        "seguro.",
    ]))
    historia += secao("Editar, desativar ou excluir")
    historia += topicos([
        "Na linha do usuário, use <b>Editar</b> para trocar dados, perfil, "
        "permissões ou definir nova senha, e <b>Excluir</b> para remover o acesso.",
        "Desmarque <b>Ativo</b> para bloquear o acesso sem apagar o histórico do usuário.",
        "Não é possível excluir a própria conta nem o último administrador.",
    ])
    historia += secao("Log de usuários")
    historia.append(p(
        "Lista as inclusões, alterações e exclusões feitas no sistema: notas fiscais "
        "(inclusão, importação, edição, vínculos, baixa, estorno e exclusão), contratos "
        "(cadastro, edição, aditivo e PDF), fornecedores e usuários."
    ))
    historia += topicos([
        "Cada registro traz data, usuário, operação, tabela, registro afetado e detalhe.",
        "Filtre por operação (<b>Inclusões</b>, <b>Alterações</b>, <b>Exclusões</b>) e "
        "por tabela, e busque por usuário, registro ou detalhe.",
    ])

    # 11 ------------------------------------------------------------------
    historia += capitulo(
        11, "Dúvidas frequentes",
        "Mensagens comuns e como resolver.",
    )
    historia += tabela(
        ["Situação", "Causa provável e solução"],
        [
            ["Não vejo os botões Novo Contrato, Editar ou Aditivo.", "Sua conta não tem a permissão “Gerir contratos”. Peça ao administrador."],
            ["Não vejo Estornar baixa ou Excluir na nota.", "Sua conta não tem a permissão “Estornar”."],
            ["“Operação abortada: Saldo Insuficiente” na baixa.", "Algum item da nota tem quantidade maior que o saldo do item do contrato. Confira o vínculo; se estiver certo, é preciso um aditivo."],
            ["Item da nota vem como “Não identificado”.", "Escolha o item manualmente. Para as próximas notas, cadastre a Descrição do fornecedor no item do contrato."],
            ["“Planilha fora do modelo”.", "Baixe o modelo de novo e preencha sem alterar o cabeçalho. Só .xlsx é aceito."],
            ["Não consigo reduzir a quantidade de um item.", "A quantidade não pode ficar abaixo do que já foi baixado."],
            ["Não consigo remover um item do contrato.", "Itens que já tiveram baixa não podem ser removidos."],
            ["A leitura do PDF trouxe dados errados.", "O DANFE em PDF é lido por OCR. Corrija os vínculos, use o XML se tiver, ou inclua a nota manualmente."],
            ["Acesso bloqueado após errar a senha.", "Aguarde 15 minutos. Se esqueceu a senha, peça ao administrador uma nova."],
            ["Preciso corrigir uma nota já baixada.", "Estorne a baixa (permissão “Estornar”), corrija e baixe de novo."],
        ],
        [62, 108],
    )

    historia += secao("Glossário")
    historia += tabela(
        ["Termo", "Significado"],
        [
            ["Saldo", "Quantidade (e valor) ainda disponível em um item do contrato."],
            ["Baixa", "Desconto do saldo do contrato a partir de uma nota fiscal."],
            ["Estorno", "Desfazer uma baixa, devolvendo o saldo ao contrato."],
            ["Vínculo", "Ligação entre um item da nota fiscal e um item do contrato."],
            ["Aditivo", "Acréscimo de quantidade e/ou prorrogação de vigência de itens do contrato."],
            ["DANFE", "Documento auxiliar (PDF impresso) da NF-e."],
            ["XML da NF-e", "Arquivo eletrônico oficial da nota fiscal; leitura mais confiável."],
            ["GTIN", "Código de barras do produto, quando informado na nota."],
            ["Credor", "Fornecedor contratado."],
        ],
        [35, 135],
    )
    return historia


def gerar(caminho: Path = SAIDA) -> Path:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    doc = ManualDoc(str(caminho))
    historia = [Spacer(1, 1)] + conteudo()
    doc.multiBuild(historia)
    return caminho


if __name__ == "__main__":
    destino = gerar()
    print(f"Manual gerado em {destino}")
