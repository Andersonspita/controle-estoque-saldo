import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { contratosService, fornecedoresService, unidadesMedidaService, modalidadesLicitacaoService } from "../../services/api"
import { formatarCpfCnpj } from "@/lib/documento"
import { formatarMoeda } from "@/lib/money"
import { dataISO } from "@/lib/contrato"
import {
  UNIDADES_MEDIDA,
  gruposUnidades,
  resolverUnidade,
} from "@/lib/unidadesMedida"
import { MODALIDADES_LICITACAO } from "@/lib/modalidadesLicitacao"
import {
  baixarModeloPlanilhaItens,
  lerItensDeArquivo,
} from "@/lib/planilhaItensContrato"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"

type ItemForm = {
  id?: number
  numero_item?: number
  descricao: string
  unidade: string
  quantidade_contratada: number
  marca?: string
  valor_unitario: number
  observacao?: string
  saldo_atual?: number
  consumido?: number
}

const itemVazio = (): ItemForm => ({
  descricao: "",
  unidade: "UN",
  quantidade_contratada: 1,
  marca: "",
  valor_unitario: 0,
  observacao: "",
})

const campo =
  "w-full rounded-lg border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-popover [&>option]:text-popover-foreground"

const campoItem =
  "w-full rounded-md border border-input bg-transparent p-1.5 text-xs text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"

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

  const { data: unidadesApi } = useQuery({
    queryKey: ["unidades-medida"],
    queryFn: () => unidadesMedidaService.listar(),
    enabled: isOpen,
    staleTime: 60 * 60 * 1000,
  })
  const unidades = unidadesApi?.length ? unidadesApi : UNIDADES_MEDIDA
  const grupos = gruposUnidades(unidades)

  const { data: modalidadesApi } = useQuery({
    queryKey: ["modalidades-licitacao"],
    queryFn: () => modalidadesLicitacaoService.listar(),
    enabled: isOpen,
    staleTime: 60 * 60 * 1000,
  })
  const modalidades = modalidadesApi?.length ? modalidadesApi : [...MODALIDADES_LICITACAO]

  const [formData, setFormData] = useState({
    fornecedor_id: "",
    numero: "",
    objeto: "",
    licitacao_numero: "",
    modalidade: "",
    objeto_licitacao: "",
    observacao: "",
    data_inicio: "",
    data_fim: "",
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
        objeto: contrato.objeto || "",
        licitacao_numero: contrato.licitacao_numero || "",
        modalidade: contrato.modalidade || "",
        objeto_licitacao: contrato.objeto_licitacao || "",
        observacao: contrato.observacao || "",
        data_inicio: dataISO(contrato.data_inicio),
        data_fim: dataISO(contrato.data_fim),
        situacao: contrato.situacao || "Ativo",
      })
      const carregados = (contrato.itens || []).map((item: any) => ({
        id: item.id,
        numero_item: item.numero_item,
        descricao: item.descricao || "",
        unidade: resolverUnidade(item.unidade),
        quantidade_contratada: item.quantidade_contratada ?? 0,
        marca: item.marca || "",
        valor_unitario: item.valor_unitario ?? 0,
        observacao: item.observacao || "",
        saldo_atual: item.saldo_atual,
        consumido: (item.quantidade_contratada || 0) - (item.saldo_atual || 0),
      }))
      setItens(carregados.length ? carregados : [itemVazio()])
    } else {
      setFormData({
        fornecedor_id: "",
        numero: "",
        objeto: "",
        licitacao_numero: "",
        modalidade: "",
        objeto_licitacao: "",
        observacao: "",
        data_inicio: "",
        data_fim: "",
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
          description: "Preencha ao menos a descrição no modelo oficial.",
        })
        return
      }
      setItens((atuais) => {
        const soRascunho = atuais.every((item) => !item.id && !item.descricao.trim())
        const linhas = importados.map((item) => ({
          ...itemVazio(),
          numero_item: item.numero_item,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade_contratada: item.quantidade_contratada,
          marca: item.marca || "",
          valor_unitario: item.valor_unitario,
          observacao: item.observacao || "",
        }))
        if (soRascunho) return linhas
        return [...atuais, ...linhas]
      })
      toast.success(
        `${importados.length} ${importados.length === 1 ? "item importado" : "itens importados"}`,
        { description: "Revise os dados antes de salvar o contrato." },
      )
    } catch (erro: any) {
      toast.error("Não foi possível ler a planilha", {
        description: erro?.message || "Baixe o modelo oficial .xlsx e preencha sem alterar o cabeçalho.",
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
    if (!formData.objeto.trim()) return toast.error("Informe o objeto do contrato")
    if (!formData.data_inicio || !formData.data_fim) {
      return toast.error("Informe a vigência inicial e a vigência final")
    }
    if (formData.data_fim < formData.data_inicio) {
      return toast.error("A vigência final deve ser igual ou posterior à inicial")
    }
    mutation.mutate({
      fornecedor_id: parseInt(formData.fornecedor_id),
      numero: formData.numero,
      objeto: formData.objeto.trim(),
      licitacao_numero: formData.licitacao_numero.trim() || null,
      modalidade: formData.modalidade || null,
      objeto_licitacao: formData.objeto_licitacao.trim() || null,
      observacao: formData.observacao.trim() || null,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      situacao: formData.situacao,
      valor_total: total,
      itens: itens.map((item, index) => ({
        id: item.id,
        numero_item: item.numero_item || index + 1,
        descricao: item.descricao,
        unidade: item.unidade,
        marca: item.marca?.trim() || null,
        observacao: item.observacao?.trim() || null,
        quantidade_contratada: item.quantidade_contratada,
        valor_unitario: item.valor_unitario,
      })),
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {editando ? "Editar Contrato" : "Novo Contrato"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Cadastre o objeto do contrato, os dados da licitação, a vigência e os itens
            previstos. Você pode digitar os itens ou importar o modelo oficial
            (.xlsx). A planilha precisa manter o cabeçalho: Item, Descrição,
            Unidade, Quantidade, Marca, Valor_unitário e Observação.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-6 mt-2 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-medium">Fornecedor *</label>
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
                <label className="font-medium">Número do contrato *</label>
                <input
                  required
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 015"
                  className={campo}
                />
              </div>
              {editando && (
                <div className="space-y-1">
                  <label className="font-medium">Situação</label>
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
              <div className="space-y-1 sm:col-span-2 md:col-span-4">
                <label className="font-medium">Objeto do contrato *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.objeto}
                  onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                  placeholder="Descreva o objeto contratual"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">
                  Vigência inicial *
                </label>
                <input
                  required
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">
                  Vigência final *
                </label>
                <input
                  required
                  type="date"
                  value={formData.data_fim}
                  min={formData.data_inicio || undefined}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">Número da licitação</label>
                <input
                  value={formData.licitacao_numero}
                  onChange={(e) => setFormData({ ...formData, licitacao_numero: e.target.value })}
                  placeholder="Ex: 012/2026"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">Modalidade</label>
                <select
                  value={formData.modalidade}
                  onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                  className={campo}
                >
                  <option value="">Selecione</option>
                  {modalidades.map((nome: string) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2 md:col-span-4">
                <label className="font-medium">Objeto da licitação</label>
                <textarea
                  rows={2}
                  value={formData.objeto_licitacao}
                  onChange={(e) => setFormData({ ...formData, objeto_licitacao: e.target.value })}
                  placeholder="Objeto do edital ou do processo licitatório"
                  className={campo}
                />
              </div>
              <div className="space-y-1 sm:col-span-2 md:col-span-4">
                <label className="font-medium">Observação</label>
                <textarea
                  rows={2}
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Anotações internas sobre o contrato"
                  className={campo}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">Itens do Contrato</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={baixarModeloPlanilhaItens}
                    className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
                  >
                    <Download size={14} /> Baixar modelo
                  </Button>
                  <input
                    ref={planilhaRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => importarPlanilha(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={importando}
                    onClick={() => planilhaRef.current?.click()}
                    className="h-auto gap-1 px-2 py-1 text-xs text-primary"
                  >
                    {importando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={14} />
                    )}
                    Importar planilha
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addItem}
                    className="h-auto shrink-0 gap-1 px-2 py-1 text-xs text-primary"
                  >
                    <Plus size={14} /> Digitar item
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div
                    key={item.id ?? `novo-${index}`}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3 space-y-1 sm:col-span-1">
                        <label className="text-xs font-medium text-muted-foreground">Item</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={item.numero_item ?? index + 1}
                          onChange={(e) => {
                            const n = [...itens]
                            n[index].numero_item = parseInt(e.target.value) || undefined
                            setItens(n)
                          }}
                          className={campoItem}
                        />
                      </div>
                      <div className="col-span-9 space-y-1 sm:col-span-5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Descrição *
                        </label>
                        <input
                          required
                          value={item.descricao}
                          onChange={(e) => {
                            const n = [...itens]
                            n[index].descricao = e.target.value
                            setItens(n)
                          }}
                          className={campoItem}
                        />
                      </div>
                      <div className="col-span-6 space-y-1 sm:col-span-3">
                        <label className="text-xs font-medium text-muted-foreground">
                          Unidade *
                        </label>
                        <select
                          required
                          value={item.unidade}
                          onChange={(e) => {
                            const n = [...itens]
                            n[index].unidade = e.target.value
                            setItens(n)
                          }}
                          className={campoItem}
                        >
                          {grupos.map((grupo) => (
                            <optgroup key={grupo.grupo} label={grupo.grupo}>
                              {grupo.itens.map((unidade) => (
                                <option key={unidade.sigla} value={unidade.sigla}>
                                  {unidade.sigla} — {unidade.nome}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-6 space-y-1 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Quantidade *
                        </label>
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
                          className={campoItem}
                        />
                      </div>
                      <div className="col-span-2 pb-1 sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={itens.length === 1}
                          className="text-critical hover:text-critical"
                          aria-label="Remover item"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 space-y-1 sm:col-span-4">
                        <label className="text-xs font-medium text-muted-foreground">Marca</label>
                        <input
                          value={item.marca || ""}
                          onChange={(e) => {
                            const n = [...itens]
                            n[index].marca = e.target.value
                            setItens(n)
                          }}
                          className={campoItem}
                        />
                      </div>
                      <div className="col-span-12 space-y-1 sm:col-span-3">
                        <label className="text-xs font-medium text-muted-foreground">
                          Valor unitário *
                        </label>
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
                      <div className="col-span-12 space-y-1 sm:col-span-5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Observação
                        </label>
                        <input
                          value={item.observacao || ""}
                          onChange={(e) => {
                            const n = [...itens]
                            n[index].observacao = e.target.value
                            setItens(n)
                          }}
                          className={campoItem}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right">
                <p className="text-sm font-medium text-foreground">
                  Total do contrato: {formatarMoeda(total)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {editando ? "Salvar alterações" : "Salvar Contrato"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
