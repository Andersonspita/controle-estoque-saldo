import { createFileRoute, redirect } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"

import { UsersService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { ListToolbar } from "@/components/Common/ListToolbar"
import { PageHeader } from "@/components/Common/PageHeader"
import { useListSearch } from "@/components/Common/ListSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { pageTitle } from "@/lib/brand"
import { auditoriaService, type LogAuditoria } from "@/services/api"

export const Route = createFileRoute("/_layout/auditoria")({
  component: AuditoriaPage,
  beforeLoad: async () => {
    const { data: user } = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: pageTitle("Log de usuários") }],
  }),
})

const rotuloOperacao: Record<string, string> = {
  INSERT: "Inclusão",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
}

const rotuloTabela: Record<string, string> = {
  notas_fiscais: "Notas fiscais",
  contratos: "Contratos",
  fornecedores: "Fornecedores",
  usuarios: "Usuários",
}

function dataHora(valor?: string | null) {
  if (!valor) return "—"
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR")
}

function resumoDados(log: LogAuditoria) {
  const fonte = (log.dados_novos ?? log.dados_anteriores) as
    | Record<string, unknown>
    | null
    | undefined
  if (!fonte || typeof fonte !== "object") return "—"
  const partes: string[] = []
  if (fonte.operacao) partes.push(String(fonte.operacao))
  if (fonte.numero != null) partes.push(`NF ${fonte.numero}`)
  if (fonte.email) partes.push(String(fonte.email))
  if (fonte.razao_social) partes.push(String(fonte.razao_social))
  if (fonte.status) partes.push(String(fonte.status))
  if (fonte.perfil) partes.push(String(fonte.perfil))
  if (partes.length === 0) {
    try {
      const texto = JSON.stringify(fonte)
      return texto.length > 120 ? `${texto.slice(0, 117)}…` : texto
    } catch {
      return "—"
    }
  }
  return partes.join(" · ")
}

function AuditoriaPage() {
  const [operacao, setOperacao] = useState("todas")
  const { query, setQuery } = useListSearch()

  const { data: registros = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["auditoria"],
    queryFn: () => auditoriaService.listar({ limit: 300 }),
  })

  const filtradas = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return registros.filter((log) => {
      if (operacao !== "todas" && log.operacao !== operacao) return false
      if (!termo) return true
      return [
        log.usuario_nome,
        log.usuario_email,
        log.operacao,
        log.tabela,
        log.registro_id,
        log.ip,
        resumoDados(log),
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    })
  }, [registros, query, operacao])

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Log de usuários"
        description="Inclusões, alterações e exclusões registradas no sistema. Acesso exclusivo de administrador."
      />

      <ListToolbar
        placeholder="Usuário, tabela, registro ou detalhe"
        query={query}
        onQueryChange={setQuery}
        tab={operacao}
        onTabChange={setOperacao}
        tabs={[
          { value: "todas", label: "Todas" },
          { value: "INSERT", label: "Inclusões" },
          { value: "UPDATE", label: "Alterações" },
          { value: "DELETE", label: "Exclusões" },
        ]}
        countLabel={`${filtradas.length} ${filtradas.length === 1 ? "registro" : "registros"}`}
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o log</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            Tente novamente.
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Recarregar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum registro de auditoria"
          description="As ações de inclusão, alteração e exclusão passam a aparecer aqui."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Usuário</th>
                <th className="px-3 py-2 font-medium">Operação</th>
                <th className="px-3 py-2 font-medium">Tabela</th>
                <th className="px-3 py-2 font-medium">Registro</th>
                <th className="px-3 py-2 font-medium">Detalhe</th>
                <th className="px-3 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {dataHora(log.data_hora)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{log.usuario_nome || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.usuario_email || ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        log.operacao === "DELETE"
                          ? "destructive"
                          : log.operacao === "INSERT"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {rotuloOperacao[log.operacao] || log.operacao}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {rotuloTabela[log.tabela] || log.tabela}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{log.registro_id}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-muted-foreground" title={resumoDados(log)}>
                    {resumoDados(log)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {log.ip || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
