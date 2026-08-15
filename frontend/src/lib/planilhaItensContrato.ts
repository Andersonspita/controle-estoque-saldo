import * as XLSX from "xlsx"

export type ItemPlanilhaContrato = {
  codigo: string
  descricao: string
  unidade: string
  quantidade_contratada: number
  valor_unitario: number
}

function normalizarCabecalho(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function chaveCampo(cabecalho: string): keyof ItemPlanilhaContrato | null {
  const n = normalizarCabecalho(cabecalho)
  if (["descricao", "item", "produto", "nome", "especificacao"].includes(n)) return "descricao"
  if (n === "codigo" || n === "cod" || n === "codigo item") return "codigo"
  if (["unidade", "und", "un", "um"].includes(n)) return "unidade"
  if (
    n.includes("quantidade") ||
    n === "qtd" ||
    n === "qtde" ||
    n === "qtd contratada"
  ) {
    return "quantidade_contratada"
  }
  if (
    (n.includes("valor") || n.includes("preco")) &&
    !n.includes("total")
  ) {
    return "valor_unitario"
  }
  return null
}

export function parseNumeroPlanilha(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor
  const texto = String(valor ?? "").trim()
  if (!texto) return 0
  const negativo = texto.startsWith("-")
  const limpo = texto.replace(/[^\d,.-]/g, "")
  let numero: number
  if (limpo.includes(",") && limpo.includes(".")) {
    numero = parseFloat(limpo.replace(/\./g, "").replace(",", "."))
  } else if (limpo.includes(",")) {
    numero = parseFloat(limpo.replace(",", "."))
  } else {
    numero = parseFloat(limpo)
  }
  if (!Number.isFinite(numero)) return 0
  return negativo && numero > 0 ? -numero : numero
}

export function mapearLinhasPlanilha(linhas: unknown[][]): ItemPlanilhaContrato[] {
  if (!linhas.length) return []
  const cabecalhos = (linhas[0] || []).map((c) => String(c ?? ""))
  const indices: Partial<Record<keyof ItemPlanilhaContrato, number>> = {}
  cabecalhos.forEach((cabecalho, index) => {
    const campo = chaveCampo(cabecalho)
    if (campo && indices[campo] === undefined) indices[campo] = index
  })
  if (indices.descricao === undefined) {
    throw new Error(
      "A planilha precisa de uma coluna de descrição (Descrição, Item ou Produto).",
    )
  }

  const itens: ItemPlanilhaContrato[] = []
  for (const linha of linhas.slice(1)) {
    if (!linha || linha.every((celula) => String(celula ?? "").trim() === "")) continue
    const descricao = String(linha[indices.descricao] ?? "").trim()
    if (!descricao) continue
    const quantidade = parseNumeroPlanilha(
      indices.quantidade_contratada !== undefined ? linha[indices.quantidade_contratada] : 1,
    )
    const valor = parseNumeroPlanilha(
      indices.valor_unitario !== undefined ? linha[indices.valor_unitario] : 0,
    )
    const unidadeRaw =
      indices.unidade !== undefined ? String(linha[indices.unidade] ?? "").trim() : ""
    itens.push({
      codigo:
        indices.codigo !== undefined ? String(linha[indices.codigo] ?? "").trim() : "",
      descricao,
      unidade: unidadeRaw || "UN",
      quantidade_contratada: quantidade > 0 ? quantidade : 1,
      valor_unitario: valor < 0 ? 0 : valor,
    })
  }
  return itens
}

export const MODELO_CSV_ITENS = [
  "codigo;descricao;unidade;quantidade;valor_unitario",
  "CAN-001;Caneta esferográfica azul;UN;100;1,50",
  "PAP-010;Resma de papel A4;UN;20;28,90",
].join("\r\n")

export function baixarModeloPlanilhaItens() {
  const blob = new Blob(["\uFEFF" + MODELO_CSV_ITENS], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "modelo-itens-contrato.csv"
  link.click()
  URL.revokeObjectURL(url)
}

function linhasDaPlanilha(arquivo: File, buffer: ArrayBuffer): unknown[][] {
  const nome = arquivo.name.toLowerCase()
  let workbook: XLSX.WorkBook
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
    const texto = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "")
    const primeira = texto.split(/\r?\n/, 1)[0] || ""
    const fs = primeira.split(";").length > primeira.split(",").length ? ";" : ","
    workbook = XLSX.read(texto, { type: "string", FS: fs, raw: false })
  } else {
    workbook = XLSX.read(buffer, { type: "array", raw: true })
  }
  const folha = workbook.Sheets[workbook.SheetNames[0]]
  if (!folha) return []
  return XLSX.utils.sheet_to_json(folha, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][]
}

export async function lerItensDeArquivo(arquivo: File): Promise<ItemPlanilhaContrato[]> {
  const buffer = await arquivo.arrayBuffer()
  return mapearLinhasPlanilha(linhasDaPlanilha(arquivo, buffer))
}
