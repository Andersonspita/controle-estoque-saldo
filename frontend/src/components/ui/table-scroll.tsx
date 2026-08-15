import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Wrapper que permite rolagem horizontal em tabelas no mobile sem cortar ações/cabeçalhos. */
export function TableScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  )
}
