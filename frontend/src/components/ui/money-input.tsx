import { formatarBRL, centavosParaNumero } from "@/lib/money"

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
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
        R$
      </span>
      <input
        inputMode="numeric"
        required={required}
        value={formatarBRL(value)}
        onChange={(e) => onValueChange(centavosParaNumero(e.target.value))}
        className={`w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 pl-8 text-xs text-slate-800 dark:text-slate-200 ${className}`}
      />
    </div>
  )
}
