import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileBarChart,
  FileSignature,
  FileText,
  Wallet,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { pageTitle } from "@/lib/brand"
import { formatarDataBR } from "@/lib/contrato"
import { formatarMoeda, totaisContrato } from "@/lib/money"
import useAuth from "../../hooks/useAuth"
import {
  contratosService,
  movimentacoesService,
  notasFiscaisService,
} from "../../services/api"

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

function dataPorExtenso() {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function consumoMensal(movimentacoes: any[]) {
  const agora = new Date()
  const meses: { chave: string; rotulo: string; valor: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    const rotulo = data
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
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

function diasAte(dataFim?: string | null) {
  if (!dataFim) return null
  const fim = new Date(dataFim)
  if (Number.isNaN(fim.getTime())) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.ceil((fim.getTime() - hoje.getTime()) / 86_400_000)
}

/** Cartão de indicador: rótulo institucional em caixa alta, número em destaque
 *  e uma linha de contexto. O filete superior dá a cor sem poluir. */
function Indicador({
  rotulo,
  valor,
  contexto,
  icone: Icone,
  destaque,
  carregando,
}: {
  rotulo: string
  valor: string
  contexto?: string
  icone: LucideIcon
  destaque?: boolean
  carregando?: boolean
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-5">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[3px] ${destaque ? "bg-primary" : "bg-border"}`}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </p>
        <Icone className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {carregando ? (
        <Skeleton className="mt-2 h-9 w-32" />
      ) : (
        <p className="mt-1.5 truncate text-[26px] font-semibold leading-tight tracking-tight tabular-nums">
          {valor}
        </p>
      )}
      {contexto ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{contexto}</p>
      ) : null}
    </div>
  )
}

function TituloSecao({
  children,
  acao,
}: {
  children: React.ReactNode
  acao?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h2>
      {acao}
    </div>
  )
}

function Dashboard() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const primeiroNome = (
    currentUser?.full_name ||
    currentUser?.email ||
    "usuário"
  ).split(" ")[0]

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
    {
      valorContratado: 0,
      saldoAtual: 0,
      consumido: 0,
      qtdSaldo: 0,
      qtdContratada: 0,
    },
  )

  const pctConsumo = totais.valorContratado
    ? Math.min(100, (totais.consumido / totais.valorContratado) * 100)
    : 0

  const aEncerrar: { contrato: any; dias: number }[] = contratosAtivos
    .map((c: any) => ({ contrato: c, dias: diasAte(c.data_fim) }))
    .filter(
      (linha: { dias: number | null }) =>
        linha.dias !== null && linha.dias <= 90,
    )
    .sort((a: { dias: number }, b: { dias: number }) => a.dias - b.dias)

  const notasPendentes = notas.filter(
    (nf: any) => nf.status !== "Baixada",
  ).length
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
  const mediaBarra =
    barras.reduce((acc, b) => acc + b.valor, 0) / (barras.length || 1)

  return (
    <div className="min-w-0 space-y-5 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {dataPorExtenso()}
          </p>
          <h1
            data-testid="dashboard-greeting"
            className="mt-1 text-2xl font-semibold tracking-tight text-foreground"
          >
            {saudacao()}, {primeiroNome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Situação dos contratos ativos e das baixas de NF.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/contratos">
              <FileSignature /> Contratos
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/relatorios">
              <FileBarChart /> Emitir relatório
            </Link>
          </Button>
        </div>
      </header>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Saldo disponível"
          valor={formatarMoeda(totais.saldoAtual)}
          contexto={`${(100 - pctConsumo).toFixed(0)}% do valor contratado ainda por executar`}
          icone={Wallet}
          destaque
          carregando={loading}
        />
        <Indicador
          rotulo="Valor contratado"
          valor={formatarMoeda(totais.valorContratado)}
          contexto={`Baixado ${formatarMoeda(totais.consumido)}`}
          icone={FileText}
          carregando={loading}
        />
        <Indicador
          rotulo="Contratos ativos"
          valor={String(contratosAtivos.length)}
          contexto={`${aEncerrar.length} encerram em até 90 dias`}
          icone={FileSignature}
          carregando={loading}
        />
        <Indicador
          rotulo="Baixas neste mês"
          valor={String(baixasMes)}
          contexto={`${notasPendentes} NFs aguardando conferência`}
          icone={CalendarClock}
          carregando={movimentacoesQuery.isLoading}
        />
      </div>

      <section className="rounded-xl border bg-card p-5">
        <TituloSecao>Execução financeira dos contratos ativos</TituloSecao>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${pctConsumo}%` }}
              />
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="border-l-2 border-primary pl-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Executado
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatarMoeda(totais.consumido)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({pctConsumo.toFixed(1)}%)
                  </span>
                </dd>
              </div>
              <div className="border-l-2 border-border pl-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  A executar
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatarMoeda(totais.saldoAtual)}
                </dd>
              </div>
              <div className="border-l-2 border-border pl-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantidades
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {totais.qtdSaldo.toLocaleString("pt-BR")}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    de {totais.qtdContratada.toLocaleString("pt-BR")} unid.
                  </span>
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-xl border bg-card p-5">
          <TituloSecao
            acao={
              <span className="text-[11px] text-muted-foreground">
                Média{" "}
                {mediaBarra.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}{" "}
                un/mês
              </span>
            }
          >
            Quantidades baixadas nos últimos 8 meses
          </TituloSecao>
          {movimentacoesQuery.isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 flex h-40 flex-col justify-between"
              >
                {[0, 1, 2, 3].map((linha) => (
                  <div
                    key={linha}
                    className="border-t border-dashed border-border/70"
                  />
                ))}
              </div>
              <div className="relative flex h-40 items-end gap-2">
                {barras.map((barra, indice) => {
                  const atual = indice === barras.length - 1
                  const altura = Math.max(2, (barra.valor / maxBarra) * 100)
                  return (
                    <Tooltip key={barra.chave}>
                      <TooltipTrigger asChild>
                        <div className="flex h-full min-w-0 flex-1 cursor-default flex-col justify-end">
                          <div
                            className={`w-full rounded-t-[3px] transition-colors ${
                              atual
                                ? "bg-primary"
                                : "bg-primary/30 hover:bg-primary/50"
                            }`}
                            style={{ height: `${altura}%` }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {barra.valor.toLocaleString("pt-BR")} unidades baixadas
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-2 border-t pt-2">
                {barras.map((barra, indice) => (
                  <div key={barra.chave} className="min-w-0 flex-1 text-center">
                    <p
                      className={`text-[11px] capitalize ${
                        indice === barras.length - 1
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {barra.rotulo}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                      {barra.valor.toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <TituloSecao
            acao={
              itensEmAlerta.length ? (
                <Badge variant="warning">{itensEmAlerta.length}</Badge>
              ) : null
            }
          >
            Risco de esgotamento (45 dias)
          </TituloSecao>
          {previsoesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : itensEmAlerta.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum item em risco nos próximos 45 dias.
            </p>
          ) : (
            <ul className="divide-y">
              {itensEmAlerta.map((prev: any) => (
                <li
                  key={prev.item_id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="truncate text-sm font-medium">
                          {prev.item_descricao}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>{prev.item_descricao}</TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-muted-foreground">
                      Contrato {prev.contrato_numero} · saldo {prev.saldo_atual}{" "}
                      un
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        prev.dias_restantes <= 15 ? "critical" : "warning"
                      }
                    >
                      {prev.dias_restantes} dias
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Abrir contratos"
                      onClick={() => navigate({ to: "/contratos" })}
                    >
                      <ArrowRight />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <TituloSecao
          acao={
            <Button asChild variant="ghost" size="sm">
              <Link to="/contratos">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          }
        >
          Vigências a encerrar em até 90 dias
        </TituloSecao>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : aEncerrar.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum contrato ativo encerra nos próximos 90 dias.
          </p>
        ) : (
          <ul className="divide-y">
            {aEncerrar
              .slice(0, 5)
              .map(({ contrato, dias }: { contrato: any; dias: number }) => {
                const t = totaisContrato(contrato)
                return (
                  <li
                    key={contrato.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        <span className="font-mono">
                          {contrato.numero}
                          {contrato.ano ? `/${contrato.ano}` : ""}
                        </span>
                        {contrato.objeto ? ` · ${contrato.objeto}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contrato.fornecedor?.razao_social ||
                          "Fornecedor não informado"}{" "}
                        · encerra em {formatarDataBR(contrato.data_fim)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatarMoeda(t.saldoAtual)}
                      </span>
                      <Badge variant={dias <= 30 ? "critical" : "warning"}>
                        <AlertTriangle />
                        {dias <= 0
                          ? "vencido"
                          : `${dias} ${dias === 1 ? "dia" : "dias"}`}
                      </Badge>
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </section>
    </div>
  )
}
