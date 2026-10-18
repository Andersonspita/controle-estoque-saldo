import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { descreverAditivo, rotuloContrato, TIPOS_ADITIVO } from "@/lib/contrato"
import { arredondarQuantidade, formatarMoeda, formatarQuantidade } from "@/lib/money"
import { contratosService } from "../../services/api"

type TipoAditivo = "PRAZO" | "VALOR" | "VALOR_PRAZO" | "REEQUILIBRIO"

const COM_PRAZO: TipoAditivo[] = ["PRAZO", "VALOR_PRAZO"]
const COM_QUANTIDADE: TipoAditivo[] = ["VALOR", "VALOR_PRAZO"]
// Lei 14.133, art. 125: acréscimo de até 25% do valor inicial (50% em reforma).
const LIMITE_ACRESCIMO = 25

const campo =
  "w-full rounded-md border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function diaSeguinte(data?: string | null) {
  if (!data) return ""
  const d = new Date(`${String(data).slice(0, 10)}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString("sv-SE")
}

/** Mesmo cálculo do backend: base na quantidade inicial, truncado na 3ª casa. */
function acrescimo(item: any, percentual: number) {
  const base = Number(item.quantidade_inicial ?? item.quantidade_contratada) || 0
  return Math.floor(base * percentual * 10 + 1e-6) / 1000
}

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
  const itens: any[] = contrato?.itens || []
  const [numero, setNumero] = useState("")
  const [tipo, setTipo] = useState<TipoAditivo>("PRAZO")
  const [percentual, setPercentual] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  useEffect(() => {
    if (!isOpen || !contrato) return
    setNumero(String((contrato.aditivos || []).length + 1))
    setTipo("PRAZO")
    setPercentual("")
    setDataInicio(diaSeguinte(contrato.data_fim))
    setDataFim("")
  }, [isOpen, contrato])

  const comPrazo = COM_PRAZO.includes(tipo)
  const comQuantidade = COM_QUANTIDADE.includes(tipo)
  const reequilibrio = tipo === "REEQUILIBRIO"
  const pct = Number(percentual.replace(",", ".")) || 0
  const acumulado = Number(contrato?.percentual_aditivo || 0) + (comQuantidade ? pct : 0)

  const previa = useMemo(
    () =>
      itens.map((item) => {
        const qtd = Number(item.quantidade_contratada) || 0
        const vu = Number(item.valor_unitario) || 0
        const extra = comQuantidade ? acrescimo(item, pct) : 0
        const novoVu = reequilibrio ? Math.round(vu * (1 + pct / 100) * 100) / 100 : vu
        return { item, qtd, extra, vu, novoVu, total: (qtd + extra) * novoVu }
      }),
    [itens, comQuantidade, reequilibrio, pct],
  )
  const novoTotal = previa.reduce((acc, linha) => acc + linha.total, 0)

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof contratosService.aditivar>[1]) =>
      contratosService.aditivar(contrato.id, data),
    onSuccess: () => {
      toast.success("Aditivo aplicado")
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail
      toast.error("Não foi possível aplicar o aditivo", {
        description: Array.isArray(detail)
          ? detail.map((d: any) => String(d.msg).replace(/^Value error, /, "")).join("; ")
          : detail || error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!numero.trim()) return toast.error("Informe o número do aditivo")
    if (comPrazo) {
      if (!dataInicio || !dataFim) return toast.error("Informe a vigência do aditivo")
      if (dataFim < dataInicio) {
        return toast.error("A vigência final deve ser igual ou posterior à inicial")
      }
    }
    if (comQuantidade && pct <= 0) return toast.error("Informe o percentual de acréscimo")
    if (reequilibrio && (pct === 0 || pct <= -100)) {
      return toast.error("Informe o percentual do reequilíbrio (diferente de zero)")
    }
    mutation.mutate({
      numero: numero.trim(),
      tipo,
      ...(comPrazo && { data_inicio: dataInicio, data_fim: dataFim }),
      ...(tipo !== "PRAZO" && { percentual: pct }),
    })
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
            Prazo prorroga a vigência. Valor acrescenta o percentual à quantidade de todos os
            itens (sobre a quantidade inicial). Reequilíbrio aplica o percentual ao valor
            unitário de todos os itens.
          </Dialog.Description>

          {(contrato.aditivos || []).length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Aditivos anteriores</p>
              <ul className="space-y-0.5">
                {contrato.aditivos.map((aditivo: any) => (
                  <li key={aditivo.id}>{descreverAditivo(aditivo)}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Número do aditivo *
                </label>
                <input
                  required
                  maxLength={50}
                  className={campo}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Tipo de aditivo *
                </label>
                <select
                  className={campo}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoAditivo)}
                >
                  {Object.entries(TIPOS_ADITIVO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comPrazo && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Vigência inicial do aditivo *
                  </label>
                  <input
                    required
                    type="date"
                    className={campo}
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Vigência final do aditivo *
                  </label>
                  <input
                    required
                    type="date"
                    min={dataInicio || undefined}
                    className={campo}
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>
            )}

            {tipo !== "PRAZO" && (
              <div className="space-y-1 sm:max-w-xs">
                <label className="text-xs font-medium text-muted-foreground">
                  {reequilibrio
                    ? "Percentual do reequilíbrio (%) * — negativo reduz"
                    : "Percentual de acréscimo (%) *"}
                </label>
                <input
                  required
                  inputMode="decimal"
                  className={campo}
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  placeholder={reequilibrio ? "Ex: 4,5 ou -2" : "Ex: 25"}
                />
                {comQuantidade && (
                  <p className="text-xs text-muted-foreground">
                    Acumulado no contrato com este aditivo: {acumulado.toLocaleString("pt-BR")}%
                  </p>
                )}
              </div>
            )}

            {comQuantidade && acumulado > LIMITE_ACRESCIMO && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Os acréscimos somam {acumulado.toLocaleString("pt-BR")}%, acima do limite legal de{" "}
                {LIMITE_ACRESCIMO}% (50% só em reforma). Confira antes de aplicar.
              </div>
            )}

            {tipo !== "PRAZO" && itens.length > 0 && (
              <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/95 text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                      <th className="px-3 py-2 text-right font-medium">Valor unitário</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.map(({ item, qtd, extra, vu, novoVu, total }) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          {item.numero_item != null ? `${item.numero_item}. ` : ""}
                          {item.descricao}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {extra
                            ? `${formatarQuantidade(qtd)} → ${formatarQuantidade(arredondarQuantidade(qtd + extra))}`
                            : formatarQuantidade(qtd)}{" "}
                          {item.unidade}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {novoVu !== vu
                            ? `${formatarMoeda(vu)} → ${formatarMoeda(novoVu)}`
                            : formatarMoeda(vu)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatarMoeda(total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tipo !== "PRAZO" && (
              <p className="text-right text-sm font-medium text-foreground">
                Novo total do contrato: {formatarMoeda(novoTotal)}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={mutation.isPending || (tipo !== "PRAZO" && itens.length === 0)}
              >
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
