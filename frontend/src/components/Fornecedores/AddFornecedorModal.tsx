import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { fornecedoresService } from "../../services/api"
import { cpfOuCnpjValido, formatarCpfCnpj } from "@/lib/documento"
import { UFS, listarMunicipiosPorUf, type MunicipioIbge } from "@/lib/ibge"

const campo = "w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-md p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 [&>option]:text-slate-900 [&>option]:dark:bg-slate-900"

const formVazio = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  cidade: "",
  estado: "",
  ativo: true,
}

export function AddFornecedorModal({
  isOpen,
  onOpenChange,
  fornecedor,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  fornecedor?: any | null
}) {
  const queryClient = useQueryClient()
  const editando = Boolean(fornecedor?.id)
  const [formData, setFormData] = useState(formVazio)
  const [municipios, setMunicipios] = useState<MunicipioIbge[]>([])
  const [carregandoCidades, setCarregandoCidades] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (fornecedor) {
      setFormData({
        razao_social: fornecedor.razao_social || "",
        nome_fantasia: fornecedor.nome_fantasia || "",
        cnpj: formatarCpfCnpj(fornecedor.cnpj || ""),
        cidade: fornecedor.cidade || "",
        estado: (fornecedor.estado || "").toUpperCase(),
        ativo: fornecedor.ativo !== false,
      })
    } else {
      setFormData(formVazio)
    }
  }, [isOpen, fornecedor])

  useEffect(() => {
    if (!formData.estado) {
      setMunicipios([])
      return
    }
    let ativo = true
    setCarregandoCidades(true)
    listarMunicipiosPorUf(formData.estado)
      .then((lista) => {
        if (ativo) setMunicipios(lista)
      })
      .catch(() => {
        if (ativo) {
          setMunicipios([])
          toast.error("Não foi possível carregar os municípios da UF")
        }
      })
      .finally(() => {
        if (ativo) setCarregandoCidades(false)
      })
    return () => {
      ativo = false
    }
  }, [formData.estado])

  const mutation = useMutation({
    mutationFn: (dados: typeof formData) =>
      editando
        ? fornecedoresService.atualizar(fornecedor.id, dados)
        : fornecedoresService.criar(dados),
    onSuccess: () => {
      toast.success(editando ? "Fornecedor atualizado" : "Fornecedor cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] })
      onOpenChange(false)
      setFormData(formVazio)
    },
    onError: (error: any) => {
      toast.error(editando ? "Erro ao atualizar fornecedor" : "Erro ao cadastrar fornecedor", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cpfOuCnpjValido(formData.cnpj)) {
      toast.error("Informe um CPF ou CNPJ válido")
      return
    }
    mutation.mutate(formData)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {editando ? "Editar Fornecedor" : "Cadastrar Fornecedor"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            Informe os dados do fornecedor. O CPF/CNPJ é validado pelos dígitos verificadores.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-sm">
            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">Razão Social *</label>
              <input
                required
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                className={campo}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">CPF/CNPJ *</label>
                <input
                  required
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatarCpfCnpj(e.target.value) })}
                  placeholder="CPF ou CNPJ"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Nome Fantasia</label>
                <input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  className={campo}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Estado (UF)</label>
                <select
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value, cidade: "" })
                  }
                  className={campo}
                >
                  <option value="">Selecione a UF</option>
                  {UFS.map((uf) => (
                    <option key={uf.sigla} value={uf.sigla}>
                      {uf.sigla} — {uf.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Município</label>
                <select
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  disabled={!formData.estado || carregandoCidades}
                  className={campo}
                >
                  <option value="">
                    {!formData.estado
                      ? "Selecione a UF primeiro"
                      : carregandoCidades
                        ? "Carregando..."
                        : "Selecione o município"}
                  </option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.nome}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {editando && (
              <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
                Fornecedor ativo
              </label>
            )}

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
                className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {editando ? "Salvar alterações" : "Salvar Fornecedor"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
