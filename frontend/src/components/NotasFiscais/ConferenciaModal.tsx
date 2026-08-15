import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Link2, Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { contratosService, notasFiscaisService } from "../../services/api"

type VinculoLocal = {
  id: number
  descricao: string
  codigo?: string
  quantidade: number
  unidade: string
  item_contrato_id: number | null
  percentual_confianca?: number | null
  status_identificacao?: string | null
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  CONFIRMADO: { label: "Confirmado", className: "bg-green-100 text-green-700" },
  PROVAVEL: { label: "Provável", className: "bg-blue-100 text-blue-700" },
  SUGERIDO: { label: "Sugerido", className: "bg-amber-100 text-amber-700" },
  MANUAL: { label: "Manual", className: "bg-purple-100 text-purple-700" },
  NAO_IDENTIFICADO: { label: "Não identificado", className: "bg-red-100 text-red-700" },
}

export function ConferenciaModal({
  nf,
  isOpen,
  onOpenChange,
}: {
  nf: any
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [vinculos, setVinculos] = useState<VinculoLocal[]>([])

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
    enabled: isOpen,
  })

  const contrato = contratos.find((c: any) => c.id === nf?.contrato_id)

  useEffect(() => {
    if (!isOpen || !nf) return
    setVinculos(
      (nf.itens || []).map((item: any) => ({
        id: item.id,
        descricao: item.descricao,
        codigo: item.codigo,
        quantidade: item.quantidade,
        unidade: item.unidade,
        item_contrato_id: item.item_contrato_id ?? null,
        percentual_confianca: item.percentual_confianca,
        status_identificacao: item.status_identificacao,
      })),
    )
  }, [isOpen, nf])

  const pendentes = vinculos.filter((v) => !v.item_contrato_id).length

  const mutation = useMutation({
    mutationFn: () =>
      notasFiscaisService.atualizarVinculos(
        nf.id,
        vinculos.map((v) => ({
          id: v.id,
          item_contrato_id: v.item_contrato_id as number,
        })),
      ),
    onSuccess: () => {
      toast.success("Vínculos atualizados")
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error("Não foi possível salvar os vínculos", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    if (pendentes > 0) {
      toast.error("Vincule todos os itens da NF ao contrato")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Conferir vínculos da NF #{nf?.numero}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Ajuste o item do contrato correspondente a cada item da nota antes da baixa.
          </Dialog.Description>

          <form onSubmit={salvar} className="space-y-4 mt-2">
            {pendentes > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-800">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{pendentes} item(ns) ainda sem vínculo com o contrato.</span>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Link2 size={16} /> NF → itens do contrato {contrato ? `${contrato.numero}/${contrato.ano}` : ""}
              </h4>
              <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border dark:border-slate-800 [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[36rem] text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Item da NF</th>
                      <th className="px-3 py-2 text-left">Item do Contrato</th>
                      <th className="px-3 py-2 text-left">Identificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {vinculos.map((v) => {
                      const status =
                        STATUS_LABELS[v.status_identificacao || ""] ||
                        STATUS_LABELS.NAO_IDENTIFICADO
                      return (
                        <tr key={v.id} className="bg-white dark:bg-slate-900">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{v.descricao}</p>
                            {v.codigo && <p className="text-slate-500">Cód: {v.codigo}</p>}
                            <p className="text-slate-500">
                              {v.quantidade} {v.unidade}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={v.item_contrato_id ?? ""}
                              onChange={(e) =>
                                setVinculos((atual) =>
                                  atual.map((item) =>
                                    item.id === v.id
                                      ? {
                                          ...item,
                                          item_contrato_id: e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                          status_identificacao: "MANUAL",
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded p-1.5 text-xs"
                              required
                            >
                              <option value="" disabled>
                                Selecione...
                              </option>
                              {(contrato?.itens || []).map((ic: any) => (
                                <option key={ic.id} value={ic.id}>
                                  {ic.codigo ? `${ic.codigo} - ` : ""}
                                  {ic.descricao} (saldo: {ic.saldo_atual})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.className}`}>
                              {status.label}
                              {v.percentual_confianca != null ? ` (${v.percentual_confianca}%)` : ""}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {vinculos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          Esta nota não possui itens.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pendentes > 0 || mutation.isPending || vinculos.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Salvar vínculos
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
