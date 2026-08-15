import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { contratosService, movimentacoesService } from "../../services/api"
import { DollarSign, FileText, Activity, AlertCircle, ArrowDownRight, CheckCircle2 } from "lucide-react"

import useAuth from "../../hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Controle de Estoque",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  const { data: contratos = [], isLoading: loadingContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => contratosService.listar(),
  })

  const { data: movimentacoes = [], isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: () => movimentacoesService.listar(),
  })

  const { data: previsoes = [], isLoading: loadingPrevisoes } = useQuery({
    queryKey: ["previsao-consumo"],
    queryFn: () => contratosService.previsaoConsumo(),
  })

  // Calculate total balance from all items of all contracts
  const totalSaldos = contratos.reduce((acc: number, c: any) => {
    return acc + (c.itens?.reduce((itemAcc: number, item: any) => itemAcc + (item.saldo_atual || 0), 0) || 0)
  }, 0)
  
  const totalContratosValor = contratos.reduce((acc: number, c: any) => acc + (c.valor_total || 0), 0)

  const ultimasMovimentacoes = movimentacoes.slice(0, 5)
  const itensEmAlerta = previsoes.filter((p: any) => p.dias_restantes !== null && p.dias_restantes <= 45).slice(0, 5)


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1
          data-testid="dashboard-greeting"
          className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight"
        >
          Olá, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground mt-1 dark:text-slate-400">
          Visão geral do controle de saldo e movimentações de Notas Fiscais.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Contratos (Ativos)</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {loadingContratos ? "..." : contratos.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <AlertCircle size={12} />
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalContratosValor)} empenhados
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Disponível (Itens)</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {loadingContratos ? "..." : totalSaldos.toLocaleString('pt-BR')} 
            <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-1">unidades</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            Saldos reais deduzidos
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Movimentações</h3>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Activity size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {loadingMovimentacoes ? "..." : movimentacoes.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            Registros totais no sistema
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Últimas 5 Baixas de NF</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-4">ID Nota Fiscal</th>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Movimento</th>
                  <th className="px-6 py-4 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ultimasMovimentacoes.map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      #{mov.nota_fiscal_id}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(mov.data_hora).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
                        <ArrowDownRight size={12} /> {mov.tipo_movimento}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      -{mov.quantidade}
                    </td>
                  </tr>
                ))}
                {ultimasMovimentacoes.length === 0 && !loadingMovimentacoes && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhuma movimentação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Alertas de Esgotamento (45 dias)</h2>
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Contrato</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4 text-right">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itensEmAlerta.map((prev: any) => (
                  <tr key={prev.item_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={prev.item_descricao}>
                      {prev.item_descricao}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {prev.contrato_numero}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {prev.saldo_atual}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                        prev.dias_restantes <= 15 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {prev.dias_restantes} dias
                      </span>
                    </td>
                  </tr>
                ))}
                {itensEmAlerta.length === 0 && !loadingPrevisoes && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                      Nenhum item em risco de esgotamento próximo!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
