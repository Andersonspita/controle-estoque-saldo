import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { numeroContrato, saldoAposLancamento } from "@/lib/contrato"
import { apenasDigitos, formatarCpfCnpj } from "@/lib/documento"
import {
  arredondarQuantidade,
  formatarMoeda,
  formatarQuantidade,
  PASSO_QUANTIDADE,
} from "@/lib/money"
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
  criterio_identificacao?: string | null
  /** Linha digitada pelo usuário (não veio da leitura do arquivo). */
  manual?: boolean
}

type Cabecalho = { numero: string; serie: string; data_emissao: string; valor_total: number }

const CRITERIO_LABELS: Record<string, string> = {
  codigo: "pelo código",
  gtin: "pelo GTIN",
  descricao_fornecedor: "pela descrição do fornecedor",
  descricao_contrato: "pela descrição do contrato",
}

const campo =
  "w-full rounded-lg border border-input bg-transparent p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const campoPequeno =
  "w-full rounded border border-input bg-transparent p-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const hoje = () => new Date().toLocaleDateString("sv-SE")

function linhaManual(indice: number): VinculoItem {
  return {
    indice_nf: indice,
    descricao_nf: "",
    quantidade: 0,
    unidade: "UN",
    valor_unitario: 0,
    item_contrato_id: null,
    percentual_confianca: 100,
    status_identificacao: "MANUAL",
    manual: true,
  }
}

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
  const [cabecalho, setCabecalho] = useState<Cabecalho>({
    numero: "",
    serie: "",
    data_emissao: "",
    valor_total: 0,
  })
  const [selectedContratoId, setSelectedContratoId] = useState<string>("")
  const [vinculos, setVinculos] = useState<VinculoItem[]>([])
  const [loadingVinculos, setLoadingVinculos] = useState(false)
  const [falhaLeitura, setFalhaLeitura] = useState("")
  const [arrastando, setArrastando] = useState(false)
  // No preenchimento manual o total da nota acompanha a soma dos itens até o usuário digitar outro.
  const [totalAutomatico, setTotalAutomatico] = useState(false)

  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const contratoSelecionado = contratos.find(
    (c: any) => c.id.toString() === selectedContratoId,
  )

  useEffect(() => {
    if (!parsedData?.itens?.length || !selectedContratoId) {
      // Leitura sem itens (ou manual): começa com uma linha em branco para digitar.
      setVinculos(parsedData && selectedContratoId ? [linhaManual(0)] : [])
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

  const limpar = () => {
    setFile(null)
    setParsedData(null)
    setVinculos([])
    setSelectedContratoId("")
    setFalhaLeitura("")
  }

  const importMutation = useMutation({
    mutationFn: notasFiscaisService.importar,
    onSuccess: () => {
      toast.success("Nota Fiscal importada com sucesso!", {
        description: "Os itens foram vinculados ao contrato e aguardam conferência.",
      })
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] })
      onOpenChange(false)
      limpar()
    },
    onError: (error: any) => {
      toast.error("Erro ao importar Nota Fiscal", {
        description: error.response?.data?.detail || error.message,
      })
    },
  })

  const carregarDados = (data: any) => {
    setParsedData(data)
    setFalhaLeitura("")
    setTotalAutomatico(!(Number(data.valor_total) > 0))
    setCabecalho({
      numero: data.numero ? String(data.numero) : "",
      serie: data.serie ? String(data.serie) : "",
      data_emissao: data.data_emissao ? String(data.data_emissao).slice(0, 10) : hoje(),
      valor_total: Number(data.valor_total) || 0,
    })
  }

  const parseMutation = useMutation({
    mutationFn: notasFiscaisService.parseArquivo,
    onSuccess: (data) => {
      carregarDados(data)
      if (!data.itens?.length) {
        toast.warning("A leitura não encontrou itens", {
          description: "Inclua os itens manualmente, com quantidade e valor.",
        })
      } else {
        toast.success(
          data.origem
            ? "Leitura do DANFE (PDF) concluída!"
            : "Leitura do XML concluída com sucesso!",
        )
      }
    },
    onError: (error: any) => {
      setFalhaLeitura(error.response?.data?.detail || error.message)
    },
  })

  // Nota ilegível: segue com o arquivo anexado e tudo digitado pelo usuário.
  const preencherManualmente = () => {
    carregarDados({ itens: [], manual: true })
  }

  const selecionarArquivo = (arquivo: File | null) => {
    if (arquivo && !/\.(pdf|xml)$/i.test(arquivo.name)) {
      toast.error("Envie um arquivo XML ou PDF da nota fiscal.")
      return
    }
    setFile(arquivo)
    setParsedData(null)
    setVinculos([])
    setFalhaLeitura("")
  }

  // Sem isto o navegador abre o arquivo solto numa aba nova.
  const soltarArquivo = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    selecionarArquivo(e.dataTransfer.files?.[0] || null)
  }

  const handleParseArquivo = () => {
    if (!file) {
      toast.error("Anexe um arquivo XML ou PDF primeiro.")
      return
    }
    parseMutation.mutate(file)
  }

  const atualizarLinha = (indice: number, patch: Partial<VinculoItem>) =>
    setVinculos((prev) => prev.map((v) => (v.indice_nf === indice ? { ...v, ...patch } : v)))

  const handleVinculoManual = (indice: number, itemContratoId: string) => {
    const id = parseInt(itemContratoId)
    const itemContrato = contratoSelecionado?.itens?.find((i: any) => i.id === id)
    setVinculos((prev) =>
      prev.map((v) => {
        if (v.indice_nf !== indice) return v
        // Linha digitada à mão assume descrição, unidade e preço do item do contrato.
        return {
          ...v,
          item_contrato_id: id,
          item_contrato_codigo: itemContrato?.codigo,
          item_contrato_descricao: itemContrato?.descricao,
          percentual_confianca: 100,
          status_identificacao: "MANUAL",
          criterio_identificacao: null,
          ...(v.manual && itemContrato
            ? {
                descricao_nf: itemContrato.descricao,
                unidade: itemContrato.unidade || v.unidade,
                valor_unitario: Number(itemContrato.valor_unitario) || 0,
              }
            : {}),
        }
      }),
    )
  }

  const adicionarLinha = () =>
    setVinculos((prev) => [
      ...prev,
      linhaManual(prev.reduce((max, v) => Math.max(max, v.indice_nf), -1) + 1),
    ])

  const removerLinha = (indice: number) =>
    setVinculos((prev) => prev.filter((v) => v.indice_nf !== indice))

  const somaItens = vinculos.reduce(
    (acc, v) => acc + (Number(v.quantidade) || 0) * (Number(v.valor_unitario) || 0),
    0,
  )
  const saldoApos = saldoAposLancamento(contratoSelecionado?.itens, vinculos)
  const itensNegativos = [...saldoApos.values()].filter((saldo) => saldo < 0).length
  const valorTotalNota = totalAutomatico
    ? Math.round(somaItens * 100) / 100
    : cabecalho.valor_total
  const itensPendentes = vinculos.filter(
    (v) => v.item_contrato_id === null || !(Number(v.quantidade) > 0),
  ).length
  const prontoParaImportar =
    vinculos.length > 0 && itensPendentes === 0 && cabecalho.numero.trim() !== ""

  const cnpjNota = apenasDigitos(parsedData?.fornecedor?.cnpj || "")
  const cnpjContrato = apenasDigitos(contratoSelecionado?.fornecedor?.cnpj || "")
  const credorDivergente = Boolean(cnpjNota && cnpjContrato && cnpjNota !== cnpjContrato)
  const credorIlegivel = Boolean(parsedData && contratoSelecionado && !cnpjNota)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !parsedData || !contratoSelecionado) return

    if (!cabecalho.numero.trim()) {
      toast.error("Informe o número da nota fiscal.")
      return
    }
    if (!vinculos.length) {
      toast.error("Inclua ao menos um item na nota.")
      return
    }
    if (itensPendentes) {
      toast.error("Cada item precisa de um item do contrato e de quantidade maior que zero.")
      return
    }

    const formData = new FormData()
    formData.append("arquivo_pdf", file)

    const fornecedor_id =
      contratoSelecionado.fornecedor?.id || contratoSelecionado.fornecedor_id

    const itensParaImportar = vinculos.map((v) => ({
      codigo: v.codigo_nf || "",
      descricao: v.descricao_nf || v.item_contrato_descricao || "Item",
      quantidade: arredondarQuantidade(v.quantidade),
      unidade: v.unidade,
      valor_unitario: v.valor_unitario,
      item_contrato_id: v.item_contrato_id,
      percentual_confianca: v.percentual_confianca,
      status_identificacao: v.status_identificacao,
    }))

    const nfData = {
      contrato_id: contratoSelecionado.id,
      fornecedor_id: fornecedor_id,
      numero: cabecalho.numero.trim(),
      serie: cabecalho.serie.trim() || null,
      chave_acesso: parsedData.chave_acesso || null,
      data_emissao: cabecalho.data_emissao || null,
      // Sem valor informado, o backend usa a soma dos itens.
      valor_total: valorTotalNota > 0 ? valorTotalNota : null,
      itens: itensParaImportar,
    }
    formData.append("nota_fiscal_data", JSON.stringify(nfData))

    importMutation.mutate(formData)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        />
        <Dialog.Content
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            Importar Nota Fiscal
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Faça o upload do XML ou do PDF (DANFE) da Nota Fiscal. O sistema extrai os itens
            para vincular ao saldo do contrato. Se a nota não for legível, preencha os dados
            e os itens manualmente — o arquivo fica anexado.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 min-w-0 space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "copy"
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltarArquivo}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                arrastando
                  ? "border-primary bg-primary/10"
                  : file
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
                  selecionarArquivo(e.target.files?.[0] || null)
                  e.target.value = ""
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
                    {numeroContrato(c)} - {c.fornecedor?.razao_social || "Fornecedor"} (
                    {c.itens?.length || 0} item(ns))
                  </option>
                ))}
              </select>
            </div>

            {file && selectedContratoId && !parsedData && (
              <div className="space-y-3 rounded-lg border border-warning/30 bg-warning-bg p-4">
                {falhaLeitura ? (
                  <p className="text-sm text-critical">
                    Não foi possível ler a nota: {falhaLeitura}
                  </p>
                ) : (
                  <p className="text-sm text-warning">
                    Arquivo carregado! Deseja extrair os dados da Nota Fiscal?
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleParseArquivo}
                    disabled={parseMutation.isPending}
                    className="flex-1"
                    variant="outline"
                  >
                    {parseMutation.isPending && <Loader2 className="animate-spin" />}
                    {falhaLeitura ? "Tentar ler de novo" : "Extrair Dados"}
                  </Button>
                  <Button
                    type="button"
                    onClick={preencherManualmente}
                    disabled={parseMutation.isPending}
                    className="flex-1"
                    variant="outline"
                  >
                    <PencilLine /> Preencher manualmente
                  </Button>
                </div>
              </div>
            )}

            {parsedData && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <h4 className="flex items-center justify-between text-sm font-semibold text-foreground">
                  Dados da nota
                  {parsedData.manual ? (
                    <Badge variant="secondary">Preenchimento manual</Badge>
                  ) : (
                    <Badge variant="success">Lidos do arquivo — confira</Badge>
                  )}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Número *</label>
                    <input
                      required
                      className={campo}
                      value={cabecalho.numero}
                      onChange={(e) => setCabecalho({ ...cabecalho, numero: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Série</label>
                    <input
                      className={campo}
                      value={cabecalho.serie}
                      onChange={(e) => setCabecalho({ ...cabecalho, serie: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de emissão
                    </label>
                    <input
                      type="date"
                      className={campo}
                      value={cabecalho.data_emissao}
                      onChange={(e) =>
                        setCabecalho({ ...cabecalho, data_emissao: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Valor total{totalAutomatico ? " (soma dos itens)" : ""}
                    </label>
                    <MoneyInput
                      value={valorTotalNota}
                      onValueChange={(valor) => {
                        setTotalAutomatico(false)
                        setCabecalho({ ...cabecalho, valor_total: valor })
                      }}
                    />
                    {!totalAutomatico && (
                      <button
                        type="button"
                        className="text-[11px] text-primary underline-offset-2 hover:underline"
                        onClick={() => setTotalAutomatico(true)}
                      >
                        Usar a soma dos itens
                      </button>
                    )}
                  </div>
                </div>
                {parsedData.fornecedor?.nome && (
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Emitente lido:</strong>{" "}
                    {parsedData.fornecedor.nome}
                    {cnpjNota ? ` · ${formatarCpfCnpj(cnpjNota)}` : ""}
                  </p>
                )}
              </div>
            )}

            {credorDivergente && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  O CNPJ do emitente da nota ({formatarCpfCnpj(cnpjNota)}) não é o do credor do
                  contrato ({formatarCpfCnpj(cnpjContrato)} —{" "}
                  {contratoSelecionado?.fornecedor?.razao_social}). Confira se escolheu o
                  contrato certo. Se seguir, a nota fica registrada no credor do contrato e os
                  itens devem ser vinculados manualmente.
                </span>
              </div>
            )}
            {credorIlegivel && !credorDivergente && (
              <p className="text-xs text-muted-foreground">
                Não foi possível ler o CNPJ do emitente. Confira se a nota é do credor{" "}
                {contratoSelecionado?.fornecedor?.razao_social}.
              </p>
            )}

            {parsedData && selectedContratoId && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 size={16} /> Itens da nota → Itens do contrato
                </h4>

                {loadingVinculos ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 size={18} className="animate-spin" />
                    Analisando correspondências...
                  </div>
                ) : (
                  <>
                    {itensNegativos > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-bg p-3 text-sm text-critical">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>Atenção: o saldo ficará negativo</strong> em {itensNegativos} item(ns)
                        do contrato ao efetuar a baixa desta nota. O lançamento é permitido.
                      </span>
                    </div>
              )}
                    {itensPendentes > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-bg p-3 text-sm text-critical">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {itensPendentes} item(ns) sem item do contrato ou sem quantidade.
                          Selecione o item e informe a quantidade.
                        </span>
                      </div>
                    )}
                    {vinculos.length > 0 && (
                      <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border [-webkit-overflow-scrolling:touch]">
                        <table className="w-full min-w-[50rem] text-xs">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Item da NF</th>
                              <th className="px-3 py-2 text-left font-medium">
                                Item do contrato
                              </th>
                              <th className="w-28 px-3 py-2 text-left font-medium">
                                Quantidade
                              </th>
                              <th className="w-32 px-3 py-2 text-left font-medium">
                                Valor unitário
                              </th>
                              <th className="w-28 px-3 py-2 text-right font-medium">
                                Total do item
                              </th>
                              <th className="px-3 py-2 text-left font-medium">Confiança</th>
                              <th className="w-8 px-1 py-2">
                                <span className="sr-only">Remover</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {vinculos.map((v) => (
                              <tr key={v.indice_nf} className="bg-card align-top">
                                <td className="px-3 py-2">
                                  <p
                                    className="max-w-[180px] truncate font-medium text-foreground"
                                    title={v.descricao_nf}
                                  >
                                    {v.descricao_nf || (
                                      <span className="text-muted-foreground">
                                        Digitado manualmente
                                      </span>
                                    )}
                                  </p>
                                  {v.codigo_nf && (
                                    <p className="text-muted-foreground">Cód: {v.codigo_nf}</p>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={v.item_contrato_id ?? ""}
                                    onChange={(e) =>
                                      handleVinculoManual(v.indice_nf, e.target.value)
                                    }
                                    className={campoPequeno}
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
                                  <div className="flex items-center gap-1">
                                    <input
                                      required
                                      type="number"
                                      min={PASSO_QUANTIDADE}
                                      step={PASSO_QUANTIDADE}
                                      value={v.quantidade || ""}
                                      onChange={(e) =>
                                        atualizarLinha(v.indice_nf, {
                                          quantidade: Number(e.target.value),
                                        })
                                      }
                                      className={campoPequeno}
                                      aria-label="Quantidade"
                                    />
                                    <span className="text-muted-foreground">{v.unidade}</span>
                                  </div>
                                  {(saldoApos.get(Number(v.item_contrato_id)) ?? 0) < 0 && (
                                    <p className="mt-1 text-[10px] font-medium text-critical">
                                      Saldo ficará{" "}
                                      {formatarQuantidade(saldoApos.get(Number(v.item_contrato_id)))}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <MoneyInput
                                    value={v.valor_unitario}
                                    onValueChange={(valor) =>
                                      atualizarLinha(v.indice_nf, { valor_unitario: valor })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-foreground">
                                  {formatarMoeda(
                                    (Number(v.quantidade) || 0) * (Number(v.valor_unitario) || 0),
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <StatusVinculoBadge
                                    status={v.status_identificacao}
                                    confianca={v.percentual_confianca}
                                  />
                                  {v.criterio_identificacao &&
                                    CRITERIO_LABELS[v.criterio_identificacao] && (
                                      <p className="mt-1 text-[10px] text-muted-foreground">
                                        {CRITERIO_LABELS[v.criterio_identificacao]}
                                      </p>
                                    )}
                                </td>
                                <td className="px-1 py-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Remover item"
                                    onClick={() => removerLinha(v.indice_nf)}
                                  >
                                    <Trash2 />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={adicionarLinha}>
                        <Plus /> Adicionar item
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Soma dos itens:{" "}
                        <strong className="text-foreground">{formatarMoeda(somaItens)}</strong>
                        {!totalAutomatico &&
                          valorTotalNota > 0 &&
                          Math.abs(valorTotalNota - somaItens) > 0.01 && (
                            <span className="ml-1 text-warning">
                              (difere do valor total da nota)
                            </span>
                          )}
                      </p>
                    </div>
                  </>
                )}
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
                  !prontoParaImportar ||
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
