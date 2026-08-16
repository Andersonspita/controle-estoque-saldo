import { cn } from "@/lib/utils"

export function percentualRestante(saldo: number, contratada: number) {
  if (!contratada) return 0
  return Math.min(100, Math.max(0, (saldo / contratada) * 100))
}

export function corBarraSaldo(percentual: number) {
  if (percentual <= 15) return "bg-critical"
  if (percentual <= 45) return "bg-warning"
  return "bg-success"
}

export function classNameBarraSaldo(percentual: number, extra = "") {
  return cn("h-full rounded-full", corBarraSaldo(percentual), extra)
}
