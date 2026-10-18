import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { History, RotateCcw, Trash2 } from "lucide-react"

import { DataTable } from "../../components/Common/DataTable"
import { EmptyState } from "../../components/Common/EmptyState"
import { ListToolbar } from "../../components/Common/ListToolbar"
import { PageHeader } from "../../components/Common/PageHeader"
import { useListSearch } from "../../components/Common/ListSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fornecedoresService, notasFiscaisService } from "../../services/api"
import { pageTitle } from "@/lib/brand"
import { formatarMoeda } from "@/lib/money"
import { useIsMobile } from "@/hooks/useMobile"
import { colunasHistoricoNF, type HistoricoNFRow } from "../../components/NotasFiscais/colunasHistorico"

export const Route = createFileRoute("/_layout/estornos")({
  component: HistoricoNotasFiscaisPage,
  head: () => ({
    meta: [{ title: pageTitle("Estornos e exclusões") }],
  }),
})

function dataHora(valor?: string | null) {
  if (!valor) return "—"
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR")
}

function HistoricoNotasFiscaisPage() {
  const [situacao, setSituacao] = useState("todas")
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()

  const { data: registros = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["notas-fiscais-historico"],
    queryFn: () => notasFiscaisService.listarHistorico(),
  })
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  const fornecedorPorId = useMemo(() => {
    const mapa = new Map<number, string>()
    for (const f of fornecedores) mapa.set(f.id, f.razao_social)
    return mapa
  }, [fornecedores])

  const linhas: HistoricoNFRow[] = useMemo(
    () =>
      registros.map((nf: any) => ({
        ...nf,
        fornecedor_nome: fornecedorPorId.get(nf.fornecedor_id) || "",
      })),
    [registros, fornecedorPorId],
  )

  const filtradas = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return linhas.filter((nf) => {
      if (situacao === "estornadas" && nf.situacao !== "Estornada") return false
      if (situacao === "excluidas" && nf.situacao !== "Excluída") return false
      if (!termo) return true
      return [
        nf.numero,
        nf.fornecedor_nome,
        nf.chave_acesso,
        nf.motivo_exclusao,
        nf.justificativa_estorno,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    })
  }, [linhas, query, situacao])

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Estornos e exclusões"
        description="Notas que tiveram a baixa desfeita ou que foram excluídas, com o responsável e o motivo."
      />

      <ListToolbar
        placeholder="Número, fornecedor, chave ou motivo"
        query={query}
        onQueryChange={setQuery}
        tab={situacao}
        onTabChange={setSituacao}
        tabs={[
          { value: "todas", label: "Todas" },
          { value: "estornadas", label: "Estornadas" },
          { value: "excluidas", label: "Excluídas" },
        ]}
        countLabel={`${filtradas.length} ${filtradas.length === 1 ? "nota" : "notas"}`}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar o histórico</AlertTitle>
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
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtradas.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhum estorno ou exclusão"
              description="Quando uma baixa for desfeita ou uma nota for excluída, o registro aparece aqui."
            />
          ) : (
            filtradas.map((nf) => {
              const excluida = nf.situacao === "Excluída"
              return (
                <div key={nf.id} className="space-y-2.5 rounded-xl border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[15px] font-semibold">#{nf.numero}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {nf.fornecedor_nome || "Fornecedor não identificado"}
                      </p>
                    </div>
                    <Badge variant={excluida ? "critical" : "destructive"}>
                      {excluida ? <Trash2 /> : <RotateCcw />}
                      {nf.situacao}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatarMoeda(nf.valor_total || 0)}
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      {dataHora(excluida ? nf.excluida_em : nf.estornada_em)} ·{" "}
                      {(excluida ? nf.excluida_por_nome : nf.estornada_por_nome) ||
                        "Responsável não identificado"}
                    </p>
                    <p className="text-foreground">
                      {(excluida ? nf.motivo_exclusao : nf.justificativa_estorno) || "—"}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <DataTable
          columns={colunasHistoricoNF()}
          data={filtradas}
          empty={
            <EmptyState
              icon={History}
              title="Nenhum estorno ou exclusão"
              description="Quando uma baixa for desfeita ou uma nota for excluída, o registro aparece aqui."
            />
          }
        />
      )}
    </div>
  )
}
