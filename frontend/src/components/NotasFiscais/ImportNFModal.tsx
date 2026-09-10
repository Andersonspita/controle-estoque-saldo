import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  UploadCloud,
} from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatarMoeda } from "@/lib/money"
import { rotuloItemContrato } from "@/lib/rotuloItemContrato"
import { contratosService, notasFiscaisService } from "../../services/api"
import { StatusVinculoBadge } from "./vinculoStatus"

type VinculoItem = {
  indice_nf: number
  codigo_nf?: string
  descricao_nf: string
  quantidade: number
  unidade: string
  valor_unitario: number
  item_contrato_id: number | null
  item_contrato_codigo?: string
  item_contrato_descricao?: string
  percentual_confianca: number
  status_identificacao: string
}

const campo =
  "w-full rounded-lg border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-popover [&>option]:text-popover-foreground"

export function ImportNFModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any>(null)
  const [selectedContratoId, setSelectedContratoId] = useState<string>("")
  const [vinculos, setVinculos] = useState<VinculoItem[]>([])
  const [loadingVinculos, setLoadingVinculos] = useState(false)

  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const contratoSelecionado = contratos.find(
    (c: any) => c.id.toString() === selectedContratoId,
  )

  useEffect(() => {
    if (!parsedData?.itens?.length || !selectedContratoId) {
      setVinculos([])
      return
    }

    setLoadingVinculos(true)
    notasFiscaisService
      .vincularItens(parseInt(selectedContratoId), parsedData.itens)
      .then((result) => setVinculos(result.vinculos))
      .catch((error) => {
        toast.error("Erro ao vincular itens ao contrato", {
          description: error.response?.data?.detail || error.message,
        })
        setVinculos([])
      })
      .finally(() => setLoadingVinculos(false))
  }, [parsedData, selectedContratoId])

  const importMutation = useMutation({
    mutationFn: notasFiscaisService.importar,
    onSuccess: () => {
      toast.success("Nota Fiscal importada com sucesso!", {
        description: "Os itens foram vinculados ao contrato e aguardam conferência.",
      })
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      onOpenChange(false)
      setFile(null)
      setParsedData(null)
      setVinculos([])
      setSelectedContratoId("")
    },
    onError: (error: any) => {
      toast.error("Erro ao importar Nota Fiscal", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const parseMutation = useMutation({
    mutationFn: notasFiscaisService.parseArquivo,
    onSuccess: (data) => {
      setParsedData(data)
      toast.success(
        data.origem
          ? "Leitura do DANFE (PDF) concluída!"
          : "Leitura do XML concluída com sucesso!",
      )
    },
    onError: (error: any) => {
      toast.error("Erro ao ler a Nota Fiscal", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const handleParseArquivo = () => {
    if (!file) {
      toast.error("Anexe um arquivo XML ou PDF primeiro.")
      return
    }
    parseMutation.mutate(file)
  }

  const handleVinculoManual = (indice: number, itemContratoId: string) => {
    const id = parseInt(itemContratoId)
    const itemContrato = contratoSelecionado?.itens?.find((i: any) => i.id === id)
    setVinculos((prev) =>
      prev.map((v) => {
        if (v.indice_nf !== indice) return v
        return {
          ...v,
          item_contrato_id: id,
          item_contrato_codigo: itemContrato?.codigo,
          item_contrato_descricao: itemContrato?.descricao,
          percentual_confianca: 100,
          status_identificacao: "MANUAL",
        }
      }),
    )
  }

  const todosVinculados =
    vinculos.length > 0 && vinculos.every((v) => v.item_contrato_id !== null)
  const itensPendentes = vinculos.filter((v) => v.item_contrato_id === null).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !parsedData || !contratoSelecionado) return

    if (!todosVinculados) {
      toast.error("Vincule todos os itens da NF a itens do contrato antes de importar.")
      return
    }

    const formData = new FormData()
    formData.append("arquivo_pdf", file)

    const fornecedor_id =
      contratoSelecionado.fornecedor?.id || contratoSelecionado.fornecedor_id

    const itensParaImportar = vinculos.map((v) => ({
      codigo: v.codigo_nf || "",
      descricao: v.descricao_nf,
      quantidade: v.quantidade,
      unidade: v.unidade,
      valor_unitario: v.valor_unitario,
      item_contrato_id: v.item_contrato_id,
      percentual_confianca: v.percentual_confianca,
      status_identificacao: v.status_identificacao,
    }))

    const nfData = {
      contrato_id: contratoSelecionado.id,
      fornecedor_id: fornecedor_id,
      numero: parsedData.numero,
      serie: parsedData.serie || "1",
      chave_acesso:
        parsedData.chave_acesso ||
        Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(""),
      data_emissao: parsedData.data_emissao || new Date().toISOString().split("T")[0],
      valor_total: parsedData.valor_total,
      itens: itensParaImportar,
    }
    formData.append("nota_fiscal_data", JSON.stringify(nfData))

    importMutation.mutate(formData)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Importar Nota Fiscal
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Faça o upload do XML ou do PDF (DANFE) da Nota Fiscal. O sistema extrairá os
            itens para vincular ao saldo do contrato.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-6">
            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                file
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/40 hover:border-muted-foreground/40"
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.xml"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setParsedData(null)
                  setVinculos([])
                }}
              />
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-3"
              >
                {file ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Clique para trocar de arquivo
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground">
                      <UploadCloud size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        <span className="text-primary">Clique para enviar</span> ou arraste
                        e solte
                      </p>
                      <p className="text-xs text-muted-foreground">Arquivos XML ou PDF</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            <div className="space-y-1">
              <label htmlFor="contrato" className="text-sm font-medium">
                Contrato (controle de saldo)
              </label>
              <select
                id="contrato"
                value={selectedContratoId}
                onChange={(e) => setSelectedContratoId(e.target.value)}
                className={campo}
                required
                disabled={isLoadingContratos}
              >
                <option value="" disabled>
                  {isLoadingContratos
                    ? "Carregando..."
                    : "Selecione o contrato de origem do saldo"}
                </option>
                {contratos.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.numero}/{c.ano} - {c.fornecedor?.razao_social || "Fornecedor"} (
                    {c.itens?.length || 0} item(ns))
                  </option>
                ))}
              </select>
            </div>

            {file && selectedContratoId && !parsedData && (
              <div className="rounded-lg border border-warning/30 bg-warning-bg p-4">
                <p className="mb-3 text-sm text-warning">
                  Arquivo carregado! Deseja extrair os dados da Nota Fiscal?
                </p>
                <Button
                  type="button"
                  onClick={handleParseArquivo}
                  disabled={parseMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {parseMutation.isPending && <Loader2 className="animate-spin" />}
                  Extrair Dados
                </Button>
              </div>
            )}

            {parsedData && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <h4 className="flex items-center justify-between text-sm font-semibold text-foreground">
                  Dados Extraídos
                  <Badge variant="success">Sucesso</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Nº NF:</strong> {parsedData.numero}
                  </p>
                  <p>
                    <strong className="text-foreground">Fornecedor:</strong>{" "}
                    {parsedData.fornecedor?.nome}
                  </p>
                  <p>
                    <strong className="text-foreground">Itens detectados:</strong>{" "}
                    {parsedData.itens?.length || 0} item(s)
                  </p>
                  <p>
                    <strong className="text-foreground">Valor Total:</strong>{" "}
                    {formatarMoeda(parsedData.valor_total || 0)}
                  </p>
                </div>
              </div>
            )}

            {parsedData && selectedContratoId && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 size={16} /> Vínculo NF → Itens do Contrato
                </h4>

                {loadingVinculos ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 size={18} className="animate-spin" />
                    Analisando correspondências...
                  </div>
                ) : vinculos.length > 0 ? (
                  <>
                    {itensPendentes > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-bg p-3 text-sm text-critical">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {itensPendentes} item(ns) sem correspondência. Selecione
                          manualmente o item do contrato.
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border [-webkit-overflow-scrolling:touch]">
                      <table className="w-full min-w-[36rem] text-xs">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Item da NF</th>
                            <th className="px-3 py-2 text-left font-medium">
                              Item do Contrato
                            </th>
                            <th className="px-3 py-2 text-left font-medium">Confiança</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {vinculos.map((v) => (
                            <tr key={v.indice_nf} className="bg-card">
                              <td className="px-3 py-2">
                                <p
                                  className="max-w-[180px] truncate font-medium text-foreground"
                                  title={v.descricao_nf}
                                >
                                  {v.descricao_nf}
                                </p>
                                {v.codigo_nf && (
                                  <p className="text-muted-foreground">Cód: {v.codigo_nf}</p>
                                )}
                                <p className="text-muted-foreground">
                                  {v.quantidade} {v.unidade} ·{" "}
                                  {formatarMoeda(v.valor_unitario)}
                                </p>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={v.item_contrato_id ?? ""}
                                  onChange={(e) =>
                                    handleVinculoManual(v.indice_nf, e.target.value)
                                  }
                                  className="w-full rounded border border-input bg-transparent p-1.5 text-xs text-foreground [&>option]:bg-popover [&>option]:text-popover-foreground"
                                  required
                                >
                                  <option value="" disabled>
                                    Selecione...
                                  </option>
                                  {contratoSelecionado?.itens?.map((ic: any) => (
                                    <option key={ic.id} value={ic.id}>
                                      {ic.codigo ? `${ic.codigo} - ` : ""}
                                      {rotuloItemContrato(ic)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <StatusVinculoBadge
                                  status={v.status_identificacao}
                                  confianca={v.percentual_confianca}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={
                  !parsedData ||
                  !todosVinculados ||
                  importMutation.isPending ||
                  loadingVinculos
                }
              >
                {importMutation.isPending && <Loader2 className="animate-spin" />}
                Confirmar Importação
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
