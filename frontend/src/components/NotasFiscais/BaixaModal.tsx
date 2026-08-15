import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { notasFiscaisService, almoxarifadosService } from "../../services/api"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"

export function BaixaModal({ nf, isOpen, onOpenChange }: { nf: any, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState("")
  const [almoxarifadoId, setAlmoxarifadoId] = useState<string>("")

  const { data: almoxarifados = [], isLoading: isLoadingAlmoxarifados } = useQuery({
    queryKey: ["almoxarifados"],
    queryFn: () => almoxarifadosService.listar(),
  })

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
      // 422 é o nosso erro da CheckConstraint
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
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!almoxarifadoId) {
      toast.error("Selecione um almoxarifado para destinar o material.")
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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl sm:rounded-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Dialog.Title className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            Confirmar Baixa de Saldo
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Você está prestes a abater as quantidades da NF <strong>#{nf?.numero}</strong> do saldo atual do contrato e dar entrada no almoxarifado.
          </Dialog.Description>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 mt-4">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Atenção (Trava de Segurança)</p>
              <p>Se a quantidade desta nota exceder o saldo disponível no contrato, a operação será inteiramente desfeita.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="almoxarifado" className="text-sm font-medium text-slate-700">
                Almoxarifado de Destino <span className="text-red-500">*</span>
              </label>
              <select
                id="almoxarifado"
                value={almoxarifadoId}
                onChange={(e) => setAlmoxarifadoId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:text-slate-900"
                required
                disabled={isLoadingAlmoxarifados}
              >
                <option value="" disabled>
                  {isLoadingAlmoxarifados ? "Carregando..." : "Selecione o almoxarifado"}
                </option>
                {almoxarifados.map((al: any) => (
                  <option key={al.id} value={al.id}>
                    {al.nome} {al.localizacao ? `- ${al.localizacao}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Justificativa (Opcional)</label>
              <textarea 
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Baixa referente a nota emitida em atraso..."
                className="w-full min-h-[100px] p-3 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
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
                disabled={mutation.isPending || isLoadingAlmoxarifados}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Confirmar Execução
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
