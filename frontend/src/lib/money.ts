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
