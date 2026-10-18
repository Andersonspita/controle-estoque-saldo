import { Badge } from "@/components/ui/badge"

type BadgeVariant = "success" | "warning" | "critical" | "secondary" | "default"

const STATUS_VINCULO: Record<string, { label: string; variant: BadgeVariant }> = {
  CONFIRMADO: { label: "Confirmado", variant: "success" },
  PROVAVEL: { label: "Provável", variant: "secondary" },
  SUGERIDO: { label: "Sugerido", variant: "warning" },
  MANUAL: { label: "Manual", variant: "secondary" },
  NAO_IDENTIFICADO: { label: "Não identificado", variant: "critical" },
}

export function StatusVinculoBadge({
  status,
  confianca,
}: {
  status?: string | null
  confianca?: number | null
}) {
  const info = STATUS_VINCULO[status || ""] || STATUS_VINCULO.NAO_IDENTIFICADO
  const sufixo = confianca != null ? ` (${confianca}%)` : ""
  return (
    <Badge variant={info.variant}>
      {info.label}
      {sufixo}
    </Badge>
  )
}
