import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { almoxarifadosService, contratosService, notasFiscaisService } from "../../services/api"

export function BaixaModal({
  nf,
  isOpen,
  onOpenChange,
}: {
  nf: any
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState("")
  const [almoxarifadoId, setAlmoxarifadoId] = useState<string>("")

  const { data: almoxarifados = [], isLoading: isLoadingAlmoxarifados } = useQuery({
    queryKey: ["almoxarifados"],
    queryFn: () => almoxarifadosService.listar(),
  })
  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const previsao = useMemo(() => {
    const itensContrato = (contratos.find((c: any) => c.id === nf?.contrato_id)?.itens || []) as any[]
    return (nf?.itens || []).map((item: any) => {
      const contratoItem = itensContrato.find((it) => it.id === item.item_contrato_id)
      const atual = Number(contratoItem?.saldo_atual ?? 0)
      const contratada = Number(contratoItem?.quantidade_contratada ?? 0)
      const resultante = atual - Number(item.quantidade || 0)
      const critico = contratada > 0 && resultante / contratada < 0.15
      return {
        id: item.id,
        descricao: contratoItem?.descricao || item.descricao,
        atual,
        resultante,
        critico,
        unidade: contratoItem?.unidade || item.unidade || "UN",
      }
    })
  }, [contratos, nf])

  const mutation = useMutation({
    mutationFn: (data: { justificativa?: string; almoxarifado_id?: number }) =>
      notasFiscaisService.baixar(nf.id, data),
    onSuccess: (data) => {
      toast.success("Baixa realizada com sucesso!", {
        description: `Foram geradas ${data.length} movimentações no histórico.`,
      })
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] })
      queryClient.invalidateQueries({ queryKey: ["almoxarifados"] })
      queryClient.invalidateQueries({ queryKey: ["previsao-consumo"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      if (error.response?.status === 422) {
        toast.error("Operação abortada: Saldo Insuficiente", {
          description: error.response?.data?.detail,
          duration: 8000,
        })
      } else {
        toast.error("Erro ao efetuar baixa", {
          description: error.response?.data?.detail || error.message,
        })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!almoxarifadoId) {
      toast.error("Selecione um órgão para destinar o material.")
      return
    }
    mutation.mutate({
      justificativa: justificativa.trim() || undefined,
      almoxarifado_id: parseInt(almoxarifadoId),
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Executar baixa da NF {nf?.numero}?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            A operação abate o saldo dos itens do contrato e não pode ser desfeita.
          </Dialog.Description>

          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-bg p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <p className="text-sm text-warning">
              Se a quantidade desta nota exceder o saldo disponível, a operação será inteiramente desfeita.
            </p>
          </div>

          {previsao.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo após a baixa</th>
                  </tr>
                </thead>
                <tbody>
                  {previsao.map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.descricao}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${item.critico ? "text-critical font-semibold" : ""}`}
                      >
                        {item.atual} → {item.resultante} {item.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="almoxarifado" className="text-sm font-medium">
                Órgão de destino <span className="text-critical">*</span>
              </label>
              <select
                id="almoxarifado"
                value={almoxarifadoId}
                onChange={(e) => setAlmoxarifadoId(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                required
                disabled={isLoadingAlmoxarifados}
              >
                <option value="" disabled>
                  {isLoadingAlmoxarifados ? "Carregando..." : "Selecione o órgão"}
                </option>
                {almoxarifados.map((al: any) => (
                  <option key={al.id} value={al.id}>
                    {al.nome} {al.localizacao ? `- ${al.localizacao}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Justificativa (opcional)</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Baixa referente a nota emitida em atraso..."
                className="min-h-[88px] w-full rounded-lg border border-input p-3 text-sm outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending || isLoadingAlmoxarifados}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Confirmar baixa
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
