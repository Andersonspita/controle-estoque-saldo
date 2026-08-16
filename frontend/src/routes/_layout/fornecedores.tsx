import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Truck } from "lucide-react"

import { AddFornecedorModal } from "../../components/Fornecedores/AddFornecedorModal"
import { colunasFornecedores } from "../../components/Fornecedores/columns"
import { DataTable } from "../../components/Common/DataTable"
import { EmptyState } from "../../components/Common/EmptyState"
import { ListToolbar } from "../../components/Common/ListToolbar"
import { PageHeader } from "../../components/Common/PageHeader"
import { useListSearch } from "../../components/Common/ListSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "../../hooks/useAuth"
import { useIsMobile } from "@/hooks/useMobile"
import { pageTitle } from "@/lib/brand"
import { formatarCpfCnpj } from "@/lib/documento"
import { fornecedoresService } from "../../services/api"

export const Route = createFileRoute("/_layout/fornecedores")({
  component: FornecedoresPage,
  head: () => ({
    meta: [{ title: pageTitle("Fornecedores") }],
  }),
})

function FornecedoresPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [fornecedorEdicao, setFornecedorEdicao] = useState<any | null>(null)
  const [status, setStatus] = useState("todos")
  const { isAdmin } = useAuth()
  const { query, setQuery } = useListSearch()
  const isMobile = useIsMobile()
  const modalAberto = isAddModalOpen || !!fornecedorEdicao

  const { data: fornecedores = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase()
    return fornecedores.filter((f: any) => {
      if (status === "ativos" && !f.ativo) return false
      if (status === "inativos" && f.ativo) return false
      if (!termo) return true
      return [f.razao_social, f.cnpj, f.cidade, f.estado].join(" ").toLowerCase().includes(termo)
    })
  }, [fornecedores, query, status])

  const novo = isAdmin ? (
    <Button
      onClick={() => {
        setFornecedorEdicao(null)
        setIsAddModalOpen(true)
      }}
    >
      <Plus /> Novo Fornecedor
    </Button>
  ) : null

  return (
    <div className="min-w-0 space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Fornecedores"
        description="Cadastre os fornecedores usados nos contratos."
        action={novo}
      />

      <ListToolbar
        placeholder="Razão social, CPF/CNPJ ou município"
        query={query}
        onQueryChange={setQuery}
        tab={status}
        onTabChange={setStatus}
        tabs={[
          { value: "todos", label: "Todos" },
          { value: "ativos", label: "Ativos" },
          { value: "inativos", label: "Inativos" },
        ]}
        countLabel={`${filtrados.length} ${filtrados.length === 1 ? "fornecedor" : "fornecedores"}`}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar fornecedores</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isMobile ? (
        <div className="space-y-3">
          {filtrados.length === 0 ? (
            <EmptyState icon={Truck} title="Nenhum fornecedor cadastrado" action={novo} />
          ) : (
            filtrados.map((f: any) => (
              <div key={f.id} className="space-y-2 rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{f.razao_social}</p>
                    <p className="text-sm text-muted-foreground">{formatarCpfCnpj(f.cnpj || "")}</p>
                  </div>
                  <Badge variant={f.ativo ? "success" : "secondary"}>
                    {f.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    onClick={() => setFornecedorEdicao(f)}
                  >
                    Editar
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <DataTable
          columns={colunasFornecedores({
            isAdmin,
            onEditar: (fornecedor) => {
              setIsAddModalOpen(false)
              setFornecedorEdicao(fornecedor)
            },
          })}
          data={filtrados}
          empty={<EmptyState icon={Truck} title="Nenhum fornecedor cadastrado" action={novo} />}
        />
      )}

      {isAdmin && (
        <AddFornecedorModal
          isOpen={modalAberto}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddModalOpen(false)
              setFornecedorEdicao(null)
            }
          }}
          fornecedor={fornecedorEdicao}
        />
      )}
    </div>
  )
}
