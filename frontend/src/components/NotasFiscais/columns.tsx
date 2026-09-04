import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  Download,
  Link2,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatarMoeda } from "@/lib/money"

export type NotaFiscalRow = {
  id: number
  numero: string
  data_emissao?: string | null
  fornecedor_nome?: string
  valor_total?: number | null
  status: string
  tem_arquivo?: boolean
  chave_acesso?: string | null
}

export function badgeStatus(status: string) {
  if (status === "Baixada") return "success" as const
  if (status === "Estornada") return "destructive" as const
  return "warning" as const
}

export function colunasNotasFiscais({
  onConferir,
  onBaixa,
  onDownload,
  onEditar,
  onEstornar,
  onExcluir,
  baixandoId,
  podeEstornar,
}: {
  onConferir: (nf: NotaFiscalRow) => void
  onBaixa: (nf: NotaFiscalRow) => void
  onDownload: (nf: NotaFiscalRow) => void
  onEditar: (nf: NotaFiscalRow) => void
  onEstornar: (nf: NotaFiscalRow) => void
  onExcluir: (nf: NotaFiscalRow) => void
  baixandoId: number | null
  /** Estornar e excluir dependem de liberação do administrador. */
  podeEstornar: boolean
}): ColumnDef<NotaFiscalRow>[] {
  return [
    {
      accessorKey: "numero",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8 px-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Número
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold font-mono tabular-nums">#{row.original.numero}</span>
      ),
    },
    {
      accessorKey: "data_emissao",
      header: "Emissão",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.data_emissao || "—"}</span>
      ),
    },
    {
      accessorKey: "fornecedor_nome",
      header: "Fornecedor",
      cell: ({ row }) => (
        <span className="max-w-[16rem] truncate block">{row.original.fornecedor_nome || "—"}</span>
      ),
    },
    {
      accessorKey: "valor_total",
      header: () => <span className="block text-right">Valor total</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums whitespace-nowrap">
          {formatarMoeda(row.original.valor_total || 0)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={badgeStatus(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => {
        const nf = row.original
        const baixada = nf.status === "Baixada"
        return (
          <div className="flex items-center justify-end gap-2">
            {!baixada && (
              <>
                <Button variant="outline" size="sm" onClick={() => onConferir(nf)}>
                  <Link2 /> Conferir vínculos
                </Button>
                <Button size="sm" onClick={() => onBaixa(nf)}>
                  <Play /> Executar baixa
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="size-[30px]" aria-label="Mais ações">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={nf.tem_arquivo === false || baixandoId === nf.id}
                  onClick={() => onDownload(nf)}
                >
                  <Download />
                  {baixandoId === nf.id ? "Baixando..." : "Baixar PDF"}
                </DropdownMenuItem>
                {!baixada && (
                  <DropdownMenuItem onClick={() => onEditar(nf)}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                )}
                {baixada && podeEstornar && (
                  <DropdownMenuItem onClick={() => onEstornar(nf)}>
                    <RotateCcw /> Estornar baixa
                  </DropdownMenuItem>
                )}
                {!baixada && podeEstornar && (
                  <DropdownMenuItem variant="destructive" onClick={() => onExcluir(nf)}>
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
