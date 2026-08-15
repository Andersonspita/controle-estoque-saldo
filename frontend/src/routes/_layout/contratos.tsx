import { createFileRoute } from "@tanstack/react-router"
import { Fragment, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { contratosService } from "../../services/api"
import { ChevronDown, ChevronRight, FileSignature, Plus } from "lucide-react"
import { AddContratoModal } from "../../components/Contratos/AddContratoModal"

export const Route = createFileRoute("/_layout/contratos")({
  component: ContratosPage,
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
  const [expandidoId, setExpandidoId] = useState<number | null>(null)

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileSignature size={24} className="text-slate-500" /> Contratos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            O estoque controlado pelo sistema é o saldo de cada item do contrato.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex gap-2 items-center px-4 py-2 rounded-md font-medium text-sm"
        >
          <Plus size={18} />
          Novo Contrato
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden transition-colors">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-4 w-8"></th>
              <th className="px-6 py-4">Número/Ano</th>
              <th className="px-6 py-4">Fornecedor</th>
              <th className="px-6 py-4 text-right">Valor Total</th>
              <th className="px-6 py-4 text-right">Saldo (unid.)</th>
              <th className="px-6 py-4">Status</th>
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
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {contrato.numero}/{contrato.ano}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {contrato.fornecedor?.razao_social || `Fornecedor ID ${contrato.fornecedor_id}`}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-200">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contrato.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-200">
                      {saldoTotal.toLocaleString("pt-BR")}
                      <span className="text-slate-400 font-normal"> / {contratadoTotal.toLocaleString("pt-BR")}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${contrato.situacao === "Ativo" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {contrato.situacao}
                      </span>
                    </td>
                  </tr>
                  {expandido && (
                    <tr key={`${contrato.id}-itens`} className="bg-slate-50/80 dark:bg-slate-950/50">
                      <td colSpan={6} className="px-6 py-4">
                        {itens.length === 0 ? (
                          <p className="text-sm text-slate-500">Este contrato ainda não possui itens cadastrados.</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="py-2 text-left font-medium">Item</th>
                                <th className="py-2 text-right font-medium">Contratado</th>
                                <th className="py-2 text-right font-medium">Saldo atual</th>
                                <th className="py-2 pl-4 font-medium w-48">Consumo</th>
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
                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                                      {item.quantidade_contratada} {item.unidade}
                                    </td>
                                    <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">
                                      {item.saldo_atual} {item.unidade}
                                    </td>
                                    <td className="py-2 pl-4">
                                      <div className="flex items-center gap-2">
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
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {contratos.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhum contrato cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddContratoModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  )
}
