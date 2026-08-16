import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, ChevronRight, Loader2, Pencil, Plus } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"

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
import { almoxarifadosService } from "../../services/api"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/almoxarifados")({
  component: Orgaos,
  head: () => ({
    meta: [{ title: pageTitle("Órgãos") }],
  }),
})

function Orgaos() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [orgaoEdicao, setOrgaoEdicao] = useState<any | null>(null)
  const [nome, setNome] = useState("")
  const [localizacao, setLocalizacao] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const [status, setStatus] = useState("todos")
  const editando = Boolean(orgaoEdicao?.id)

  const { data: orgaos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["almoxarifados"],
    queryFn: () => almoxarifadosService.listar(),
  })

  const { data: detalhe, isLoading: isLoadingDetalhe } = useQuery({
    queryKey: ["almoxarifados", expandidoId],
    queryFn: () => almoxarifadosService.detalhar(expandidoId!),
    enabled: expandidoId !== null,
  })

  const mutation = useMutation({
    mutationFn: (dados: { nome: string; localizacao: string; ativo?: boolean }) =>
      editando
        ? almoxarifadosService.atualizar(orgaoEdicao.id, dados)
        : almoxarifadosService.criar(dados),
    onSuccess: () => {
      toast.success(editando ? "Órgão atualizado" : "Órgão cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["almoxarifados"] })
      fecharModal()
    },
    onError: (err: any) => {
      toast.error(editando ? "Erro ao atualizar órgão" : "Erro ao cadastrar", {
        description: err.response?.data?.detail || err.message,
      })
    },
  })

  const abrirNovo = () => {
    setOrgaoEdicao(null)
    setNome("")
    setLocalizacao("")
    setAtivo(true)
    setIsModalOpen(true)
  }

  const abrirEdicao = (orgao: any) => {
    setOrgaoEdicao(orgao)
    setNome(orgao.nome || "")
    setLocalizacao(orgao.localizacao || "")
    setAtivo(orgao.ativo !== false)
    setIsModalOpen(true)
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setOrgaoEdicao(null)
    setNome("")
    setLocalizacao("")
    setAtivo(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ nome, localizacao, ativo })
  }

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return orgaos.filter((al: any) => {
      if (status === "ativos" && !al.ativo) return false
      if (status === "inativos" && al.ativo) return false
      if (!termo) return true
      return [al.nome, al.localizacao].join(" ").toLowerCase().includes(termo)
    })
  }, [orgaos, query, status])

  const novo = isAdmin ? (
    <Button onClick={abrirNovo}>
      <Plus /> Novo Órgão
    </Button>
  ) : null

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Órgãos"
        description="Destino físico dos materiais após a baixa. O saldo controlado permanece no contrato."
        action={novo}
      />

      <ListToolbar
        placeholder="Nome ou localização"
        query={query}
        onQueryChange={setQuery}
        tab={status}
        onTabChange={setStatus}
        tabs={[
          { value: "todos", label: "Todos" },
          { value: "ativos", label: "Ativos" },
          { value: "inativos", label: "Inativos" },
        ]}
        countLabel={`${filtrados.length} ${filtrados.length === 1 ? "órgão" : "órgãos"}`}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar órgãos</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Box} title="Nenhum órgão cadastrado" action={novo} />
      ) : isMobile ? (
        <div className="space-y-3">
          {filtrados.map((al: any) => (
            <div key={al.id} className="space-y-2 rounded-xl border bg-card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{al.nome}</p>
                  <p className="text-sm text-muted-foreground">{al.localizacao || "—"}</p>
                </div>
                <Badge variant={al.ativo ? "success" : "secondary"}>
                  {al.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {isAdmin && (
                <Button variant="outline" className="h-11 w-full" onClick={() => abrirEdicao(al)}>
                  <Pencil /> Editar
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Localização</th>
                <th className="px-4 py-3 text-left">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((al: any) => {
                const expandido = expandidoId === al.id
                const painelId = `orgao-painel-${al.id}`
                return (
                  <Fragment key={al.id}>
                    <tr className="border-t hover:bg-muted/40">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          aria-expanded={expandido}
                          aria-controls={painelId}
                          onClick={() => setExpandidoId(expandido ? null : al.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        >
                          <ChevronRight
                            size={16}
                            className={cn("transition-transform duration-150", expandido && "rotate-90")}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">{al.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{al.localizacao || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={al.ativo ? "success" : "secondary"}>
                          {al.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => abrirEdicao(al)}>
                            <Pencil /> Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                    {expandido && (
                      <tr id={painelId} className="bg-muted/40">
                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 pl-[52px]">
                          {isLoadingDetalhe ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : !detalhe?.destinos?.length ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhum material destinado a este órgão após baixas.
                            </p>
                          ) : (
                            <div className="grid gap-2">
                              {detalhe.destinos.map((destino: any) => (
                                <div
                                  key={`${destino.item_contrato_id}-${destino.contrato_id}`}
                                  className="grid grid-cols-[2fr_1fr_1fr] gap-3 border-t py-2 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">{destino.descricao}</p>
                                    <p className="text-muted-foreground">
                                      Contrato {destino.contrato_numero}/{destino.contrato_ano}
                                    </p>
                                  </div>
                                  <p className="text-right tabular-nums">
                                    {destino.quantidade_destinada} {destino.unidade}
                                  </p>
                                  <p className="text-right font-semibold tabular-nums">
                                    {destino.saldo_contrato} {destino.unidade}
                                  </p>
                                </div>
                              ))}
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
        <Dialog.Root
          open={isModalOpen}
          onOpenChange={(open) => {
            if (!open) fecharModal()
            else setIsModalOpen(true)
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-card p-6 shadow-xl">
              <Dialog.Title className="text-xl font-semibold">
                {editando ? "Editar Órgão" : "Novo Órgão"}
              </Dialog.Title>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                    placeholder="Ex: Secretaria de Educação"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Localização (opcional)</label>
                  <input
                    type="text"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                    placeholder="Ex: Prédio Anexo - Andar 1"
                  />
                </div>
                {editando && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                    />
                    Órgão ativo
                  </label>
                )}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="animate-spin" />}
                    {editando ? "Salvar alterações" : "Salvar"}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
