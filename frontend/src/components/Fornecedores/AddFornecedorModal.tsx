import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { fornecedoresService } from "../../services/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
}

export function AddFornecedorModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    cidade: "",
    estado: "",
  })

  const mutation = useMutation({
    mutationFn: fornecedoresService.criar,
    onSuccess: () => {
      toast.success("Fornecedor cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] })
      onOpenChange(false)
      setFormData({ razao_social: "", nome_fantasia: "", cnpj: "", cidade: "", estado: "" })
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar Fornecedor", {
        description: error.response?.data?.detail || error.message,
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Cadastrar Fornecedor
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Insira os dados do fornecedor vencedor da licitação.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-sm">
            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">Razão Social *</label>
              <input 
                required
                value={formData.razao_social}
                onChange={e => setFormData({...formData, razao_social: e.target.value})}
                className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">CNPJ *</label>
                <input 
                  required
                  value={formData.cnpj}
                  onChange={e => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})}
                  placeholder="00.000.000/0000-00"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Nome Fantasia</label>
                <input 
                  value={formData.nome_fantasia}
                  onChange={e => setFormData({...formData, nome_fantasia: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Cidade</label>
                <input 
                  value={formData.cidade}
                  onChange={e => setFormData({...formData, cidade: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Estado (UF)</label>
                <input 
                  value={formData.estado}
                  maxLength={2}
                  onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button 
                type="submit" 
                disabled={mutation.isPending}
                className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Salvar Fornecedor
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
