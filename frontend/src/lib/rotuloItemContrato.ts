/** Rótulo curto para selects/listas de item do contrato (alinhado ao modelo de planilha). */
export function rotuloItemContrato(item: {
  numero_item?: number | null
  descricao?: string | null
  marca?: string | null
  unidade?: string | null
  saldo_atual?: number | null
}): string {
  const partes: string[] = []
  if (item.numero_item != null) partes.push(`${item.numero_item}.`)
  partes.push(item.descricao?.trim() || "Sem descrição")
  if (item.marca?.trim()) partes.push(`(${item.marca.trim()})`)
  const base = partes.join(" ")
  if (item.saldo_atual != null) {
    const unidade = item.unidade ? ` ${item.unidade}` : ""
    return `${base} — saldo: ${item.saldo_atual}${unidade}`
  }
  return base
}
