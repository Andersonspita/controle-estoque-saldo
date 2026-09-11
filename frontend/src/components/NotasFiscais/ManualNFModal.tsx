import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { formatarMoeda, quantidadeInteira } from "@/lib/money"
import { rotuloItemContrato } from "@/lib/rotuloItemContrato"
import { contratosService, notasFiscaisService } from "../../services/api"

type ItemManual = {
  item_contrato_id: string
  codigo: string
  descricao: string
  unidade: string
  quantidade: number
  valor_unitario: number
}

const campo =
  "w-full rounded-lg border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-popover [&>option]:text-popover-foreground"

const campoItem =
  "w-full rounded-md border border-input bg-transparent p-1.5 text-xs text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"

const itemVazio = (): ItemManual => ({
  item_contrato_id: "",
  codigo: "",
  descricao: "",
  unidade: "UN",
  quantidade: 1,
  valor_unitario: 0,
})

function dataLocalISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

function apenasDigitos(texto: string) {
  return texto.replace(/\D/g, "")
}

export function ManualNFModal({
  isOpen,
  onOpenChange,
  nf,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Quando informada, o modal edita esta nota em vez de criar uma nova. */
  nf?: any
}) {
  const editando = Boolean(nf)
  const queryClient = useQueryClient()
  const [contratoId, setContratoId] = useState("")
  const [numero, setNumero] = useState("")
  const [serie, setSerie] = useState("1")
  const [dataEmissao, setDataEmissao] = useState(dataLocalISO())
  const [chaveAcesso, setChaveAcesso] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [itens, setItens] = useState<ItemManual[]>([itemVazio()])

  const { data: contratos = [], isLoading: carregandoContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
    enabled: isOpen,
  })

  const contratoSelecionado = contratos.find((c: any) => String(c.id) === contratoId)

  useEffect(() => {
    if (!isOpen) return
    setArquivo(null)
    if (nf) {
      setContratoId(String(nf.contrato_id ?? ""))
      setNumero(nf.numero ?? "")
      setSerie(nf.serie ?? "1")
      setDataEmissao(nf.data_emissao ?? dataLocalISO())
      setChaveAcesso(nf.chave_acesso ?? "")
      setItens(
        (nf.itens ?? []).map((item: any) => ({
          item_contrato_id: String(item.item_contrato_id ?? ""),
          codigo: item.codigo ?? "",
          descricao: item.descricao ?? "",
          unidade: item.unidade ?? "UN",
          quantidade: Number(item.quantidade) || 0,
          valor_unitario: Number(item.valor_unitario) || 0,
        })),
      )
      return
    }
    setContratoId("")
    setNumero("")
    setSerie("1")
    setDataEmissao(dataLocalISO())
    setChaveAcesso("")
    setItens([itemVazio()])
  }, [isOpen, nf])

  const total = itens.reduce(
    (acc, item) => acc + (Number(item.quantidade) || 0) * (item.valor_unitario || 0),
    0,
  )

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contratoSelecionado) {
        throw new Error("Selecione o contrato.")
      }
      const fornecedorId =
        contratoSelecionado.fornecedor?.id || contratoSelecionado.fornecedor_id
      if (!fornecedorId) {
        throw new Error("O contrato selecionado não possui fornecedor.")
      }

      const chave = apenasDigitos(chaveAcesso)
      if (chave && chave.length !== 44) {
        throw new Error("A chave de acesso, se informada, deve ter 44 dígitos.")
      }

      for (const item of itens) {
        if (!item.item_contrato_id) {
          throw new Error("Vincule todos os itens a um item do contrato.")
        }
        if (!item.descricao.trim()) {
          throw new Error("Informe a descrição de todos os itens.")
        }
        if (!(item.quantidade > 0)) {
          throw new Error("A quantidade de cada item deve ser maior que zero.")
        }
        if (quantidadeInteira(item.unidade) && !Number.isInteger(Number(item.quantidade))) {
          throw new Error(`A quantidade do item "${item.descricao}" deve ser inteira (${item.unidade}).`)
        }
      }

      const payload = {
        contrato_id: contratoSelecionado.id,
        fornecedor_id: fornecedorId,
        numero: numero.trim(),
        serie: serie.trim() || "1",
        chave_acesso: chave || null,
        data_emissao: dataEmissao || null,
        valor_total: total,
        itens: itens.map((item) => ({
          codigo: item.codigo || "",
          descricao: item.descricao.trim(),
          quantidade: Number(item.quantidade),
          unidade: item.unidade || "UN",
          valor_unitario: item.valor_unitario,
          item_contrato_id: Number(item.item_contrato_id),
          percentual_confianca: 100,
          status_identificacao: "MANUAL",
        })),
      }

      if (editando) {
        return notasFiscaisService.atualizar(nf.id, payload)
      }
      if (arquivo) {
        const formData = new FormData()
        formData.append("arquivo_pdf", arquivo)
        formData.append("nota_fiscal_data", JSON.stringify(payload))
        return notasFiscaisService.importar(formData)
      }
      return notasFiscaisService.criar(payload)
    },
    onSuccess: () => {
      toast.success(
        editando ? "Nota fiscal atualizada!" : "Nota fiscal incluída com sucesso!",
        {
          description: editando
            ? "Os dados e os vínculos com o contrato foram regravados."
            : "Os itens foram vinculados ao contrato e aguardam conferência.",
        },
      )
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(
        editando
          ? "Não foi possível salvar a nota fiscal"
          : "Não foi possível incluir a nota fiscal",
        { description: error.response?.data?.detail || error.message },
      )
    },
  })

  const aplicarItemContrato = (indice: number, itemContratoId: string) => {
    const itemContrato = contratoSelecionado?.itens?.find(
      (i: any) => String(i.id) === itemContratoId,
    )
    setItens((atual) =>
      atual.map((item, i) => {
        if (i !== indice) return item
        if (!itemContrato) {
          return { ...item, item_contrato_id: itemContratoId }
        }
        return {
          ...item,
          item_contrato_id: itemContratoId,
          codigo: itemContrato.codigo || item.codigo,
          descricao: itemContrato.descricao || item.descricao,
          unidade: itemContrato.unidade || item.unidade || "UN",
          valor_unitario:
            item.valor_unitario > 0
              ? item.valor_unitario
              : itemContrato.valor_unitario || 0,
        }
      }),
    )
  }

  const atualizarItem = (indice: number, campoPatch: Partial<ItemManual>) => {
    setItens((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, ...campoPatch } : item)),
    )
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {editando ? `Editar nota fiscal #${nf?.numero ?? ""}` : "Incluir nota fiscal manualmente"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {editando
              ? "Cabeçalho e itens são regravados por inteiro. Notas já baixadas precisam ser estornadas antes."
              : "Use esta opção quando não houver XML ou PDF. A importação por arquivo continua disponível no outro botão."}
          </Dialog.Description>

          <form
            className="mt-2 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            <div className="space-y-1">
              <label htmlFor="nf-manual-contrato" className="text-sm font-medium">
                Contrato (controle de saldo)
              </label>
              <select
                id="nf-manual-contrato"
                required
                value={contratoId}
                onChange={(e) => {
                  setContratoId(e.target.value)
                  setItens([itemVazio()])
                }}
                disabled={carregandoContratos}
                className={campo}
              >
                <option value="" disabled>
                  {carregandoContratos ? "Carregando..." : "Selecione o contrato de origem do saldo"}
                </option>
                {contratos.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.numero}/{c.ano} — {c.fornecedor?.razao_social || "Fornecedor"} (
                    {c.itens?.length || 0} item(ns))
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="nf-manual-numero" className="text-sm font-medium">
                  Número *
                </label>
                <input
                  id="nf-manual-numero"
                  required
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 69"
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="nf-manual-serie" className="text-sm font-medium">
                  Série
                </label>
                <input
                  id="nf-manual-serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  className={campo}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="nf-manual-data" className="text-sm font-medium">
                  Emissão *
                </label>
                <input
                  id="nf-manual-data"
                  required
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                  className={campo}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="nf-manual-chave" className="text-sm font-medium">
                Chave de acesso (opcional)
              </label>
              <input
                id="nf-manual-chave"
                inputMode="numeric"
                maxLength={54}
                value={chaveAcesso}
                onChange={(e) => setChaveAcesso(e.target.value)}
                placeholder="44 dígitos, se houver"
                className={campo}
              />
            </div>

            {!editando && (
              <div className="space-y-1">
                <label htmlFor="nf-manual-arquivo" className="text-sm font-medium">
                  XML ou PDF (opcional)
                </label>
                <input
                  id="nf-manual-arquivo"
                  type="file"
                  accept=".pdf,.xml"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className={`${campo} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs`}
                />
                <p className="text-xs text-muted-foreground">
                  Se anexar o arquivo, ele fica disponível para download. Os dados digitados é que entram no sistema.
                </p>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Itens da nota</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItens((atual) => [...atual, itemVazio()])}
                  disabled={!contratoId}
                  className="h-auto gap-1 px-2 py-1 text-xs text-primary"
                >
                  <Plus size={14} /> Adicionar item
                </Button>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3"
                  >
                    <div className="col-span-12 space-y-1 sm:col-span-5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Item do contrato *
                      </label>
                      <select
                        required
                        value={item.item_contrato_id}
                        onChange={(e) => aplicarItemContrato(index, e.target.value)}
                        className={campoItem}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {contratoSelecionado?.itens?.map((ic: any) => (
                          <option key={ic.id} value={ic.id}>
                            {ic.codigo ? `${ic.codigo} — ` : ""}
                            {rotuloItemContrato(ic)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Qtd *</label>
                      <input
                        required
                        type="number"
                        min={quantidadeInteira(item.unidade) ? 1 : 0.01}
                        step={quantidadeInteira(item.unidade) ? 1 : "any"}
                        value={item.quantidade}
                        onChange={(e) =>
                          atualizarItem(index, { quantidade: Number(e.target.value) })
                        }
                        className={campoItem}
                      />
                    </div>
                    <div className="col-span-6 space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                      <input
                        value={item.unidade}
                        onChange={(e) => atualizarItem(index, { unidade: e.target.value })}
                        className={campoItem}
                      />
                    </div>
                    <div className="col-span-10 space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Valor unitário
                      </label>
                      <MoneyInput
                        required
                        value={item.valor_unitario}
                        onValueChange={(valor) => atualizarItem(index, { valor_unitario: valor })}
                      />
                    </div>
                    <div className="col-span-2 pb-1 sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setItens((atual) =>
                            atual.length === 1 ? atual : atual.filter((_, i) => i !== index),
                          )
                        }
                        disabled={itens.length === 1}
                        className="text-critical hover:text-critical"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    {item.descricao ? (
                      <p className="col-span-12 text-xs text-muted-foreground">{item.descricao}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="text-right text-sm font-medium text-foreground">
                Total da nota: {formatarMoeda(total)}
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending || !contratoId}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {editando ? "Salvar alterações" : "Salvar nota fiscal"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
