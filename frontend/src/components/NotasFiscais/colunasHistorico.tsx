import type { ColumnDef } from "@tanstack/react-table"
import { RotateCcw, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatarMoeda } from "@/lib/money"

export type HistoricoNFRow = {
  id: number
  numero: string
  serie?: string | null
  chave_acesso?: string | null
  data_emissao?: string | null
  valor_total?: number | null
  fornecedor_id: number
  fornecedor_nome?: string
  status: string
  situacao: string
  excluida_em?: string | null
  excluida_por_nome?: string | null
  motivo_exclusao?: string | null
  estornada_em?: string | null
  estornada_por_nome?: string | null
  justificativa_estorno?: string | null
}

function dataHora(valor?: string | null) {
  if (!valor) return "—"
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR")
}

export function colunasHistoricoNF(): ColumnDef<HistoricoNFRow>[] {
  return [
    {
      accessorKey: "numero",
      header: "Número",
      cell: ({ row }) => (
        <span className="font-semibold font-mono tabular-nums">#{row.original.numero}</span>
      ),
    },
    {
      accessorKey: "fornecedor_nome",
      header: "Fornecedor",
      cell: ({ row }) => (
        <span className="block max-w-[14rem] truncate">
          {row.original.fornecedor_nome || "—"}
        </span>
      ),
    },
    {
      accessorKey: "valor_total",
      header: () => <span className="block text-right">Valor total</span>,
      cell: ({ row }) => (
        <span className="block whitespace-nowrap text-right tabular-nums">
          {formatarMoeda(row.original.valor_total || 0)}
        </span>
      ),
    },
    {
      accessorKey: "situacao",
      header: "Situação",
      cell: ({ row }) => {
        const excluida = row.original.situacao === "Excluída"
        return (
          <Badge variant={excluida ? "critical" : "destructive"}>
            {excluida ? <Trash2 /> : <RotateCcw />}
            {row.original.situacao}
          </Badge>
        )
      },
    },
    {
      id: "quando",
      header: "Quando",
      cell: ({ row }) => {
        const nf = row.original
        const excluida = nf.situacao === "Excluída"
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            {dataHora(excluida ? nf.excluida_em : nf.estornada_em)}
          </span>
        )
      },
    },
    {
      id: "responsavel",
      header: "Responsável",
      cell: ({ row }) => {
        const nf = row.original
        const excluida = nf.situacao === "Excluída"
        return (
          <span className="block max-w-[12rem] truncate">
            {(excluida ? nf.excluida_por_nome : nf.estornada_por_nome) || "—"}
          </span>
        )
      },
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: ({ row }) => {
        const nf = row.original
        const excluida = nf.situacao === "Excluída"
        const motivo = (excluida ? nf.motivo_exclusao : nf.justificativa_estorno) || "—"
        return (
          <span className="block max-w-[20rem] truncate" title={motivo}>
            {motivo}
          </span>
        )
      },
    },
  ]
}
