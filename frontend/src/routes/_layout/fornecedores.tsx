import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fornecedoresService } from "../../services/api"
import { Truck, Plus } from "lucide-react"
import { AddFornecedorModal } from "../../components/Fornecedores/AddFornecedorModal"
import useAuth from "../../hooks/useAuth"
import { pageTitle } from "@/lib/brand"

export const Route = createFileRoute("/_layout/fornecedores")({
  component: FornecedoresPage,
  head: () => ({
    meta: [{ title: pageTitle("Fornecedores") }],
  }),
})

function FornecedoresPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { isAdmin } = useAuth()

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => fornecedoresService.listar(),
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Truck size={24} className="text-slate-500" /> Fornecedores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie os fornecedores cadastrados para licitações e contratos.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex gap-2 items-center px-4 py-2 rounded-md font-medium text-sm"
          >
            <Plus size={18} />
            Novo Fornecedor
          </button>
        )}
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden transition-colors">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Razão Social</th>
              <th className="px-6 py-4">CNPJ</th>
              <th className="px-6 py-4">Localização</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {fornecedores.map((forn: any) => (
              <tr key={forn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">#{forn.id}</td>
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{forn.razao_social}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{forn.cnpj}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {forn.cidade ? `${forn.cidade}/${forn.estado}` : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${forn.ativo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {forn.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {fornecedores.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhum fornecedor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && <AddFornecedorModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} />}
    </div>
  )
}
