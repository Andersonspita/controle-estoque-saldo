import { classNameBarraSaldo } from "@/lib/status"

export function ConsumoBar({
  percentual,
  size = "md",
  showLabel = true,
}: {
  percentual: number
  size?: "sm" | "md"
  showLabel?: boolean
}) {
  const valor = Math.min(100, Math.max(0, percentual))
  return (
    <div className="flex min-w-[5.5rem] items-center gap-2">
      <div
        className={`flex-1 overflow-hidden rounded-full bg-muted ${size === "sm" ? "h-1.5" : "h-2.5"}`}
      >
        <div className={classNameBarraSaldo(valor)} style={{ width: `${valor}%` }} />
      </div>
      {showLabel ? (
        <span className="w-[34px] text-right text-xs tabular-nums text-muted-foreground">
          {valor.toFixed(0)}%
        </span>
      ) : null}
    </div>
  )
}
