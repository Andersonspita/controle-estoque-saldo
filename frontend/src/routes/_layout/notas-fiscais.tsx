import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDown,
  Download,
  FileText,
  Link2,
  Pencil,
  PenLine,
  Play,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { ImportNFModal } from "../../components/NotasFiscais/ImportNFModal"
import { ManualNFModal } from "../../components/NotasFiscais/ManualNFModal"
import { BaixaModal } from "../../components/NotasFiscais/BaixaModal"
import { ConferenciaModal } from "../../components/NotasFiscais/ConferenciaModal"
import { AcaoNFModal, type AcaoNF } from "../../components/NotasFiscais/AcaoNFModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { badgeStatus, colunasNotasFiscais, type NotaFiscalRow } from "../../components/NotasFiscais/columns"
import { DataTable } from "../../components/Common/DataTable"
import { EmptyState } from "../../components/Common/EmptyState"
import { ListToolbar } from "../../components/Common/ListToolbar"
import { PageHeader } from "../../components/Common/PageHeader"
import { useListSearch } from "../../components/Common/ListSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fornecedoresService, notasFiscaisService } from "../../services/api"
import { pageTitle } from "@/lib/brand"
import { formatarMoeda } from "@/lib/money"
import { useIsMobile } from "@/hooks/useMobile"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/notas-fiscais")({
  component: NotasFiscaisPage,
  head: () => ({
    meta: [{ title: pageTitle("Notas Fiscais") }],
  }),
})

function NotasFiscaisPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [baixaModalNF, setBaixaModalNF] = useState<any | null>(null)
  const [conferenciaNF, setConferenciaNF] = useState<any | null>(null)
  const [baixandoId, setBaixandoId] = useState<number | null>(null)
  const [editNF, setEditNF] = useState<any | null>(null)
  const [acaoNF, setAcaoNF] = useState<{ nf: any; acao: AcaoNF } | null>(null)
  const [status, setStatus] = useState("todas")
  const { user } = useAuth()
  // O campo é novo no backend; o client gerado ainda não o tipa.
  const podeEstornar = Boolean((user as any)?.pode_estornar)
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()

  const { data: notas = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: () => notasFiscaisService.listar(),
  })
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  const fornecedorPorId = useMemo(() => {
    const mapa = new Map<number, string>()
    for (const f of fornecedores) mapa.set(f.id, f.razao_social)
    return mapa
  }, [fornecedores])

  const linhas: NotaFiscalRow[] = useMemo(
    () =>
      notas.map((nf: any) => ({
        ...nf,
        fornecedor_nome: fornecedorPorId.get(nf.fornecedor_id) || "",
      })),
    [notas, fornecedorPorId],
  )

  const filtradas = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return linhas.filter((nf) => {
      if (status === "pendentes" && nf.status === "Baixada") return false
      if (status === "baixadas" && nf.status !== "Baixada") return false
      if (!termo) return true
      return [nf.numero, nf.fornecedor_nome, nf.chave_acesso]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    })
  }, [linhas, query, status])

  const baixarArquivo = async (nf: any) => {
    setBaixandoId(nf.id)
    try {
      await notasFiscaisService.downloadArquivo(nf)
    } catch (erro: any) {
      let descricao = erro.message
      const data = erro.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          descricao = parsed.detail || descricao
        } catch {
          /* ignore */
        }
      } else if (data?.detail) {
        descricao = data.detail
      }
      toast.error("Não foi possível baixar o arquivo da nota", { description: descricao })
    } finally {
      setBaixandoId(null)
    }
  }

  const acoes = {
    onConferir: (nf: NotaFiscalRow) => setConferenciaNF(nf),
    onBaixa: (nf: NotaFiscalRow) => setBaixaModalNF(nf),
    onDownload: (nf: NotaFiscalRow) => baixarArquivo(nf),
    onEditar: (nf: NotaFiscalRow) => setEditNF(nf),
    onEstornar: (nf: NotaFiscalRow) => setAcaoNF({ nf, acao: "estorno" }),
    onExcluir: (nf: NotaFiscalRow) => setAcaoNF({ nf, acao: "exclusao" }),
    baixandoId,
    podeEstornar,
  }

  const novaNota = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <FileText /> Nova nota fiscal <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setIsImportModalOpen(true)}>
          <Upload /> Importar XML ou PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setIsManualModalOpen(true)}>
          <PenLine /> Incluir manualmente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Notas Fiscais"
        description="Encontre a nota e execute a baixa com segurança."
        action={novaNota}
      />

      <ListToolbar
        placeholder="Número, fornecedor ou chave"
        query={query}
        onQueryChange={setQuery}
        tab={status}
        onTabChange={setStatus}
        tabs={[
          { value: "todas", label: "Todas" },
          { value: "pendentes", label: "Pendentes" },
          { value: "baixadas", label: "Baixadas" },
        ]}
        countLabel={`${filtradas.length} ${filtradas.length === 1 ? "nota" : "notas"}`}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar notas</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtradas.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma nota encontrada"
              description="Importe um XML/PDF ou inclua a nota manualmente para começar a controlar as baixas."
              action={novaNota}
            />
          ) : (
            filtradas.map((nf) => (
              <div key={nf.id} className="space-y-2.5 rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[15px] font-semibold">#{nf.numero}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {nf.fornecedor_nome || "Fornecedor não identificado"}
                    </p>
                  </div>
                  <Badge variant={badgeStatus(nf.status)}>{nf.status}</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-lg font-bold tabular-nums">{formatarMoeda(nf.valor_total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{nf.data_emissao || "—"}</p>
                </div>
                {nf.status !== "Baixada" ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={() => setConferenciaNF(nf)}
                      >
                        <Link2 /> Conferir
                      </Button>
                      <Button className="h-11 flex-1" onClick={() => setBaixaModalNF(nf)}>
                        <Play /> Executar baixa
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={() => setEditNF(nf)}
                      >
                        <Pencil /> Editar
                      </Button>
                      {podeEstornar && (
                        <Button
                          variant="outline"
                          className="h-11 flex-1 text-destructive"
                          onClick={() => setAcaoNF({ nf, acao: "exclusao" })}
                        >
                          <Trash2 /> Excluir
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1"
                      disabled={nf.tem_arquivo === false || baixandoId === nf.id}
                      onClick={() => baixarArquivo(nf)}
                    >
                      <Download /> {baixandoId === nf.id ? "Baixando..." : "Baixar PDF"}
                    </Button>
                    {podeEstornar && (
                      <Button
                        variant="outline"
                        className="h-11 flex-1 text-destructive"
                        onClick={() => setAcaoNF({ nf, acao: "estorno" })}
                      >
                        <RotateCcw /> Estornar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <DataTable
          columns={colunasNotasFiscais(acoes)}
          data={filtradas}
          initialSorting={[{ id: "numero", desc: true }]}
          empty={
            <EmptyState
              icon={FileText}
              title="Nenhuma nota encontrada"
              description="Importe um XML/PDF ou inclua a nota manualmente para começar a controlar as baixas."
              action={novaNota}
            />
          }
        />
      )}

      <ImportNFModal isOpen={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
      <ManualNFModal isOpen={isManualModalOpen} onOpenChange={setIsManualModalOpen} />
      {editNF && (
        <ManualNFModal
          key={`edit-${editNF.id}`}
          nf={editNF}
          isOpen={!!editNF}
          onOpenChange={(open: boolean) => !open && setEditNF(null)}
        />
      )}
      {acaoNF && (
        <AcaoNFModal
          nf={acaoNF.nf}
          acao={acaoNF.acao}
          isOpen={!!acaoNF}
          onOpenChange={(open: boolean) => !open && setAcaoNF(null)}
        />
      )}
      {conferenciaNF && (
        <ConferenciaModal
          nf={conferenciaNF}
          isOpen={!!conferenciaNF}
          onOpenChange={(open: boolean) => !open && setConferenciaNF(null)}
        />
      )}
      {baixaModalNF && (
        <BaixaModal
          nf={baixaModalNF}
          isOpen={!!baixaModalNF}
          onOpenChange={(open: boolean) => !open && setBaixaModalNF(null)}
        />
      )}
    </div>
  )
}
