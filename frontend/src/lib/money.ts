export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0)
}

export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0)
}

export function centavosParaNumero(texto: string): number {
  const digitos = (texto || "").replace(/\D/g, "")
  if (!digitos) return 0
  return Number(digitos) / 100
}

export function valorContratadoItem(item: {
  quantidade_contratada?: number
  valor_unitario?: number
  valor_contratado?: number
}): number {
  if (item.valor_contratado != null) return item.valor_contratado
  return (item.quantidade_contratada || 0) * (item.valor_unitario || 0)
}

export function saldoMonetarioItem(item: {
  saldo_atual?: number
  valor_unitario?: number
  saldo_monetario?: number
}): number {
  if (item.saldo_monetario != null) return item.saldo_monetario
  return (item.saldo_atual || 0) * (item.valor_unitario || 0)
}

export function totaisContrato(contrato: {
  valor_total?: number
  saldo_atual?: number
  itens?: Array<{
    quantidade_contratada?: number
    saldo_atual?: number
    valor_unitario?: number
    valor_contratado?: number
    saldo_monetario?: number
  }>
}) {
  const itens = contrato.itens || []
  const valorContratado = itens.length
    ? itens.reduce((acc, item) => acc + valorContratadoItem(item), 0)
    : contrato.valor_total || 0
  const saldoAtual = itens.reduce((acc, item) => acc + saldoMonetarioItem(item), 0)
  const qtdSaldo = itens.reduce((acc, item) => acc + (item.saldo_atual || 0), 0)
  const qtdContratada = itens.reduce(
    (acc, item) => acc + (item.quantidade_contratada || 0),
    0,
  )
  return {
    valorContratado,
    saldoAtual,
    consumido: Math.max(0, valorContratado - saldoAtual),
    qtdSaldo,
    qtdContratada,
  }
}

const UNIDADES_INTEIRAS = new Set([
  "un",
  "und",
  "unid",
  "unidade",
  "pc",
  "pç",
  "pec",
  "peca",
  "peça",
  "cx",
  "dz",
  "kit",
  "par",
  "jg",
  "rl",
  "rolo",
])

export function quantidadeInteira(unidade?: string | null) {
  const texto = (unidade || "UN").trim().toLowerCase()
  return UNIDADES_INTEIRAS.has(texto) || texto.startsWith("un")
}

