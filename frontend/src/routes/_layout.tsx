import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useEffect, useRef } from "react"

import { Footer } from "@/components/Common/Footer"
import { ListSearchProvider, useListSearch } from "@/components/Common/ListSearch"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import { APP_NAME } from "@/lib/brand"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

const titulos: Record<string, string> = {
  "/": "Dashboard",
  "/notas-fiscais": "Notas Fiscais",
  "/contratos": "Contratos",
  "/fornecedores": "Fornecedores",
  "/almoxarifados": "Órgãos",
  "/relatorios": "Relatórios",
  "/admin": "Admin",
  "/settings": "Configurações",
}

function tituloDaRota(pathname: string) {
  return titulos[pathname] || "SaldoContratual"
}

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ListSearchProvider>
          <AppHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden bg-muted/30 p-4 md:p-6">
            <div className="mx-auto min-w-0 max-w-7xl">
              <Outlet />
            </div>
          </main>
          <Footer />
        </ListSearchProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { query, setQuery } = useListSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const pagina = tituloDaRota(pathname)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground" />
      <nav className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-[13px] sm:flex">
        <span className="text-muted-foreground">{APP_NAME}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{pagina}</span>
      </nav>
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="relative w-full max-w-[420px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="h-[34px] rounded-lg bg-muted/50 pr-12 pl-8"
            aria-label="Buscar"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-[5px] border px-[5px] text-[11px] text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </div>
      </div>
    </header>
  )
}
