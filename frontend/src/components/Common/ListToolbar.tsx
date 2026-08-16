import type { ReactNode } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function ListToolbar({
  placeholder,
  query,
  onQueryChange,
  tabs,
  tab,
  onTabChange,
  trailing,
  countLabel,
  chips,
}: {
  placeholder: string
  query: string
  onQueryChange: (value: string) => void
  tabs?: { value: string; label: string }[]
  tab?: string
  onTabChange?: (value: string) => void
  trailing?: ReactNode
  countLabel?: string
  chips?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 rounded-lg bg-muted/50 pl-8"
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {tabs && tab && onTabChange ? (
            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList className="h-auto rounded-[9px] bg-muted p-1">
                {tabs.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm",
                    )}
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
          {chips}
          {countLabel ? (
            <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground lg:ml-0">
              {countLabel}
            </span>
          ) : null}
          {trailing}
        </div>
      </div>
    </div>
  )
}
