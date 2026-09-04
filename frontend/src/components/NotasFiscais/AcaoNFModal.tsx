import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { notasFiscaisService } from "../../services/api"

export type AcaoNF = "estorno" | "exclusao"

const MOTIVO_MINIMO = 5

const TEXTOS = {
  estorno: {
    titulo: "Estornar baixa",
    descricao:
      "O saldo volta para o contrato, a quantidade sai do órgão de destino e fica registrada uma movimentação de estorno. Depois disso a nota pode ser editada, excluída ou baixada de novo.",
    rotulo: "Justificativa do estorno",
    placeholder: "Ex.: nota lançada no contrato errado",
    confirmar: "Estornar baixa",
    sucesso: "Baixa estornada",
    erro: "Não foi possível estornar a baixa",
    Icone: RotateCcw,
  },
  exclusao: {
    titulo: "Excluir nota fiscal",
    descricao:
      "A nota sai das listagens, mas continua registrada na tela de estornos e exclusões, com quem excluiu e por quê.",
    rotulo: "Motivo da exclusão",
    placeholder: "Ex.: nota duplicada, importada duas vezes",
    confirmar: "Excluir nota",
    sucesso: "Nota fiscal excluída",
    erro: "Não foi possível excluir a nota fiscal",
    Icone: Trash2,
  },
} as const

export function AcaoNFModal({
  nf,
  acao,
  isOpen,
  onOpenChange,
}: {
  nf: any
  acao: AcaoNF
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [motivo, setMotivo] = useState("")
  const texto = TEXTOS[acao]
  const { Icone } = texto

  useEffect(() => {
    if (isOpen) setMotivo("")
  }, [isOpen, acao])

  const mutation = useMutation({
    mutationFn: () =>
      acao === "estorno"
        ? notasFiscaisService.estornar(nf.id, motivo.trim())
        : notasFiscaisService.excluir(nf.id, motivo.trim()),
    onSuccess: () => {
      toast.success(texto.sucesso, { description: `Nota #${nf.numero}.` })
      // O estorno mexe em saldo de contrato e estoque, então tudo isso recarrega.
      for (const chave of [
        ["notas-fiscais"],
        ["notas-fiscais-historico"],
        ["contratos"],
        ["movimentacoes"],
      ]) {
        queryClient.invalidateQueries({ queryKey: chave })
      }
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(texto.erro, {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icone className="size-5" /> {texto.titulo}
          </DialogTitle>
          <DialogDescription>{texto.descricao}</DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>
            Nota <strong>#{nf?.numero}</strong>
            {nf?.fornecedor_nome ? ` — ${nf.fornecedor_nome}` : ""}. Esta ação fica
            registrada com o seu usuário.
          </AlertDescription>
        </Alert>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (motivoValido) mutation.mutate()
          }}
        >
          <label htmlFor="motivo-acao-nf" className="text-sm font-medium">
            {texto.rotulo}
          </label>
          <textarea
            id="motivo-acao-nf"
            required
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={texto.placeholder}
            className="w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700"
          />
          <p className="text-xs text-muted-foreground">
            Obrigatório, no mínimo {MOTIVO_MINIMO} caracteres.
          </p>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!motivoValido || mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {texto.confirmar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
