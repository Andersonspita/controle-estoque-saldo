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
  if (contrato.ano) return `${contrato.numero}/${contrato.ano}`
  return String(contrato.numero || "")
}
