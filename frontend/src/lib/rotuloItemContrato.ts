import { formatarMoeda } from "@/lib/money"

/** Rótulo para selects de item do contrato: nome + valor unitário + saldo. */
export function rotuloItemContrato(item: {
  numero_item?: number | null
  descricao?: string | null
  marca?: string | null
  unidade?: string | null
  valor_unitario?: number | null
  saldo_atual?: number | null
}): string {
  const partes: string[] = []
  if (item.numero_item != null) partes.push(`${item.numero_item}.`)
  partes.push(item.descricao?.trim() || "Sem descrição")
  if (item.marca?.trim()) partes.push(`(${item.marca.trim()})`)
  const base = partes.join(" ")

  const extras: string[] = []
  if (item.valor_unitario != null) {
    extras.push(`unit. ${formatarMoeda(Number(item.valor_unitario))}`)
  }
  if (item.saldo_atual != null) {
    const unidade = item.unidade ? ` ${item.unidade}` : ""
    extras.push(`saldo: ${item.saldo_atual}${unidade}`)
  }
  return extras.length ? `${base} — ${extras.join(" · ")}` : base
}
