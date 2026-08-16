import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, FileText, Wallet } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useAuth from "../../hooks/useAuth"
import { pageTitle } from "@/lib/brand"
import { formatarMoeda, totaisContrato } from "@/lib/money"
import { contratosService, movimentacoesService, notasFiscaisService } from "../../services/api"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: pageTitle("Dashboard") }],
  }),
})

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return "Bom dia"
  if (hora < 18) return "Boa tarde"
  return "Boa noite"
}

function consumoMensal(movimentacoes: any[]) {
  const agora = new Date()
  const meses: { chave: string; rotulo: string; valor: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    const rotulo = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    meses.push({ chave, rotulo, valor: 0 })
  }
  const mapa = Object.fromEntries(meses.map((m) => [m.chave, m]))
  for (const mov of movimentacoes) {
    if ((mov.tipo_movimento || "").toUpperCase() !== "BAIXA") continue
    const data = new Date(mov.data_hora)
    if (Number.isNaN(data.getTime())) continue
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    if (mapa[chave]) mapa[chave].valor += Number(mov.quantidade || 0)
  }
  return meses
}

function Dashboard() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const primeiroNome = (currentUser?.full_name || currentUser?.email || "usuário").split(" ")[0]

  const contratosQuery = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })
  const movimentacoesQuery = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: () => movimentacoesService.listar(),
  })
  const previsoesQuery = useQuery({
    queryKey: ["previsao-consumo"],
    queryFn: () => contratosService.previsaoConsumo(),
  })
  const notasQuery = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: () => notasFiscaisService.listar(),
  })

  const isError =
    contratosQuery.isError ||
    movimentacoesQuery.isError ||
    previsoesQuery.isError

  const loading = contratosQuery.isLoading
  const contratos = contratosQuery.data || []
  const movimentacoes = movimentacoesQuery.data || []
  const previsoes = previsoesQuery.data || []
  const notas = notasQuery.data || []

  const contratosAtivos = contratos.filter((c: any) => c.situacao === "Ativo")
  const totais = contratosAtivos.reduce(
    (acc: ReturnType<typeof totaisContrato>, c: any) => {
      const t = totaisContrato(c)
      return {
        valorContratado: acc.valorContratado + t.valorContratado,
        saldoAtual: acc.saldoAtual + t.saldoAtual,
        consumido: acc.consumido + t.consumido,
        qtdSaldo: acc.qtdSaldo + t.qtdSaldo,
        qtdContratada: acc.qtdContratada + t.qtdContratada,
      }
    },
    { valorContratado: 0, saldoAtual: 0, consumido: 0, qtdSaldo: 0, qtdContratada: 0 },
  )

  const pctConsumo = totais.valorContratado
    ? Math.min(100, (totais.consumido / totais.valorContratado) * 100)
    : 0
  const encerram90 = contratosAtivos.filter((c: any) => {
    if (!c.data_fim) return false
    const fim = new Date(c.data_fim)
    const limite = new Date()
    limite.setDate(limite.getDate() + 90)
    return fim <= limite
  }).length
  const notasPendentes = notas.filter((nf: any) => nf.status !== "Baixada").length
  const baixasMes = movimentacoes.filter((mov: any) => {
    const data = new Date(mov.data_hora)
    const agora = new Date()
    return (
      (mov.tipo_movimento || "").toUpperCase() === "BAIXA" &&
      data.getMonth() === agora.getMonth() &&
      data.getFullYear() === agora.getFullYear()
    )
  }).length
  const itensEmAlerta = previsoes
    .filter((p: any) => p.dias_restantes !== null && p.dias_restantes <= 45)
    .slice(0, 6)
  const barras = consumoMensal(movimentacoes)
  const maxBarra = Math.max(1, ...barras.map((b) => b.valor))

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <div>
        <h1
          data-testid="dashboard-greeting"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Situação dos contratos ativos e das baixas de NF.
        </p>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Não foi possível carregar o dashboard</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            Tente novamente em instantes.
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                contratosQuery.refetch()
                movimentacoesQuery.refetch()
                previsoesQuery.refetch()
              }}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Consumo do valor contratado</h3>
            {loading ? (
              <Skeleton className="h-5 w-12" />
            ) : (
              <span className="text-sm font-semibold text-primary tabular-nums">
                {pctConsumo.toFixed(0)}%
              </span>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-[62px] w-full" />
          ) : (
            <>
              <p className="text-3xl font-bold tracking-tight whitespace-nowrap tabular-nums">
                {formatarMoeda(totais.saldoAtual)}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pctConsumo}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Baixado {formatarMoeda(totais.consumido)} · Contratado {formatarMoeda(totais.valorContratado)}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Contratos ativos</h3>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          {loading ? (
            <Skeleton className="h-11 w-20" />
          ) : (
            <p className="text-3xl font-bold tracking-tight tabular-nums">{contratosAtivos.length}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {encerram90} encerram em até 90 dias
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Baixas neste mês</h3>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          {movimentacoesQuery.isLoading ? (
            <Skeleton className="h-11 w-20" />
          ) : (
            <p className="text-3xl font-bold tracking-tight tabular-nums">{baixasMes}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {notasPendentes} NFs aguardando conferência
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Consumo mensal</h3>
          {movimentacoesQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="flex h-44 items-end gap-2">
              {barras.map((barra, indice) => {
                const atual = indice === barras.length - 1
                const altura = Math.max(8, (barra.valor / maxBarra) * 100)
                return (
                  <div key={barra.chave} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {barra.valor.toLocaleString("pt-BR")}
                    </span>
                    <div
                      className={`w-full ${atual ? "bg-primary" : "bg-primary/25"} rounded-t-md`}
                      style={{ height: `${altura}%` }}
                    />
                    <span className="text-[11px] capitalize text-muted-foreground">{barra.rotulo}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Risco de esgotamento</h3>
            <Badge variant="warning">{itensEmAlerta.length}</Badge>
          </div>
          {previsoesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : itensEmAlerta.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item em risco nos próximos 45 dias.</p>
          ) : (
            <ul className="space-y-2">
              {itensEmAlerta.map((prev: any) => (
                <li
                  key={prev.item_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-1 py-1.5"
                >
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="truncate text-sm font-medium">{prev.item_descricao}</p>
                      </TooltipTrigger>
                      <TooltipContent>{prev.item_descricao}</TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-muted-foreground">
                      Contrato {prev.contrato_numero} · {prev.saldo_atual} un
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={prev.dias_restantes <= 15 ? "critical" : "warning"}>
                      {prev.dias_restantes} dias
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: "/contratos" })}
                    >
                      Ver contrato
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
