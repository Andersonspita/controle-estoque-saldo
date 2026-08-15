import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { almoxarifadosService } from "../../services/api"
import { Box, ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react"
import { Fragment, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import useAuth from "../../hooks/useAuth"
import { pageTitle } from "@/lib/brand"

export const Route = createFileRoute("/_layout/almoxarifados")({
  component: Almoxarifados,
  head: () => ({
    meta: [{ title: pageTitle("Almoxarifados") }],
  }),
})

function Almoxarifados() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nome, setNome] = useState("")
  const [localizacao, setLocalizacao] = useState("")
  const [expandidoId, setExpandidoId] = useState<number | null>(null)

  const { data: almoxarifados = [], isLoading } = useQuery({
    queryKey: ["almoxarifados"],
    queryFn: () => almoxarifadosService.listar(),
  })

  const { data: detalhe, isLoading: isLoadingDetalhe } = useQuery({
    queryKey: ["almoxarifados", expandidoId],
    queryFn: () => almoxarifadosService.detalhar(expandidoId!),
    enabled: expandidoId !== null,
  })

  const mutation = useMutation({
    mutationFn: (novo: any) => almoxarifadosService.criar(novo),
    onSuccess: () => {
      toast.success("Almoxarifado cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["almoxarifados"] })
      setIsModalOpen(false)
      setNome("")
      setLocalizacao("")
    },
    onError: (err: any) => {
      toast.error("Erro ao cadastrar", { description: err.message })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ nome, localizacao })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Box size={28} className="text-blue-600" /> Almoxarifados
          </h1>
          <p className="text-muted-foreground mt-1 dark:text-slate-400">
            Destino físico dos materiais após a baixa. O saldo controlado permanece no contrato.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Novo Almoxarifado
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-4 w-8"></th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Localização</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  <Loader2 className="animate-spin mx-auto" size={24} />
                </td>
              </tr>
            ) : almoxarifados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Nenhum almoxarifado cadastrado.
                </td>
              </tr>
            ) : (
              almoxarifados.map((al: any) => {
                const expandido = expandidoId === al.id
                return (
                  <Fragment key={al.id}>
                    <tr
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setExpandidoId(expandido ? null : al.id)}
                    >
                      <td className="px-4 py-4 text-slate-400">
                        {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {al.nome}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {al.localizacao || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${al.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {al.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                    {expandido && (
                      <tr key={`${al.id}-destinos`} className="bg-slate-50/80 dark:bg-slate-950/50">
                        <td colSpan={4} className="px-6 py-4">
                          {isLoadingDetalhe ? (
                            <Loader2 className="animate-spin text-slate-400" size={18} />
                          ) : !detalhe?.destinos?.length ? (
                            <p className="text-sm text-slate-500">Nenhum material destinado a este almoxarifado após baixas.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="py-2 text-left font-medium">Item / Contrato</th>
                                  <th className="py-2 text-right font-medium">Qtd. destinada</th>
                                  <th className="py-2 text-right font-medium">Saldo do contrato</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {detalhe.destinos.map((destino: any) => (
                                  <tr key={`${destino.item_contrato_id}-${destino.contrato_id}`}>
                                    <td className="py-2">
                                      <p className="font-medium text-slate-800 dark:text-slate-200">{destino.descricao}</p>
                                      <p className="text-slate-400">
                                        Contrato {destino.contrato_numero}/{destino.contrato_ano}
                                        {destino.codigo ? ` · Cód. ${destino.codigo}` : ""}
                                      </p>
                                    </td>
                                    <td className="py-2 text-right text-slate-700 dark:text-slate-200">
                                      {destino.quantidade_destinada} {destino.unidade}
                                    </td>
                                    <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">
                                      {destino.saldo_contrato} {destino.unidade}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl sm:rounded-2xl">
            <Dialog.Title className="text-xl font-semibold text-slate-800">
              Novo Almoxarifado
            </Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Almoxarifado Central"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Localização (Opcional)</label>
                <input
                  type="text"
                  value={localizacao}
                  onChange={e => setLocalizacao(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Prédio Anexo - Andar 1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md flex items-center gap-2"
                >
                  {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>}
    </div>
  )
}
