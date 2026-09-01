import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FileBarChart, Printer } from "lucide-react"
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
  almoxarifadosService,
  contratosService,
  relatoriosService,
} from "@/services/api"

export const Route = createFileRoute("/_layout/relatorios")({
  component: RelatoriosPage,
  head: () => ({
    meta: [{ title: pageTitle("Relatórios") }],
  }),
})

const TODOS = "todos"

function RelatoriosPage() {
  const [contratoId, setContratoId] = useState(TODOS)
  const [situacao, setSituacao] = useState("Ativo")
  const [orgaoId, setOrgaoId] = useState(TODOS)
  const [comConsolidado, setComConsolidado] = useState(true)

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const { data: orgaos = [] } = useQuery({
    queryKey: ["almoxarifados"],
    queryFn: () => almoxarifadosService.listar(),
  })

  const filtros = useMemo(
    () => ({
      ...(contratoId !== TODOS ? { contrato_id: Number(contratoId) } : {}),
      ...(contratoId === TODOS && situacao !== TODOS ? { situacao } : {}),
      ...(orgaoId !== TODOS ? { almoxarifado_id: Number(orgaoId) } : {}),
    }),
    [contratoId, situacao, orgaoId],
  )

  const {
    data: relatorio,
    isLoading,
    isError,
    refetch,
  } = useQuery<RelatorioSaldo>({
    queryKey: ["relatorio-saldo", filtros],
    queryFn: () => relatoriosService.saldoContratos(filtros),
  })

  const vazio = !isLoading && (relatorio?.contratos?.length ?? 0) === 0

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <div className="print:hidden">
        <PageHeader
          title="Relatórios"
          description="Saldo de contrato item a item, pronto para impressão ou para salvar em PDF."
          action={
            <Button
              onClick={() => window.print()}
              disabled={isLoading || vazio}
            >
              <Printer /> Imprimir / Salvar PDF
            </Button>
          }
        />
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
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
          <Label htmlFor="rel-orgao">Órgão de destino</Label>
          <Select value={orgaoId} onValueChange={setOrgaoId}>
            <SelectTrigger id="rel-orgao" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os órgãos</SelectItem>
              {orgaos.map((orgao: any) => (
                <SelectItem key={orgao.id} value={String(orgao.id)}>
                  {orgao.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Filtra o quadro de consumo por órgão; o saldo do item continua o do
            contrato.
          </p>
        </div>

        <div className="flex items-start gap-2.5 pt-6">
          <Checkbox
            id="rel-consolidado"
            checked={comConsolidado}
            onCheckedChange={(valor) => setComConsolidado(valor === true)}
          />
          <Label htmlFor="rel-consolidado" className="font-normal leading-snug">
            Incluir folha consolidada quando houver mais de um contrato
          </Label>
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

      {isLoading ? (
        <div className="space-y-2 print:hidden">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : vazio ? (
        <div className="print:hidden">
          <EmptyState
            icon={FileBarChart}
            title="Nenhum contrato para este filtro"
            description="Ajuste a situação ou escolha outro contrato para gerar o relatório."
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
