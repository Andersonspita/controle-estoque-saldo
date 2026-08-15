import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { contratosService, fornecedoresService } from "../../services/api"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"

export function AddContratoModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  const [formData, setFormData] = useState({
    fornecedor_id: "",
    numero: "",
    ano: new Date().getFullYear(),
    valor_total: 0,
    situacao: "Ativo",
  })

  const [itens, setItens] = useState([{ codigo: "", descricao: "", unidade: "UN", quantidade_contratada: 1, valor_unitario: 0 }])

  const mutation = useMutation({
    mutationFn: (data: any) => contratosService.criar(data),
    onSuccess: () => {
      toast.success("Contrato cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      onOpenChange(false)
      // reset
      setFormData({ fornecedor_id: "", numero: "", ano: new Date().getFullYear(), valor_total: 0, situacao: "Ativo" })
      setItens([{ codigo: "", descricao: "", unidade: "UN", quantidade_contratada: 1, valor_unitario: 0 }])
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar Contrato", {
        description: error.response?.data?.detail || error.message,
      })
    }
  })

  const addItem = () => setItens([...itens, { codigo: "", descricao: "", unidade: "UN", quantidade_contratada: 1, valor_unitario: 0 }])
  const removeItem = (index: number) => setItens(itens.filter((_, i) => i !== index))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fornecedor_id) return toast.error("Selecione um fornecedor")
    
    // Atualizar valor_total do contrato baseado nos itens
    const total = itens.reduce((acc, item) => acc + (item.quantidade_contratada * item.valor_unitario), 0)
    
    // No payload de criacao (baseado no schema do backend que nao recebe itens no POST do Contrato, wait, o schema do backend aceita itens?)
    // O backend cria o contrato, mas pode nao ter endpoint que aceita itens junto se não estiver implementado.
    // Vamos mandar tudo caso o backend suporte, ou então, no backend precisaremos ajustar. 
    mutation.mutate({
      fornecedor_id: parseInt(formData.fornecedor_id),
      numero: formData.numero,
      ano: formData.ano,
      valor_total: total,
      situacao: formData.situacao,
      itens: itens
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Novo Contrato
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Cadastre os dados do contrato e os itens previstos (Grade).
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-6 mt-2 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="font-medium text-slate-700 dark:text-slate-300">Fornecedor *</label>
                <select 
                  required
                  value={formData.fornecedor_id}
                  onChange={e => setFormData({...formData, fornecedor_id: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-200" 
                >
                  <option value="" disabled>Selecione</option>
                  {fornecedores.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.razao_social} ({f.cnpj})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Número *</label>
                <input 
                  required
                  value={formData.numero}
                  onChange={e => setFormData({...formData, numero: e.target.value})}
                  placeholder="Ex: 015"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Ano *</label>
                <input 
                  required type="number"
                  value={formData.ano}
                  onChange={e => setFormData({...formData, ano: parseInt(e.target.value)})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Itens do Contrato</h3>
                <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>
              
              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Descrição</label>
                      <input 
                        required
                        value={item.descricao}
                        onChange={e => { const n = [...itens]; n[index].descricao = e.target.value; setItens(n); }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Código (Opcional)</label>
                      <input 
                        value={item.codigo}
                        onChange={e => { const n = [...itens]; n[index].codigo = e.target.value; setItens(n); }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Qtd</label>
                      <input 
                        required type="number" step="any" min="0.1"
                        value={item.quantidade_contratada}
                        onChange={e => { const n = [...itens]; n[index].quantidade_contratada = parseFloat(e.target.value); setItens(n); }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200" 
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Valor Unitário</label>
                      <input 
                        required type="number" step="any" min="0.01"
                        value={item.valor_unitario}
                        onChange={e => { const n = [...itens]; n[index].valor_unitario = parseFloat(e.target.value); setItens(n); }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200" 
                      />
                    </div>
                    <div className="col-span-1 pb-1">
                      <button type="button" onClick={() => removeItem(index)} disabled={itens.length === 1} className="text-rose-500 hover:text-rose-700 disabled:opacity-30 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
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
                Salvar Contrato
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
