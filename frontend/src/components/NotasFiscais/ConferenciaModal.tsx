import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Link2, Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { formatarMoeda, formatarQuantidade } from "@/lib/money"
import { numeroContrato } from "@/lib/contrato"
import { rotuloItemContrato } from "@/lib/rotuloItemContrato"
import { contratosService, notasFiscaisService } from "../../services/api"
import { StatusVinculoBadge } from "./vinculoStatus"

type VinculoLocal = {
  id: number
  descricao: string
  codigo?: string
  quantidade: number
  unidade: string
  valor_unitario: number
  item_contrato_id: number | null
  percentual_confianca?: number | null
  status_identificacao?: string | null
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
        valor_unitario: Number(item.valor_unitario) || 0,
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
          valor_unitario: v.valor_unitario,
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Conferir vínculos da NF #{nf?.numero}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Ajuste o item do contrato correspondente a cada item da nota antes da baixa.
          </Dialog.Description>

          <form onSubmit={salvar} className="mt-2 min-w-0 space-y-4">
            {pendentes > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-bg p-3 text-sm text-critical">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{pendentes} item(ns) ainda sem vínculo com o contrato.</span>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 size={16} /> NF → itens do contrato{" "}
                {contrato ? numeroContrato(contrato) : ""}
              </h4>
              <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[44rem] text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item da NF</th>
                      <th className="px-3 py-2 text-left font-medium">Item do Contrato</th>
                      <th className="w-32 px-3 py-2 text-left font-medium">Valor unitário</th>
                      <th className="px-3 py-2 text-right font-medium">Total do item</th>
                      <th className="px-3 py-2 text-left font-medium">Identificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vinculos.map((v) => (
                      <tr key={v.id} className="bg-card">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{v.descricao}</p>
                          {v.codigo && (
                            <p className="text-muted-foreground">Cód: {v.codigo}</p>
                          )}
                          <p className="text-muted-foreground">
                            {formatarQuantidade(v.quantidade)} {v.unidade}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={v.item_contrato_id ?? ""}
                            onChange={(e) => {
                              const id = e.target.value ? parseInt(e.target.value) : null
                              const ic = contrato?.itens?.find((i: any) => i.id === id)
                              setVinculos((atual) =>
                                atual.map((item) =>
                                  item.id === v.id
                                    ? {
                                        ...item,
                                        item_contrato_id: id,
                                        status_identificacao: "MANUAL",
                                        // Assume o preço do contrato; ainda pode ser ajustado.
                                        ...(ic ? { valor_unitario: Number(ic.valor_unitario) || 0 } : {}),
                                      }
                                    : item,
                                ),
                              )
                            }}
                            className="w-full rounded border border-input bg-transparent p-1.5 text-xs text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"
                            required
                          >
                            <option value="" disabled>
                              Selecione...
                            </option>
                            {(contrato?.itens || []).map((ic: any) => (
                              <option key={ic.id} value={ic.id}>
                                {ic.codigo ? `${ic.codigo} - ` : ""}
                                {rotuloItemContrato(ic)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <MoneyInput
                            value={v.valor_unitario}
                            onValueChange={(valor) =>
                              setVinculos((atual) =>
                                atual.map((item) =>
                                  item.id === v.id ? { ...item, valor_unitario: valor } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-foreground">
                          {formatarMoeda((Number(v.quantidade) || 0) * (v.valor_unitario || 0))}
                        </td>
                        <td className="px-3 py-2">
                          <StatusVinculoBadge
                            status={v.status_identificacao}
                            confianca={v.percentual_confianca}
                          />
                        </td>
                      </tr>
                    ))}
                    {vinculos.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Esta nota não possui itens.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={pendentes > 0 || mutation.isPending || vinculos.length === 0}
              >
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Salvar vínculos
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
