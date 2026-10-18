import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { cpfOuCnpjValido, formatarCpfCnpj } from "@/lib/documento"
import { UFS, listarMunicipiosPorUf, type MunicipioIbge } from "@/lib/ibge"
import { fornecedoresService } from "../../services/api"

const campo =
  "w-full rounded-lg border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-popover [&>option]:text-popover-foreground"

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {editando ? "Editar Fornecedor" : "Cadastrar Fornecedor"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Informe os dados do fornecedor. O CPF/CNPJ é validado pelos dígitos verificadores.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
            <div className="space-y-1">
              <label className="font-medium">Razão Social *</label>
              <input
                required
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                className={campo}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="font-medium">CPF/CNPJ *</label>
                <input
                  required
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: formatarCpfCnpj(e.target.value) })
                  }
                  placeholder="CPF ou CNPJ"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">Nome Fantasia</label>
                <input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  className={campo}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="font-medium">Estado (UF)</label>
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
                <label className="font-medium">Município</label>
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
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
                Fornecedor ativo
              </label>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {editando ? "Salvar alterações" : "Salvar Fornecedor"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
