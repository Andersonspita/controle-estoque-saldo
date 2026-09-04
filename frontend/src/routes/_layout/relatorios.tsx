import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Eye, FileBarChart, Printer, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { EmptyState } from "@/components/Common/EmptyState"
import { PageHeader } from "@/components/Common/PageHeader"
import {
  type RelatorioSaldo,
  RelatorioSaldoDocumento,
} from "@/components/Relatorios/RelatorioSaldoDocumento"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { pageTitle } from "@/lib/brand"
import { rotuloContrato } from "@/lib/contrato"
import {
  contratosService,
  fornecedoresService,
  relatoriosService,
} from "@/services/api"

export const Route = createFileRoute("/_layout/relatorios")({
  component: RelatoriosPage,
  head: () => ({
    meta: [{ title: pageTitle("Relatórios") }],
  }),
})

const TODOS = "todos"

type Filtros = {
  contrato_id?: number
  situacao?: string
  fornecedor_id?: number
  vigencia_inicio?: string
  vigencia_fim?: string
  objeto?: string
}

const FILTROS_INICIAIS = {
  contratoId: TODOS,
  situacao: "Ativo",
  fornecedorId: TODOS,
  vigenciaInicio: "",
  vigenciaFim: "",
  objeto: "",
}

function RelatoriosPage() {
  const [contratoId, setContratoId] = useState(FILTROS_INICIAIS.contratoId)
  const [situacao, setSituacao] = useState(FILTROS_INICIAIS.situacao)
  const [fornecedorId, setFornecedorId] = useState(
    FILTROS_INICIAIS.fornecedorId,
  )
  const [vigenciaInicio, setVigenciaInicio] = useState(
    FILTROS_INICIAIS.vigenciaInicio,
  )
  const [vigenciaFim, setVigenciaFim] = useState(FILTROS_INICIAIS.vigenciaFim)
  const [objeto, setObjeto] = useState(FILTROS_INICIAIS.objeto)
  const [comConsolidado, setComConsolidado] = useState(true)

  // O relatório só é buscado quando o usuário pede — nada é gerado ao abrir a tela.
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros | null>(null)

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  const filtros = useMemo<Filtros>(
    () => ({
      ...(contratoId !== TODOS ? { contrato_id: Number(contratoId) } : {}),
      ...(contratoId === TODOS && situacao !== TODOS ? { situacao } : {}),
      ...(fornecedorId !== TODOS
        ? { fornecedor_id: Number(fornecedorId) }
        : {}),
      ...(vigenciaInicio ? { vigencia_inicio: vigenciaInicio } : {}),
      ...(vigenciaFim ? { vigencia_fim: vigenciaFim } : {}),
      ...(objeto.trim() ? { objeto: objeto.trim() } : {}),
    }),
    [contratoId, situacao, fornecedorId, vigenciaInicio, vigenciaFim, objeto],
  )

  const periodoInvalido = Boolean(
    vigenciaInicio && vigenciaFim && vigenciaInicio > vigenciaFim,
  )

  const {
    data: relatorio,
    isFetching,
    isError,
    refetch,
  } = useQuery<RelatorioSaldo>({
    queryKey: ["relatorio-saldo", filtrosAplicados],
    queryFn: () => relatoriosService.saldoContratos(filtrosAplicados ?? {}),
    enabled: filtrosAplicados !== null,
  })

  const gerado = filtrosAplicados !== null
  const vazio =
    gerado && !isFetching && (relatorio?.contratos?.length ?? 0) === 0
  const temDocumento = gerado && !isFetching && !vazio && !!relatorio

  const visualizar = () => {
    // Com os mesmos filtros a chave da query não muda; força a releitura para
    // que "Atualizar relatório" traga os saldos do momento.
    const mesmosFiltros =
      JSON.stringify(filtrosAplicados) === JSON.stringify(filtros)
    setFiltrosAplicados(filtros)
    if (mesmosFiltros) refetch()
  }

  const limpar = () => {
    setContratoId(FILTROS_INICIAIS.contratoId)
    setSituacao(FILTROS_INICIAIS.situacao)
    setFornecedorId(FILTROS_INICIAIS.fornecedorId)
    setVigenciaInicio(FILTROS_INICIAIS.vigenciaInicio)
    setVigenciaFim(FILTROS_INICIAIS.vigenciaFim)
    setObjeto(FILTROS_INICIAIS.objeto)
    setFiltrosAplicados(null)
  }

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <div className="print:hidden">
        <PageHeader
          title="Relatórios"
          description="Escolha os filtros e clique em Visualizar para gerar o saldo de contrato item a item."
          action={
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={!temDocumento}
            >
              <Printer /> Imprimir / Salvar PDF
            </Button>
          }
        />
      </div>

      <div className="rounded-xl border bg-card p-4 print:hidden">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="rel-contrato">Contrato</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger id="rel-contrato" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os contratos</SelectItem>
                {contratos.map((contrato: any) => (
                  <SelectItem key={contrato.id} value={String(contrato.id)}>
                    {rotuloContrato(contrato)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-situacao">Situação</Label>
            <Select
              value={situacao}
              onValueChange={setSituacao}
              disabled={contratoId !== TODOS}
            >
              <SelectTrigger id="rel-situacao" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Encerrado">Encerrados</SelectItem>
                <SelectItem value={TODOS}>Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-credor">Credor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger id="rel-credor" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os credores</SelectItem>
                {fornecedores.map((fornecedor: any) => (
                  <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                    {fornecedor.razao_social || fornecedor.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-vigencia-inicio">
              Vigência inicial a partir de
            </Label>
            <Input
              id="rel-vigencia-inicio"
              type="date"
              value={vigenciaInicio}
              onChange={(evento) => setVigenciaInicio(evento.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-vigencia-fim">Vigência final até</Label>
            <Input
              id="rel-vigencia-fim"
              type="date"
              value={vigenciaFim}
              onChange={(evento) => setVigenciaFim(evento.target.value)}
              aria-invalid={periodoInvalido}
            />
            {periodoInvalido ? (
              <p className="text-xs text-destructive">
                A vigência final deve ser posterior à vigência inicial.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-objeto">Objeto do contrato</Label>
            <Input
              id="rel-objeto"
              value={objeto}
              onChange={(evento) => setObjeto(evento.target.value)}
              placeholder="Ex.: material de limpeza"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="rel-consolidado"
              checked={comConsolidado}
              onCheckedChange={(valor) => setComConsolidado(valor === true)}
            />
            <Label
              htmlFor="rel-consolidado"
              className="font-normal leading-snug"
            >
              Incluir folha consolidada quando houver mais de um contrato
            </Label>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={limpar}>
              <RotateCcw /> Limpar filtros
            </Button>
            <Button
              onClick={visualizar}
              disabled={periodoInvalido || isFetching}
            >
              <Eye /> {gerado ? "Atualizar relatório" : "Visualizar relatório"}
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive" className="print:hidden">
          <AlertTitle>Erro ao gerar o relatório</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!gerado ? (
        <div className="print:hidden">
          <EmptyState
            icon={FileBarChart}
            title="Nenhum relatório gerado"
            description="Defina os filtros acima e clique em Visualizar relatório."
          />
        </div>
      ) : isFetching ? (
        <div className="space-y-2 print:hidden">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : vazio ? (
        <div className="print:hidden">
          <EmptyState
            icon={FileBarChart}
            title="Nenhum contrato para este filtro"
            description="Ajuste a situação, o período de vigência ou o credor e visualize novamente."
          />
        </div>
      ) : relatorio ? (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
          <div className="min-w-[1024px] print:min-w-0">
            <RelatorioSaldoDocumento
              relatorio={relatorio}
              comConsolidado={comConsolidado}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
