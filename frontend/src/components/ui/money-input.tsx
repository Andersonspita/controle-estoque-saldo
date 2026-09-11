import { formatarBRL, centavosParaNumero } from "@/lib/money"
import { cn } from "@/lib/utils"

interface MoneyInputProps {
  value: number
  onValueChange: (valor: number) => void
  required?: boolean
  className?: string
}

export function MoneyInput({
  value,
  onValueChange,
  required,
  className = "",
}: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <input
        inputMode="numeric"
        required={required}
        value={formatarBRL(value)}
        onChange={(e) => onValueChange(centavosParaNumero(e.target.value))}
        className={cn(
          "w-full rounded-md border border-input bg-transparent p-1.5 pl-8 text-xs text-foreground",
          className,
        )}
      />
    </div>
  )
}
