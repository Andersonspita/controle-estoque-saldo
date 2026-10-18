import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Bell, CalendarClock, CalendarX2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { diasAteVencimento, formatarDataBR, numeroContrato } from "@/lib/contrato"
import { contratosService } from "@/services/api"

// Contratos ativos que vencem dentro deste prazo também entram no aviso.
const DIAS_AVISO = 30

function texto(dias: number, dataFim: string) {
  if (dias < 0) return `Venceu em ${formatarDataBR(dataFim)} · faça o aditivo de prazo`
  if (dias === 0) return "Vence hoje"
  return `Vence em ${dias} ${dias === 1 ? "dia" : "dias"} (${formatarDataBR(dataFim)})`
}

export function Notificacoes() {
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const avisos = (contratos as any[])
    .filter((c) => c.situacao === "Ativo" && c.data_fim)
    .map((c) => ({ contrato: c, dias: diasAteVencimento(c.data_fim) as number }))
    .filter(({ dias }) => dias <= DIAS_AVISO)
    .sort((a, b) => a.dias - b.dias)

  return (
    <SidebarMenuItem>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Notificações" data-testid="notificacoes">
            <span className="relative">
              <Bell className="size-4 text-muted-foreground" />
              {avisos.length > 0 && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-destructive" />
              )}
            </span>
            <span>Notificações</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        {avisos.length > 0 && (
          <SidebarMenuBadge className="bg-destructive text-white">{avisos.length}</SidebarMenuBadge>
        )}
        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align="end"
          className="max-h-[70vh] w-80 overflow-y-auto"
        >
          <DropdownMenuLabel>Vencimento de contratos</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {avisos.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Nenhum contrato vencido ou vencendo nos próximos {DIAS_AVISO} dias.
            </p>
          ) : (
            avisos.map(({ contrato, dias }) => {
              const Icone = dias < 0 ? CalendarX2 : CalendarClock
              return (
                <DropdownMenuItem
                  key={contrato.id}
                  className="items-start"
                  onClick={() => {
                    if (isMobile) setOpenMobile(false)
                    navigate({ to: "/contratos" })
                  }}
                >
                  <Icone
                    className={`mt-0.5 ${dias < 0 ? "text-destructive" : "text-warning"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      Contrato {numeroContrato(contrato)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contrato.fornecedor?.razao_social || contrato.objeto}
                    </p>
                    <p className={`text-xs ${dias < 0 ? "text-destructive" : "text-warning"}`}>
                      {texto(dias, contrato.data_fim)}
                    </p>
                  </div>
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
