import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { contratosService, fornecedoresService } from "../../services/api"
import { formatarCpfCnpj } from "@/lib/documento"
import { formatarMoeda } from "@/lib/money"
import {
  baixarModeloPlanilhaItens,
  lerItensDeArquivo,
} from "@/lib/planilhaItensContrato"
import { MoneyInput } from "@/components/ui/money-input"

type ItemForm = {
  id?: number
  codigo: string
  descricao: string
  unidade: string
  quantidade_contratada: number
  valor_unitario: number
  saldo_atual?: number
  consumido?: number
}

const itemVazio = (): ItemForm => ({
  codigo: "",
  descricao: "",
  unidade: "UN",
  quantidade_contratada: 1,
  valor_unitario: 0,
})

const campo =
  "w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 [&>option]:text-slate-900 [&>option]:dark:bg-slate-900"

export function AddContratoModal({
  isOpen,
  onOpenChange,
  contrato,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  contrato?: any | null
}) {
  const queryClient = useQueryClient()
  const editando = Boolean(contrato?.id)

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
    enabled: isOpen,
  })

  const [formData, setFormData] = useState({
    fornecedor_id: "",
    numero: "",
    ano: new Date().getFullYear(),
    situacao: "Ativo",
  })
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()])
  const [importando, setImportando] = useState(false)
  const planilhaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (contrato) {
      setFormData({
        fornecedor_id: String(contrato.fornecedor_id || contrato.fornecedor?.id || ""),
        numero: contrato.numero || "",
        ano: contrato.ano || new Date().getFullYear(),
        situacao: contrato.situacao || "Ativo",
      })
      const carregados = (contrato.itens || []).map((item: any) => ({
        id: item.id,
        codigo: item.codigo || "",
        descricao: item.descricao || "",
        unidade: item.unidade || "UN",
        quantidade_contratada: item.quantidade_contratada ?? 0,
        valor_unitario: item.valor_unitario ?? 0,
        saldo_atual: item.saldo_atual,
        consumido: (item.quantidade_contratada || 0) - (item.saldo_atual || 0),
      }))
      setItens(carregados.length ? carregados : [itemVazio()])
    } else {
      setFormData({
        fornecedor_id: "",
        numero: "",
        ano: new Date().getFullYear(),
        situacao: "Ativo",
      })
      setItens([itemVazio()])
    }
  }, [isOpen, contrato])

  const total = itens.reduce(
    (acc, item) => acc + item.quantidade_contratada * item.valor_unitario,
    0,
  )

  const mutation = useMutation({
    mutationFn: (data: any) =>
      editando ? contratosService.atualizar(contrato.id, data) : contratosService.criar(data),
    onSuccess: () => {
      toast.success(editando ? "Contrato atualizado" : "Contrato cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["contratos"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(editando ? "Erro ao atualizar contrato" : "Erro ao cadastrar contrato", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const addItem = () => setItens([...itens, itemVazio()])

  const importarPlanilha = async (arquivo?: File | null) => {
    if (!arquivo) return
    setImportando(true)
    try {
      const importados = await lerItensDeArquivo(arquivo)
      if (!importados.length) {
        toast.error("Nenhum item encontrado na planilha", {
          description: "Confira o modelo: descrição, quantidade e valor unitário.",
        })
        return
      }
      setItens((atuais) => {
        const soRascunho = atuais.every((item) => !item.id && !item.descricao.trim())
        if (soRascunho) return importados
        return [...atuais, ...importados]
      })
      toast.success(
        `${importados.length} ${importados.length === 1 ? "item importado" : "itens importados"}`,
        { description: "Revise os dados antes de salvar o contrato." },
      )
    } catch (erro: any) {
      toast.error("Não foi possível ler a planilha", {
        description: erro?.message || "Use o modelo CSV ou um arquivo .xlsx.",
      })
    } finally {
      setImportando(false)
      if (planilhaRef.current) planilhaRef.current.value = ""
    }
  }

  const removeItem = (index: number) => {
    const item = itens[index]
    const consumido = item.consumido || 0
    if (consumido > 0) {
      toast.error("Este item já teve baixa e não pode ser removido")
      return
    }
    setItens(itens.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fornecedor_id) return toast.error("Selecione um fornecedor")
    mutation.mutate({
      fornecedor_id: parseInt(formData.fornecedor_id),
      numero: formData.numero,
      ano: formData.ano,
      situacao: formData.situacao,
      valor_total: total,
      itens: itens.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade_contratada: item.quantidade_contratada,
        valor_unitario: item.valor_unitario,
      })),
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {editando ? "Editar Contrato" : "Novo Contrato"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Cadastre os dados do contrato e os itens previstos. Você pode digitar os itens
            ou importar uma planilha (.xlsx ou .csv). Para acrescentar quantidade em itens
            já existentes, use o botão Aditivo na lista.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-6 mt-2 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-medium text-slate-700 dark:text-slate-300">Fornecedor *</label>
                <select
                  required
                  value={formData.fornecedor_id}
                  onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                  className={campo}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {fornecedores.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.razao_social} ({formatarCpfCnpj(f.cnpj || "")})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Número *</label>
                <input
                  required
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 015"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Ano *</label>
                <input
                  required
                  type="number"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                  className={campo}
                />
              </div>
              {editando && (
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Situação</label>
                  <select
                    value={formData.situacao}
                    onChange={(e) => setFormData({ ...formData, situacao: e.target.value })}
                    className={campo}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Encerrado">Encerrado</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Itens do Contrato</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={baixarModeloPlanilhaItens}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 text-xs font-medium flex items-center gap-1"
                  >
                    <Download size={14} /> Baixar modelo
                  </button>
                  <input
                    ref={planilhaRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="hidden"
                    onChange={(e) => importarPlanilha(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={importando}
                    onClick={() => planilhaRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                  >
                    {importando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={14} />
                    )}
                    Importar planilha
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Digitar item
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div key={item.id ?? `novo-${index}`} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Descrição</label>
                      <input
                        required
                        value={item.descricao}
                        onChange={(e) => {
                          const n = [...itens]
                          n[index].descricao = e.target.value
                          setItens(n)
                        }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Código</label>
                      <input
                        value={item.codigo}
                        onChange={(e) => {
                          const n = [...itens]
                          n[index].codigo = e.target.value
                          setItens(n)
                        }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Qtd</label>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0.1"
                        value={item.quantidade_contratada}
                        onChange={(e) => {
                          const n = [...itens]
                          n[index].quantidade_contratada = parseFloat(e.target.value)
                          setItens(n)
                        }}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="col-span-10 sm:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Valor unitário</label>
                      <MoneyInput
                        required
                        value={item.valor_unitario}
                        onValueChange={(valor) => {
                          const n = [...itens]
                          n[index].valor_unitario = valor
                          setItens(n)
                        }}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 pb-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={itens.length === 1}
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-30 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Total do contrato: {formatarMoeda(total)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
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
                disabled={mutation.isPending}
                className="px-4 py-2 font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {editando ? "Salvar alterações" : "Salvar Contrato"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
