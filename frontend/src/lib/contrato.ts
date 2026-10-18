export function dataISO(valor?: string | null) {
  return valor ? String(valor).slice(0, 10) : ""
}

export function formatarDataBR(valor?: string | null) {
  const iso = dataISO(valor)
  if (!iso) return ""
  const [ano, mes, dia] = iso.split("-")
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

export function formatarVigencia(inicio?: string | null, fim?: string | null) {
  const i = formatarDataBR(inicio)
  const f = formatarDataBR(fim)
  if (i && f) return `${i} a ${f}`
  return i || f || ""
}

export function rotuloContrato(contrato: {
  numero?: string
  ano?: number
  data_inicio?: string | null
  data_fim?: string | null
}) {
  const vigencia = formatarVigencia(contrato.data_inicio, contrato.data_fim)
  if (vigencia) return `${contrato.numero} · ${vigencia}`
  return numeroContrato(contrato)
}

/** "012/2024" — o número muitas vezes já traz o ano; não repete ("012/2024/2024"). */
export function numeroContrato(contrato: { numero?: string | null; ano?: number | null }) {
  const numero = String(contrato.numero || "")
  if (!contrato.ano || numero.includes("/")) return numero
  return `${numero}/${contrato.ano}`
}

/** Dias até o fim da vigência (negativo = vencido), em data local. */
export function diasAteVencimento(dataFim?: string | null) {
  const iso = dataISO(dataFim)
  if (!iso) return null
  const fim = new Date(`${iso}T00:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((fim.getTime() - hoje.getTime()) / 86_400_000)
}

/** Ativo com vigência final já passada (vence no dia seguinte ao fim, como no backend). */
export function contratoVencido(contrato: { situacao?: string; data_fim?: string | null }) {
  const dias = diasAteVencimento(contrato.data_fim)
  return contrato.situacao === "Ativo" && dias !== null && dias < 0
}

export function situacaoContrato(contrato: { situacao?: string; data_fim?: string | null }) {
  if (contratoVencido(contrato)) return { rotulo: "Vencido", variant: "critical" as const }
  if (contrato.situacao === "Ativo") return { rotulo: "Ativo", variant: "success" as const }
  return { rotulo: contrato.situacao || "", variant: "secondary" as const }
}

export const TIPOS_ADITIVO: Record<string, string> = {
  PRAZO: "Prazo",
  VALOR: "Valor (acréscimo)",
  VALOR_PRAZO: "Valor e prazo",
  REEQUILIBRIO: "Reequilíbrio econômico-financeiro",
}

export function descreverAditivo(aditivo: {
  numero?: string | null
  tipo?: string | null
  percentual?: number | null
  data_inicio?: string | null
  data_fim?: string | null
}) {
  const partes = [
    aditivo.numero ? `Nº ${aditivo.numero}` : "",
    TIPOS_ADITIVO[aditivo.tipo || ""] || aditivo.tipo || "",
    aditivo.percentual != null
      ? `${aditivo.percentual > 0 ? "+" : ""}${String(aditivo.percentual).replace(".", ",")}%`
      : "",
    formatarVigencia(aditivo.data_inicio, aditivo.data_fim),
  ]
  return partes.filter(Boolean).join(" · ")
}
