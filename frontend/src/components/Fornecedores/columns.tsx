import type { ColumnDef } from "@tanstack/react-table"
import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatarCpfCnpj } from "@/lib/documento"

export function colunasFornecedores({
  isAdmin,
  onEditar,
}: {
  isAdmin: boolean
  onEditar: (fornecedor: any) => void
}): ColumnDef<any>[] {
  const colunas: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-medium tabular-nums">#{row.original.id}</span>,
    },
    {
      accessorKey: "razao_social",
      header: "Razão Social",
      cell: ({ row }) => <span className="font-medium">{row.original.razao_social}</span>,
    },
    {
      accessorKey: "cnpj",
      header: "CPF/CNPJ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatarCpfCnpj(row.original.cnpj || "")}</span>
      ),
    },
    {
      id: "localizacao",
      header: "Localização",
      cell: ({ row }) => {
        const f = row.original
        const texto =
          f.cidade && f.estado ? `${f.cidade}/${f.estado}` : f.cidade || f.estado || "—"
        return <span className="text-muted-foreground">{texto}</span>
      },
    },
    {
      accessorKey: "ativo",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.ativo ? "success" : "secondary"}>
          {row.original.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ]

  if (isAdmin) {
    colunas.push({
      id: "actions",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onEditar(row.original)}>
            <Pencil /> Editar
          </Button>
        </div>
      ),
    })
  }

  return colunas
}
