import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ChevronRight,
  FilePlus2,
  FileSignature,
  Pencil,
  Plus,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/useMobile"
import { pageTitle } from "@/lib/brand"
import { formatarVigencia, rotuloContrato } from "@/lib/contrato"
import { formatarMoeda, totaisContrato } from "@/lib/money"
import { percentualRestante } from "@/lib/status"
import { cn } from "@/lib/utils"
import { ConsumoBar } from "../../components/Common/ConsumoBar"
import { EmptyState } from "../../components/Common/EmptyState"
import { useListSearch } from "../../components/Common/ListSearch"
import { ListToolbar } from "../../components/Common/ListToolbar"
import { PageHeader } from "../../components/Common/PageHeader"
import { AddContratoModal } from "../../components/Contratos/AddContratoModal"
import { AditivoContratoModal } from "../../components/Contratos/AditivoContratoModal"
import { ContratoDetalhePanel } from "../../components/Contratos/ContratoDetalhePanel"
import useAuth from "../../hooks/useAuth"
import { contratosService } from "../../services/api"

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
  const [contratoDetalheId, setContratoDetalheId] = useState<number | null>(
    null,
  )
  const [status, setStatus] = useState("ativos")
  const [saldoCritico, setSaldoCritico] = useState(false)
  const { isAdmin } = useAuth()
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()
  const modalAberto = isAddModalOpen || !!contratoEdicao

  const {
    data: contratos = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return contratos
      .filter((contrato: any) => {
        if (status === "ativos" && contrato.situacao !== "Ativo") return false
        if (status === "encerrados" && contrato.situacao === "Ativo")
          return false
        const totais = totaisContrato(contrato)
        const pct = percentualRestante(
          totais.saldoAtual,
          totais.valorContratado,
        )
        if (saldoCritico && pct > 15) return false
        if (!termo) return true
        return [
          contrato.numero,
          contrato.objeto,
          contrato.licitacao_numero,
          contrato.modalidade,
          contrato.objeto_licitacao,
          contrato.observacao,
          contrato.fornecedor?.razao_social,
          formatarVigencia(contrato.data_inicio, contrato.data_fim),
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo)
      })
      .sort(
        (a: any, b: any) =>
          totaisContrato(b).saldoAtual - totaisContrato(a).saldoAtual,
      )
  }, [contratos, query, status, saldoCritico])

  // Mantém o painel sincronizado com a lista recarregada após editar ou aditivar.
  const contratoDetalhe =
    contratos.find((c: any) => c.id === contratoDetalheId) || null

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
        placeholder="Número, objeto, licitação ou fornecedor"
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
            const pct = percentualRestante(
              totais.saldoAtual,
              totais.valorContratado,
            )
            return (
              <div
                key={contrato.id}
                className="space-y-2.5 rounded-xl border bg-card p-3.5"
              >
                <button
                  type="button"
                  onClick={() => setContratoDetalheId(contrato.id)}
                  className="w-full space-y-2.5 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[15px] font-semibold">
                        {rotuloContrato(contrato)}
                      </p>
                      {contrato.objeto ? (
                        <p className="line-clamp-2 text-sm">
                          {contrato.objeto}
                        </p>
                      ) : null}
                      {contrato.licitacao_numero || contrato.modalidade ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {[contrato.modalidade, contrato.licitacao_numero]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      <p className="truncate text-sm text-muted-foreground">
                        {contrato.fornecedor?.razao_social ||
                          `Fornecedor ID ${contrato.fornecedor_id}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        contrato.situacao === "Ativo" ? "success" : "secondary"
                      }
                    >
                      {contrato.situacao}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatarMoeda(totais.saldoAtual)}
                  </p>
                  <ConsumoBar percentual={pct} />
                  <p className="text-xs text-muted-foreground">
                    {(contrato.itens || []).length}{" "}
                    {(contrato.itens || []).length === 1 ? "item" : "itens"} ·
                    toque para ver o detalhe
                  </p>
                </button>
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
                <th className="px-4 py-3 text-left">Contrato</th>
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
                const pct = percentualRestante(
                  totais.saldoAtual,
                  totais.valorContratado,
                )
                const selecionado = contratoDetalheId === contrato.id

                return (
                  <tr
                    key={contrato.id}
                    className={cn(
                      "border-t transition-colors hover:bg-muted/40",
                      selecionado && "bg-muted/60",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">
                      {/* O nome do contrato é o gatilho do painel de detalhe:
                          botão de verdade, acessível por teclado e leitor de tela. */}
                      <button
                        type="button"
                        onClick={() => setContratoDetalheId(contrato.id)}
                        aria-expanded={selecionado}
                        className="block max-w-full text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <span className="flex items-center gap-1">
                          {rotuloContrato(contrato)}
                          <ChevronRight
                            size={14}
                            aria-hidden
                            className="text-muted-foreground"
                          />
                        </span>
                        {contrato.objeto ? (
                          <span className="block max-w-xs truncate text-xs font-normal text-muted-foreground">
                            {contrato.objeto}
                          </span>
                        ) : null}
                        {contrato.licitacao_numero || contrato.modalidade ? (
                          <span className="block max-w-xs truncate text-xs font-normal text-muted-foreground">
                            {[contrato.modalidade, contrato.licitacao_numero]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>
                        {contrato.fornecedor?.razao_social ||
                          `Fornecedor ID ${contrato.fornecedor_id}`}
                      </p>
                      <p className="text-xs">
                        {itens.length} {itens.length === 1 ? "item" : "itens"}
                      </p>
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
                      <p className="font-semibold tabular-nums">
                        {formatarMoeda(totais.saldoAtual)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totais.qtdSaldo.toLocaleString("pt-BR")} /{" "}
                        {totais.qtdContratada.toLocaleString("pt-BR")} unid.
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          contrato.situacao === "Ativo"
                            ? "success"
                            : "secondary"
                        }
                      >
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ContratoDetalhePanel
        contrato={contratoDetalhe}
        onOpenChange={(open) => {
          if (!open) setContratoDetalheId(null)
        }}
        podeEditar={isAdmin}
        onEditar={(contrato) => {
          setContratoDetalheId(null)
          setContratoAditivo(null)
          setContratoEdicao(contrato)
        }}
        onAditivo={(contrato) => {
          setContratoDetalheId(null)
          setContratoEdicao(null)
          setContratoAditivo(contrato)
        }}
      />

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
