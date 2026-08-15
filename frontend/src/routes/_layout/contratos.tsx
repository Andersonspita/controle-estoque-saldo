import { createFileRoute } from "@tanstack/react-router"
import { Fragment, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { contratosService } from "../../services/api"
import { ChevronDown, ChevronRight, FileSignature, Pencil, Plus } from "lucide-react"
import { AddContratoModal } from "../../components/Contratos/AddContratoModal"
import useAuth from "../../hooks/useAuth"
import { pageTitle } from "@/lib/brand"
import { formatarMoeda } from "@/lib/money"
import { TableScroll } from "@/components/ui/table-scroll"

export const Route = createFileRoute("/_layout/contratos")({
  component: ContratosPage,
  head: () => ({
    meta: [{ title: pageTitle("Contratos") }],
  }),
})

function percentualRestante(saldo: number, contratada: number) {
  if (!contratada) return 0
  return Math.min(100, Math.max(0, (saldo / contratada) * 100))
}

function corBarra(percentual: number) {
  if (percentual <= 15) return "bg-red-500"
  if (percentual <= 45) return "bg-amber-500"
  return "bg-emerald-500"
}

function ContratosPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [contratoEdicao, setContratoEdicao] = useState<any | null>(null)
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const { isAdmin } = useAuth()
  const modalAberto = isAddModalOpen || !!contratoEdicao

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const colunas = isAdmin ? 7 : 6

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileSignature size={24} className="text-slate-500 shrink-0" /> Contratos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            O estoque controlado pelo sistema é o saldo de cada item do contrato.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setContratoEdicao(null)
              setIsAddModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex gap-2 items-center px-4 py-2 rounded-md font-medium text-sm shrink-0 self-start"
          >
            <Plus size={18} />
            Novo Contrato
          </button>
        )}
      </div>

      <TableScroll>
        <table className="w-full min-w-[52rem] text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-4 w-8"></th>
              <th className="px-6 py-4 whitespace-nowrap">Número/Ano</th>
              <th className="px-6 py-4 whitespace-nowrap">Fornecedor</th>
              <th className="px-6 py-4 text-right whitespace-nowrap">Valor Total</th>
              <th className="px-6 py-4 text-right whitespace-nowrap">Saldo (unid.)</th>
              <th className="px-6 py-4 whitespace-nowrap">Status</th>
              {isAdmin && <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contratos.map((contrato: any) => {
              const itens = contrato.itens || []
              const saldoTotal = itens.reduce((acc: number, item: any) => acc + (item.saldo_atual || 0), 0)
              const contratadoTotal = itens.reduce((acc: number, item: any) => acc + (item.quantidade_contratada || 0), 0)
              const expandido = expandidoId === contrato.id

              return (
                <Fragment key={contrato.id}>
                  <tr
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setExpandidoId(expandido ? null : contrato.id)}
                  >
                    <td className="px-4 py-4 text-slate-400">
                      {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {contrato.numero}/{contrato.ano}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {contrato.fornecedor?.razao_social || `Fornecedor ID ${contrato.fornecedor_id}`}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatarMoeda(contrato.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {saldoTotal.toLocaleString("pt-BR")}
                      <span className="text-slate-400 font-normal"> / {contratadoTotal.toLocaleString("pt-BR")}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${contrato.situacao === "Ativo" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {contrato.situacao}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsAddModalOpen(false)
                            setContratoEdicao(contrato)
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          <Pencil size={14} /> Editar
                        </button>
                      </td>
                    )}
                  </tr>
                  {expandido && (
                    <tr key={`${contrato.id}-itens`} className="bg-slate-50/80 dark:bg-slate-950/50">
                      <td colSpan={colunas} className="px-6 py-4">
                        {itens.length === 0 ? (
                          <p className="text-sm text-slate-500">Este contrato ainda não possui itens cadastrados.</p>
                        ) : (
                          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                            <table className="w-full min-w-[36rem] text-xs">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="py-2 text-left font-medium whitespace-nowrap">Item</th>
                                  <th className="py-2 text-right font-medium whitespace-nowrap">Contratado</th>
                                  <th className="py-2 text-right font-medium whitespace-nowrap">Saldo atual</th>
                                  <th className="py-2 text-right font-medium whitespace-nowrap">Valor unitário</th>
                                  <th className="py-2 pl-4 font-medium w-48 whitespace-nowrap">Consumo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {itens.map((item: any) => {
                                  const percentual = percentualRestante(item.saldo_atual, item.quantidade_contratada)
                                  return (
                                    <tr key={item.id}>
                                      <td className="py-2 pr-4">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">{item.descricao}</p>
                                        {item.codigo && <p className="text-slate-400">Cód: {item.codigo}</p>}
                                      </td>
                                      <td className="py-2 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {item.quantidade_contratada} {item.unidade}
                                      </td>
                                      <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                        {item.saldo_atual} {item.unidade}
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                        {formatarMoeda(item.valor_unitario)}
                                      </td>
                                      <td className="py-2 pl-4">
                                        <div className="flex items-center gap-2 min-w-[10rem]">
                                          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div
                                              className={`h-full ${corBarra(percentual)}`}
                                              style={{ width: `${percentual}%` }}
                                            />
                                          </div>
                                          <span className="w-12 text-right text-slate-500">{percentual.toFixed(0)}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {contratos.length === 0 && !isLoading && (
              <tr>
                <td colSpan={colunas} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhum contrato cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>

      {isAdmin && (
        <AddContratoModal
          isOpen={modalAberto}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddModalOpen(false)
              setContratoEdicao(null)
            }
          }}
          contrato={contratoEdicao}
        />
      )}
    </div>
  )
}
