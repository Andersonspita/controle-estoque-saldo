import { createFileRoute } from "@tanstack/react-router"
import { Fragment, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, FilePlus2, FileSignature, Pencil, Plus } from "lucide-react"

import { AddContratoModal } from "../../components/Contratos/AddContratoModal"
import { AditivoContratoModal } from "../../components/Contratos/AditivoContratoModal"
import { ConsumoBar } from "../../components/Common/ConsumoBar"
import { EmptyState } from "../../components/Common/EmptyState"
import { ListToolbar } from "../../components/Common/ListToolbar"
import { PageHeader } from "../../components/Common/PageHeader"
import { useListSearch } from "../../components/Common/ListSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "../../hooks/useAuth"
import { useIsMobile } from "@/hooks/useMobile"
import { pageTitle } from "@/lib/brand"
import { formatarMoeda, saldoMonetarioItem, totaisContrato, valorContratadoItem } from "@/lib/money"
import { percentualRestante } from "@/lib/status"
import { contratosService } from "../../services/api"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/contratos")({
  component: ContratosPage,
  head: () => ({
    meta: [{ title: pageTitle("Contratos") }],
  }),
})

function itemTemAditivo(item: any) {
  if (item.quantidade_inicial == null) return false
  return Number(item.quantidade_contratada) !== Number(item.quantidade_inicial)
}

function contratoTemAditivo(contrato: any) {
  return (contrato.itens || []).some(itemTemAditivo)
}

function ContratosPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [contratoEdicao, setContratoEdicao] = useState<any | null>(null)
  const [contratoAditivo, setContratoAditivo] = useState<any | null>(null)
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const [status, setStatus] = useState("ativos")
  const [saldoCritico, setSaldoCritico] = useState(false)
  const { isAdmin } = useAuth()
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()
  const modalAberto = isAddModalOpen || !!contratoEdicao

  const { data: contratos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return contratos
      .filter((contrato: any) => {
        if (status === "ativos" && contrato.situacao !== "Ativo") return false
        if (status === "encerrados" && contrato.situacao === "Ativo") return false
        const totais = totaisContrato(contrato)
        const pct = percentualRestante(totais.saldoAtual, totais.valorContratado)
        if (saldoCritico && pct > 15) return false
        if (!termo) return true
        return [contrato.numero, contrato.ano, contrato.fornecedor?.razao_social]
          .join(" ")
          .toLowerCase()
          .includes(termo)
      })
      .sort((a: any, b: any) => totaisContrato(b).saldoAtual - totaisContrato(a).saldoAtual)
  }, [contratos, query, status, saldoCritico])

  const novoContrato = isAdmin ? (
    <Button
      onClick={() => {
        setContratoEdicao(null)
        setIsAddModalOpen(true)
      }}
    >
      <Plus /> Novo Contrato
    </Button>
  ) : null

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Contratos"
        description="O saldo controlado é quantitativo e monetário em cada item do contrato."
        action={novoContrato}
      />

      <ListToolbar
        placeholder="Número, ano ou fornecedor"
        query={query}
        onQueryChange={setQuery}
        tab={status}
        onTabChange={setStatus}
        tabs={[
          { value: "ativos", label: "Ativos" },
          { value: "encerrados", label: "Encerrados" },
          { value: "todos", label: "Todos" },
        ]}
        chips={
          <button
            type="button"
            onClick={() => setSaldoCritico((v) => !v)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              saldoCritico
                ? "bg-warning text-background"
                : "bg-warning-bg text-warning",
            )}
          >
            Saldo &lt; 15%
          </button>
        }
        countLabel={`${filtrados.length} ${filtrados.length === 1 ? "contrato" : "contratos"}`}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar contratos</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum contrato encontrado"
          description="Ajuste a busca ou cadastre um novo contrato."
          action={novoContrato}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filtrados.map((contrato: any) => {
            const totais = totaisContrato(contrato)
            const pct = percentualRestante(totais.saldoAtual, totais.valorContratado)
            return (
              <div key={contrato.id} className="space-y-2.5 rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[15px] font-semibold">
                      {contrato.numero}/{contrato.ano}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {contrato.fornecedor?.razao_social || `Fornecedor ID ${contrato.fornecedor_id}`}
                    </p>
                  </div>
                  <Badge variant={contrato.situacao === "Ativo" ? "success" : "secondary"}>
                    {contrato.situacao}
                  </Badge>
                </div>
                <p className="text-lg font-bold tabular-nums">{formatarMoeda(totais.saldoAtual)}</p>
                <ConsumoBar percentual={pct} />
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1"
                      onClick={() => setContratoEdicao(contrato)}
                    >
                      <Pencil /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1"
                      onClick={() => setContratoAditivo(contrato)}
                    >
                      <FilePlus2 /> Aditivo
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left">Número/Ano</th>
                <th className="px-4 py-3 text-left">Fornecedor</th>
                <th className="px-4 py-3 text-right">Valor total</th>
                <th className="px-4 py-3 text-right">Saldo atual</th>
                <th className="px-4 py-3 text-left">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
                <th className="px-4 py-3 text-right">Consumo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((contrato: any) => {
                const itens = contrato.itens || []
                const totais = totaisContrato(contrato)
                const expandido = expandidoId === contrato.id
                const painelId = `contrato-painel-${contrato.id}`
                const pct = percentualRestante(totais.saldoAtual, totais.valorContratado)

                return (
                  <Fragment key={contrato.id}>
                    <tr className="border-t hover:bg-muted/40">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          aria-expanded={expandido}
                          aria-controls={painelId}
                          onClick={() => setExpandidoId(expandido ? null : contrato.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        >
                          <ChevronRight
                            size={16}
                            className={cn(
                              "transition-transform duration-150",
                              expandido && "rotate-90",
                            )}
                          />
                          <span className="sr-only">
                            {expandido ? "Recolher itens" : "Expandir itens"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {contrato.numero}/{contrato.ano}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {contrato.fornecedor?.razao_social || `Fornecedor ID ${contrato.fornecedor_id}`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                        {formatarMoeda(totais.valorContratado)}
                        {contratoTemAditivo(contrato) && (
                          <p className="text-xs font-normal text-muted-foreground">
                            Com aditivo
                            {contrato.valor_total_inicial != null
                              ? ` · inicial ${formatarMoeda(contrato.valor_total_inicial)}`
                              : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="font-semibold tabular-nums">{formatarMoeda(totais.saldoAtual)}</p>
                        <p className="text-xs text-muted-foreground">
                          {totais.qtdSaldo.toLocaleString("pt-BR")} / {totais.qtdContratada.toLocaleString("pt-BR")} unid.
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={contrato.situacao === "Ativo" ? "success" : "secondary"}>
                          {contrato.situacao}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setContratoAditivo(null)
                                setContratoEdicao(contrato)
                              }}
                            >
                              <Pencil /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setContratoEdicao(null)
                                setContratoAditivo(contrato)
                              }}
                            >
                              <FilePlus2 /> Aditivo
                            </Button>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <ConsumoBar percentual={pct} size="sm" />
                      </td>
                    </tr>
                    {expandido && (
                      <tr id={painelId} className="bg-muted/40">
                        <td colSpan={isAdmin ? 8 : 7} className="px-6 py-4 pl-[52px]">
                          {itens.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Este contrato ainda não possui itens cadastrados.
                            </p>
                          ) : (
                            <div className="grid gap-2">
                              <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr] gap-3 text-xs font-medium text-muted-foreground">
                                <span>Item</span>
                                <span className="text-right">Contratado</span>
                                <span className="text-right">Saldo atual</span>
                                <span>Consumo</span>
                              </div>
                              {itens.map((item: any) => {
                                const pctItem = percentualRestante(
                                  item.saldo_atual,
                                  item.quantidade_contratada,
                                )
                                return (
                                  <div
                                    key={item.id}
                                    className="grid grid-cols-[2fr_1fr_1fr_1.2fr] items-center gap-3 border-t py-2"
                                  >
                                    <div>
                                      <p className="font-medium">{item.descricao}</p>
                                      {item.codigo && (
                                        <p className="text-muted-foreground">Cód: {item.codigo}</p>
                                      )}
                                    </div>
                                    <div className="text-right tabular-nums">
                                      {item.quantidade_contratada} {item.unidade}
                                      <p className="text-muted-foreground">
                                        {formatarMoeda(valorContratadoItem(item))}
                                      </p>
                                    </div>
                                    <div className="text-right font-semibold tabular-nums">
                                      {formatarMoeda(saldoMonetarioItem(item))}
                                      <p className="text-xs font-normal text-muted-foreground">
                                        {item.saldo_atual} {item.unidade}
                                      </p>
                                    </div>
                                    <ConsumoBar percentual={pctItem} size="sm" />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <>
          <AddContratoModal
            isOpen={modalAberto}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddModalOpen(false)
                setContratoEdicao(null)
              }
            }}
            contrato={contratoEdicao}
          />
          <AditivoContratoModal
            isOpen={!!contratoAditivo}
            onOpenChange={(open) => {
              if (!open) setContratoAditivo(null)
            }}
            contrato={contratoAditivo}
          />
        </>
      )}
    </div>
  )
}
