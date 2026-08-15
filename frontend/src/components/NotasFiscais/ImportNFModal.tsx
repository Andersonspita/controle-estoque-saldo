import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { notasFiscaisService, contratosService } from "../../services/api"
import { toast } from "sonner"
import { UploadCloud, CheckCircle2, Loader2, Link2, AlertTriangle } from "lucide-react"

import * as Dialog from "@radix-ui/react-dialog"

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  CONFIRMADO: { label: "Confirmado", className: "bg-green-100 text-green-700" },
  PROVAVEL: { label: "Provável", className: "bg-blue-100 text-blue-700" },
  SUGERIDO: { label: "Sugerido", className: "bg-amber-100 text-amber-700" },
  MANUAL: { label: "Manual", className: "bg-purple-100 text-purple-700" },
  NAO_IDENTIFICADO: { label: "Não identificado", className: "bg-red-100 text-red-700" },
}

export function ImportNFModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
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

  const contratoSelecionado = contratos.find((c: any) => c.id.toString() === selectedContratoId)

  useEffect(() => {
    if (!parsedData?.itens?.length || !selectedContratoId) {
      setVinculos([])
      return
    }

    setLoadingVinculos(true)
    notasFiscaisService.vincularItens(parseInt(selectedContratoId), parsedData.itens)
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
    }
  })

  const parseMutation = useMutation({
    mutationFn: notasFiscaisService.parseArquivo,
    onSuccess: (data) => {
      setParsedData(data)
      toast.success(data.origem === "ocr" ? "Leitura do DANFE (PDF) concluída!" : "Leitura do XML concluída com sucesso!")
    },
    onError: (error: any) => {
      toast.error("Erro ao ler a Nota Fiscal", {
        description: error.response?.data?.detail || error.message,
      })
    }
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
    setVinculos(prev => prev.map(v => {
      if (v.indice_nf !== indice) return v
      return {
        ...v,
        item_contrato_id: id,
        item_contrato_codigo: itemContrato?.codigo,
        item_contrato_descricao: itemContrato?.descricao,
        percentual_confianca: 100,
        status_identificacao: "MANUAL",
      }
    }))
  }

  const todosVinculados = vinculos.length > 0 && vinculos.every(v => v.item_contrato_id !== null)
  const itensPendentes = vinculos.filter(v => v.item_contrato_id === null).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !parsedData || !contratoSelecionado) return

    if (!todosVinculados) {
      toast.error("Vincule todos os itens da NF a itens do contrato antes de importar.")
      return
    }

    const formData = new FormData()
    formData.append("arquivo_pdf", file)

    const fornecedor_id = contratoSelecionado.fornecedor?.id || contratoSelecionado.fornecedor_id

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
      chave_acesso: parsedData.chave_acesso || Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join(''),
      data_emissao: parsedData.data_emissao || new Date().toISOString().split('T')[0],
      valor_total: parsedData.valor_total,
      itens: itensParaImportar
    }
    formData.append("nota_fiscal_data", JSON.stringify(nfData))

    importMutation.mutate(formData)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl sm:rounded-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-slate-800">
            Importar Nota Fiscal
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Faça o upload do XML ou do PDF (DANFE) da Nota Fiscal. O sistema extrairá os itens para vincular ao saldo do contrato.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
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
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                {file ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{file.name}</p>
                      <p className="text-xs text-slate-500">Clique para trocar de arquivo</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm border flex items-center justify-center text-slate-500">
                      <UploadCloud size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700"><span className="text-blue-600">Clique para enviar</span> ou arraste e solte</p>
                      <p className="text-xs text-slate-500">Arquivos XML ou PDF</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            <div className="space-y-1">
              <label htmlFor="contrato" className="text-sm font-medium text-slate-700">Contrato (controle de saldo)</label>
              <select
                id="contrato"
                value={selectedContratoId}
                onChange={(e) => setSelectedContratoId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:text-slate-900"
                required
                disabled={isLoadingContratos}
              >
                <option value="" disabled>
                  {isLoadingContratos ? "Carregando..." : "Selecione o contrato de origem do saldo"}
                </option>
                {contratos.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.numero}/{c.ano} - {c.fornecedor?.razao_social || "Fornecedor"} ({c.itens?.length || 0} item(ns))
                  </option>
                ))}
              </select>
            </div>

            {file && selectedContratoId && !parsedData && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-3">Arquivo carregado! Deseja extrair os dados da Nota Fiscal?</p>
                <button
                  type="button"
                  onClick={handleParseArquivo}
                  disabled={parseMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-md transition-colors w-full flex items-center justify-center gap-2"
                >
                  {parseMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Extrair Dados
                </button>
              </div>
            )}

            {parsedData && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  Dados Extraídos
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Sucesso</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><strong>Nº NF:</strong> {parsedData.numero}</p>
                  <p><strong>Fornecedor:</strong> {parsedData.fornecedor?.nome}</p>
                  <p><strong>Itens detectados:</strong> {parsedData.itens?.length || 0} item(s)</p>
                  <p><strong>Valor Total:</strong> {
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsedData.valor_total || 0)
                  }</p>
                </div>
              </div>
            )}

            {parsedData && selectedContratoId && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Link2 size={16} /> Vínculo NF → Itens do Contrato
                </h4>

                {loadingVinculos ? (
                  <div className="flex items-center justify-center py-6 text-slate-500 text-sm gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Analisando correspondências...
                  </div>
                ) : vinculos.length > 0 ? (
                  <>
                    {itensPendentes > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-800">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{itensPendentes} item(ns) sem correspondência. Selecione manualmente o item do contrato.</span>
                      </div>
                    )}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left">Item da NF</th>
                            <th className="px-3 py-2 text-left">Item do Contrato</th>
                            <th className="px-3 py-2 text-left">Confiança</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {vinculos.map((v) => {
                            const status = STATUS_LABELS[v.status_identificacao] || STATUS_LABELS.NAO_IDENTIFICADO
                            return (
                              <tr key={v.indice_nf} className="bg-white">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-800 truncate max-w-[180px]" title={v.descricao_nf}>
                                    {v.descricao_nf}
                                  </p>
                                  {v.codigo_nf && <p className="text-slate-500">Cód: {v.codigo_nf}</p>}
                                  <p className="text-slate-500">{v.quantidade} {v.unidade}</p>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={v.item_contrato_id ?? ""}
                                    onChange={(e) => handleVinculoManual(v.indice_nf, e.target.value)}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                                    required
                                  >
                                    <option value="" disabled>Selecione...</option>
                                    {contratoSelecionado?.itens?.map((ic: any) => (
                                      <option key={ic.id} value={ic.id}>
                                        {ic.codigo ? `${ic.codigo} - ` : ""}{ic.descricao} (saldo: {ic.saldo_atual})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.className}`}>
                                    {status.label} ({v.percentual_confianca}%)
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button 
                type="submit" 
                disabled={!parsedData || !todosVinculados || importMutation.isPending || loadingVinculos}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
              >
                {importMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Confirmar Importação
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
