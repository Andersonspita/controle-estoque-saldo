import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { rotuloContrato } from "@/lib/contrato"
import { formatarMoeda, quantidadeInteira } from "@/lib/money"
import { contratosService } from "../../services/api"

type ItemLinha = {
  selecionado: boolean
  quantidade_aditivada: number
  valor_unitario: number
}

const campo =
  "w-full rounded-md border border-input bg-transparent p-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

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
      const vu = linha?.selecionado
        ? Number(linha.valor_unitario)
        : Number(item.valor_unitario) || 0
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Aditivo — {rotuloContrato(contrato)}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Marque os itens que entram no aditivo e informe a quantidade extra. O valor
            unitário pode ser mantido ou atualizado. A quantidade inicial do contrato não
            muda; o saldo atual ganha as unidades aditivadas.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-sm">
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este contrato ainda não possui itens.
              </p>
            ) : (
              <div className="space-y-3">
                {itens.map((item: any) => {
                  const linha = linhas[item.id]
                  const extra = linha?.selecionado
                    ? Number(linha.quantidade_aditivada) || 0
                    : 0
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
                          ? "border-primary/40 bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(linha?.selecionado)}
                          onChange={(e) =>
                            atualizarLinha(item.id, { selecionado: e.target.checked })
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-foreground">
                            {item.descricao}
                          </span>
                          <span className="block text-xs text-muted-foreground">
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
                        <div className="ml-7 mt-3 grid grid-cols-12 items-end gap-2">
                          <div className="col-span-12 space-y-1 sm:col-span-4">
                            <label className="text-xs font-medium text-muted-foreground">
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
                          <div className="col-span-12 space-y-1 sm:col-span-5">
                            <label className="text-xs font-medium text-muted-foreground">
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
                          <div className="col-span-12 pb-1.5 text-xs text-muted-foreground sm:col-span-3">
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

            <div className="space-y-1 pt-2 text-right">
              <p className="text-xs text-muted-foreground">
                {selecionados.length
                  ? `${selecionados.length} ${selecionados.length === 1 ? "item selecionado" : "itens selecionados"}`
                  : "Nenhum item selecionado"}
              </p>
              <p className="text-sm font-medium text-foreground">
                Novo total do contrato: {formatarMoeda(novoTotal)}
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending || itens.length === 0}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Aplicar aditivo
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
