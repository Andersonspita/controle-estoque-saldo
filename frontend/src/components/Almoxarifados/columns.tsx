import type { ColumnDef } from "@tanstack/react-table"
import { ChevronRight, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function colunasOrgaos({
  isAdmin,
  expandidoId,
  onToggle,
  onEditar,
}: {
  isAdmin: boolean
  expandidoId: number | null
  onToggle: (id: number) => void
  onEditar: (orgao: any) => void
}): ColumnDef<any>[] {
  const colunas: ColumnDef<any>[] = [
    {
      id: "expand",
      header: () => <span className="sr-only">Expandir</span>,
      cell: ({ row }) => {
        const aberto = expandidoId === row.original.id
        return (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={aberto}
            aria-controls={`orgao-painel-${row.original.id}`}
            onClick={() => onToggle(row.original.id)}
            className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
          >
            <ChevronRight className={aberto ? "rotate-90 transition-transform duration-150" : "transition-transform duration-150"} />
            <span className="sr-only">{aberto ? "Recolher" : "Expandir"}</span>
          </Button>
        )
      },
    },
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "localizacao",
      header: "Localização",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.localizacao || "—"}</span>
      ),
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
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEditar(row.original)
            }}
          >
            <Pencil /> Editar
          </Button>
        </div>
      ),
    })
  }

  return colunas
}
