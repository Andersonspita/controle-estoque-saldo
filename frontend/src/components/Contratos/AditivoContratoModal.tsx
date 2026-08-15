import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { contratosService } from "../../services/api"
import { formatarMoeda, quantidadeInteira } from "@/lib/money"
import { MoneyInput } from "@/components/ui/money-input"

type ItemLinha = {
  selecionado: boolean
  quantidade_aditivada: number
  valor_unitario: number
}

const campo =
  "w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"

export function AditivoContratoModal({
  isOpen,
  onOpenChange,
  contrato,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  contrato?: any | null
}) {
  const queryClient = useQueryClient()
  const itens = contrato?.itens || []
  const [linhas, setLinhas] = useState<Record<number, ItemLinha>>({})

  useEffect(() => {
    if (!isOpen || !contrato) return
    const inicial: Record<number, ItemLinha> = {}
    for (const item of contrato.itens || []) {
      inicial[item.id] = {
        selecionado: false,
        quantidade_aditivada: quantidadeInteira(item.unidade) ? 1 : 0.1,
        valor_unitario: item.valor_unitario ?? 0,
      }
    }
    setLinhas(inicial)
  }, [isOpen, contrato])

  const selecionados = useMemo(
    () => (contrato?.itens || []).filter((item: any) => linhas[item.id]?.selecionado),
    [contrato, linhas],
  )

  const novoTotal = useMemo(() => {
    return (contrato?.itens || []).reduce((acc: number, item: any) => {
      const linha = linhas[item.id]
      const extra = linha?.selecionado ? Number(linha.quantidade_aditivada) || 0 : 0
      const vu = linha?.selecionado ? Number(linha.valor_unitario) : Number(item.valor_unitario) || 0
      return acc + ((Number(item.quantidade_contratada) || 0) + extra) * vu
    }, 0)
  }, [contrato, linhas])

  const mutation = useMutation({
    mutationFn: (data: any) => contratosService.aditivar(contrato.id, data),
    onSuccess: () => {
      toast.success("Aditivo aplicado")
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error("Não foi possível aplicar o aditivo", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const atualizarLinha = (id: number, patch: Partial<ItemLinha>) => {
    setLinhas((atuais) => ({
      ...atuais,
      [id]: { ...atuais[id], ...patch },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selecionados.length) {
      toast.error("Selecione ao menos um item para aditivar")
      return
    }
    const itensEnvio = []
    for (const item of selecionados) {
      const linha = linhas[item.id]
      const extra = Number(linha?.quantidade_aditivada) || 0
      if (extra <= 0) {
        toast.error(`Informe a quantidade a aditivar em "${item.descricao}"`)
        return
      }
      if (quantidadeInteira(item.unidade) && Math.abs(extra - Math.round(extra)) > 1e-9) {
        toast.error(`Em ${item.unidade}, a quantidade do aditivo deve ser inteira`, {
          description: item.descricao,
        })
        return
      }
      itensEnvio.push({
        item_id: item.id,
        quantidade_aditivada: extra,
        valor_unitario: Number(linha.valor_unitario),
      })
    }
    mutation.mutate({ itens: itensEnvio })
  }

  if (!contrato) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Aditivo — {contrato.numero}/{contrato.ano}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Marque os itens que entram no aditivo e informe a quantidade extra. O valor unitário
            pode ser mantido ou atualizado. A quantidade inicial do contrato não muda; o saldo
            atual ganha as unidades aditivadas.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-sm">
            {itens.length === 0 ? (
              <p className="text-sm text-slate-500">Este contrato ainda não possui itens.</p>
            ) : (
              <div className="space-y-3">
                {itens.map((item: any) => {
                  const linha = linhas[item.id]
                  const extra = linha?.selecionado ? Number(linha.quantidade_aditivada) || 0 : 0
                  const vu = linha?.selecionado
                    ? Number(linha.valor_unitario)
                    : Number(item.valor_unitario) || 0
                  const novaQtd = (Number(item.quantidade_contratada) || 0) + extra
                  const inteira = quantidadeInteira(item.unidade)

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        linha?.selecionado
                          ? "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(linha?.selecionado)}
                          onChange={(e) => atualizarLinha(item.id, { selecionado: e.target.checked })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-800 dark:text-slate-100">
                            {item.descricao}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            Atual: {item.quantidade_contratada} {item.unidade}
                            {item.quantidade_inicial != null &&
                            item.quantidade_inicial !== item.quantidade_contratada
                              ? ` · inicial ${item.quantidade_inicial}`
                              : ""}
                            {" · "}
                            {formatarMoeda(item.valor_unitario)}
                          </span>
                        </span>
                      </label>

                      {linha?.selecionado && (
                        <div className="mt-3 ml-7 grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 sm:col-span-4 space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Qtd a aditivar
                            </label>
                            <input
                              required
                              type="number"
                              min={inteira ? 1 : 0.001}
                              step={inteira ? 1 : "any"}
                              value={linha.quantidade_aditivada}
                              onChange={(e) =>
                                atualizarLinha(item.id, {
                                  quantidade_aditivada: parseFloat(e.target.value),
                                })
                              }
                              className={campo}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-5 space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Valor unitário
                            </label>
                            <MoneyInput
                              required
                              value={linha.valor_unitario}
                              onValueChange={(valor) =>
                                atualizarLinha(item.id, { valor_unitario: valor })
                              }
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-3 text-xs text-slate-500 dark:text-slate-400 pb-1.5">
                            Nova qtd: {novaQtd} {item.unidade}
                            <br />
                            {formatarMoeda(novaQtd * vu)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="text-right space-y-1 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selecionados.length
                  ? `${selecionados.length} ${selecionados.length === 1 ? "item selecionado" : "itens selecionados"}`
                  : "Nenhum item selecionado"}
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Novo total do contrato: {formatarMoeda(novoTotal)}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={mutation.isPending || itens.length === 0}
                className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Aplicar aditivo
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
