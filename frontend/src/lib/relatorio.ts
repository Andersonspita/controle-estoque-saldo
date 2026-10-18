/** Formatação numérica do Relatório de Saldo — sempre em pt-BR e sem símbolo,
 *  como nos relatórios oficiais impressos. */

export function numeroBR(valor: number | null | undefined, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(Number(valor) || 0)
}

/** Quantidade: até 3 casas, só as que existem (10 · 2,5 · 0,125). */
export function quantidadeBR(valor: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(valor) || 0,
  )
}

export function percentualBR(valor: number | null | undefined): string {
  return `${numeroBR(valor, 1)}%`
}

export function dataHoraExtenso(valor: string | Date): string {
  const data = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(data.getTime())) return ""
  const dia = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const hora = data.toLocaleTimeString("pt-BR", { hour12: false })
  return `${dia}, ${hora}`
}
