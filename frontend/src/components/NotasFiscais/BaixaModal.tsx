import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import { diasAteVencimento, formatarDataBR } from "@/lib/contrato"
import { arredondarQuantidade, formatarMoeda, formatarQuantidade } from "@/lib/money"
import { contratosService, notasFiscaisService } from "../../services/api"

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
  const { isAdmin } = useAuth()
  const [justificativa, setJustificativa] = useState("")
  const [motivoVencido, setMotivoVencido] = useState("")
  const [solicitante, setSolicitante] = useState("")

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const contrato = contratos.find((c: any) => c.id === nf?.contrato_id)
  // Mesma regra do backend: vence no dia seguinte ao data_fim, qualquer que seja a situação.
  const vencido = (diasAteVencimento(contrato?.data_fim) ?? 0) < 0

  // Uma linha por item do contrato: duas linhas da nota no mesmo item somam.
  const previsao = useMemo(() => {
    const itensContrato = (contrato?.itens || []) as any[]
    const porItem = new Map<number, number>()
    for (const item of nf?.itens || []) {
      const id = item.item_contrato_id
      porItem.set(id, (porItem.get(id) || 0) + Number(item.quantidade || 0))
    }
    return [...porItem].map(([id, quantidade]) => {
      const contratoItem = itensContrato.find((it) => it.id === id)
      const atual = Number(contratoItem?.saldo_atual ?? 0)
      const contratada = Number(contratoItem?.quantidade_contratada ?? 0)
      const vu = Number(contratoItem?.valor_unitario ?? 0)
      const resultante = arredondarQuantidade(atual - quantidade)
      return {
        id,
        descricao:
          contratoItem?.descricao || nf.itens.find((i: any) => i.item_contrato_id === id)?.descricao,
        atual,
        resultante,
        valorResultante: resultante * vu,
        negativo: resultante < 0,
        critico: contratada > 0 && resultante / contratada < 0.15,
        unidade: contratoItem?.unidade || "UN",
      }
    })
  }, [contrato, nf])
  const negativos = previsao.filter((item) => item.negativo)

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof notasFiscaisService.baixar>[1]) =>
      notasFiscaisService.baixar(nf.id, data),
    onSuccess: (data) => {
      if (vencido) {
        notasFiscaisService.downloadTermoContratoVencido(nf).catch(() =>
          toast.error("Baixa feita, mas o termo não foi gerado. Tente baixá-lo novamente."),
        )
      }
      toast.success("Baixa realizada com sucesso!", {
        description: `Foram geradas ${data.length} movimentações no histórico.`,
      })
      if (negativos.length) {
        toast.warning("Saldo negativo no contrato", {
          description: `${negativos.length} item(ns) ficaram com saldo negativo: ${negativos
            .map((item) => item.descricao)
            .join(", ")}. Providencie o aditivo.`,
          duration: 10000,
        })
      }
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] })
      queryClient.invalidateQueries({ queryKey: ["previsao-consumo"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error("Erro ao efetuar baixa", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      justificativa: justificativa.trim() || undefined,
      ...(vencido && {
        motivo_contrato_vencido: motivoVencido.trim(),
        solicitante: solicitante.trim(),
      }),
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Executar baixa da NF {nf?.numero}?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            A operação abate o saldo dos itens do contrato e não pode ser desfeita.
          </Dialog.Description>

          {negativos.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-critical/30 bg-critical-bg p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-critical" />
              <p className="text-sm text-critical">
                <strong>Atenção: o saldo ficará negativo</strong> em {negativos.length} item(ns)
                ao efetuar esta baixa (em vermelho abaixo). A baixa é permitida, mas o contrato
                passa a dever quantidade e valor até um aditivo.
              </p>
            </div>
          )}

          {vencido && (
            <div className="flex items-start gap-3 rounded-lg border border-critical/30 bg-critical-bg p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-critical" />
              <p className="text-sm text-critical">
                O contrato {contrato?.numero} venceu em {formatarDataBR(contrato?.data_fim)}.{" "}
                {isAdmin
                  ? "A baixa gera um termo de responsabilidade em PDF, que deve ser assinado por você e por quem solicitou."
                  : "Somente um administrador pode baixar nota em contrato vencido."}
              </p>
            </div>
          )}

          {previsao.length > 0 && (
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo após a baixa</th>
                  </tr>
                </thead>
                <tbody>
                  {previsao.map((item) => (
                    <tr key={item.id} className={`border-t ${item.negativo ? "bg-critical-bg" : ""}`}>
                      <td className="px-3 py-2">{item.descricao}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${item.critico ? "text-critical font-semibold" : ""}`}
                      >
                        {formatarQuantidade(item.atual)} → {formatarQuantidade(item.resultante)} {item.unidade}
                        <span className="block text-xs">{formatarMoeda(item.valorResultante)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Justificativa (opcional)</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Baixa referente a nota emitida em atraso..."
                className="min-h-[88px] w-full rounded-lg border border-input p-3 text-sm outline-none"
              />
            </div>

            {vencido && isAdmin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quem solicitou a baixa *</label>
                  <input
                    required
                    value={solicitante}
                    onChange={(e) => setSolicitante(e.target.value)}
                    placeholder="Nome do solicitante"
                    className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo da baixa em contrato vencido *</label>
                  <textarea
                    required
                    minLength={10}
                    value={motivoVencido}
                    onChange={(e) => setMotivoVencido(e.target.value)}
                    placeholder="Ex: Entrega feita dentro da vigência; aditivo de prazo em tramitação..."
                    className="min-h-[88px] w-full rounded-lg border border-input p-3 text-sm outline-none"
                  />
                </div>
              </>
            )}

            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-card pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending || (vencido && !isAdmin)}>
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
