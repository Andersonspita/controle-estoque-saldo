import * as XLSX from "xlsx"

import { resolverUnidade } from "@/lib/unidadesMedida"

/** Colunas oficiais do arquivo `modelo-itens-contrato.xlsx`. */
export const CABECALHOS_MODELO = [
  "Item",
  "Descrição",
  "Unidade",
  "Quantidade",
  "Marca",
  "Valor_unitário",
  "Observação",
] as const

export type ItemPlanilhaContrato = {
  numero_item?: number
  descricao: string
  unidade: string
  quantidade_contratada: number
  marca?: string
  valor_unitario: number
  observacao?: string
}

function normalizarCabecalho(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const CABECALHOS_ESPERADOS = CABECALHOS_MODELO.map((c) => normalizarCabecalho(c))

const MAPA_CAMPO: Record<string, keyof ItemPlanilhaContrato> = {
  item: "numero_item",
  descricao: "descricao",
  unidade: "unidade",
  quantidade: "quantidade_contratada",
  marca: "marca",
  valor_unitario: "valor_unitario",
  observacao: "observacao",
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

function validarCabecalhosModelo(cabecalhos: string[]) {
  const normalizados = cabecalhos.map((c) => normalizarCabecalho(String(c ?? "")))
  const preenchidos = normalizados.filter(Boolean)
  if (preenchidos.length < CABECALHOS_ESPERADOS.length) {
    throw new Error(
      `Use o modelo oficial. Cabeçalhos esperados: ${CABECALHOS_MODELO.join(", ")}.`,
    )
  }
  for (let i = 0; i < CABECALHOS_ESPERADOS.length; i++) {
    if (normalizados[i] !== CABECALHOS_ESPERADOS[i]) {
      throw new Error(
        `Planilha fora do modelo. Na coluna ${i + 1} esperava "${CABECALHOS_MODELO[i]}", recebeu "${cabecalhos[i] || "(vazio)"}". Baixe o modelo e preencha sem alterar o cabeçalho.`,
      )
    }
  }
}

export function mapearLinhasPlanilha(linhas: unknown[][]): ItemPlanilhaContrato[] {
  if (!linhas.length) {
    throw new Error("A planilha está vazia. Use o modelo oficial de itens.")
  }
  const cabecalhos = (linhas[0] || []).map((c) => String(c ?? ""))
  validarCabecalhosModelo(cabecalhos)

  const indices: Partial<Record<keyof ItemPlanilhaContrato, number>> = {}
  cabecalhos.forEach((cabecalho, index) => {
    const chave = MAPA_CAMPO[normalizarCabecalho(cabecalho)]
    if (chave) indices[chave] = index
  })

  const itens: ItemPlanilhaContrato[] = []
  for (const linha of linhas.slice(1)) {
    if (!linha || linha.every((celula) => String(celula ?? "").trim() === "")) continue
    const descricao = String(linha[indices.descricao!] ?? "").trim()
    if (!descricao) continue

    const quantidade = parseNumeroPlanilha(linha[indices.quantidade_contratada!])
    const valor = parseNumeroPlanilha(linha[indices.valor_unitario!])
    const unidadeRaw = String(linha[indices.unidade!] ?? "").trim()
    const marca = String(linha[indices.marca!] ?? "").trim()
    const observacao = String(linha[indices.observacao!] ?? "").trim()
    const numeroRaw = parseNumeroPlanilha(linha[indices.numero_item!])

    itens.push({
      numero_item: numeroRaw > 0 ? Math.round(numeroRaw) : undefined,
      descricao,
      unidade: resolverUnidade(unidadeRaw),
      quantidade_contratada: quantidade > 0 ? quantidade : 1,
      marca: marca || undefined,
      valor_unitario: valor < 0 ? 0 : valor,
      observacao: observacao || undefined,
    })
  }
  return itens
}

export function baixarModeloPlanilhaItens() {
  const link = document.createElement("a")
  link.href = `${import.meta.env.BASE_URL}modelo-itens-contrato.xlsx`
  link.download = "Modelo para importação de itens.xlsx"
  link.click()
}

function linhasDaPlanilha(arquivo: File, buffer: ArrayBuffer): unknown[][] {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
    throw new Error(
      "Aceito apenas o modelo oficial em Excel (.xlsx). Baixe o modelo e preencha as colunas.",
    )
  }
  const workbook = XLSX.read(buffer, { type: "array", raw: true })
  const folhaNome =
    workbook.SheetNames.find((n) => n.toLowerCase().includes("modelo")) ||
    workbook.SheetNames[0]
  const folha = workbook.Sheets[folhaNome]
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
