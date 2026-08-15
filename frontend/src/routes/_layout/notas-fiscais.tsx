import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ImportNFModal } from "../../components/NotasFiscais/ImportNFModal"
import { BaixaModal } from "../../components/NotasFiscais/BaixaModal"
import { ConferenciaModal } from "../../components/NotasFiscais/ConferenciaModal"
import { useQuery } from "@tanstack/react-query"
import { notasFiscaisService } from "../../services/api"
import { FileText, Link2, Play } from "lucide-react"
import { pageTitle } from "@/lib/brand"

export const Route = createFileRoute("/_layout/notas-fiscais")({
  component: NotasFiscaisPage,
  head: () => ({
    meta: [{ title: pageTitle("Notas Fiscais") }],
  }),
})

function NotasFiscaisPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [baixaModalNF, setBaixaModalNF] = useState<any | null>(null)
  const [conferenciaNF, setConferenciaNF] = useState<any | null>(null)

  // Os dados são carregados em tempo real da API
  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: () => notasFiscaisService.listar(),
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Notas Fiscais</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie as notas fiscais importadas e realize as baixas de saldo dos contratos.</p>
        </div>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex gap-2 items-center px-4 py-2 rounded-md font-medium text-sm"
        >
          <FileText size={18} />
          Importar Nota Fiscal
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden transition-colors">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Número da NF</th>
              <th className="px-6 py-4">Data Emissão</th>
              <th className="px-6 py-4">Valor Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {notas.map((nf: any) => (
              <tr key={nf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">#{nf.numero}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{nf.data_emissao}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nf.valor_total)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${nf.status === 'Baixada' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                    {nf.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {nf.status !== "Baixada" && (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setConferenciaNF(nf)}
                        className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm flex items-center gap-1 transition-colors"
                      >
                        <Link2 size={14} /> Conferir vínculos
                      </button>
                      <button
                        onClick={() => setBaixaModalNF(nf)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-1 transition-colors"
                      >
                        <Play size={14} /> Executar Baixa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {notas.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhuma nota fiscal encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ImportNFModal isOpen={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
      {conferenciaNF && (
        <ConferenciaModal
          nf={conferenciaNF}
          isOpen={!!conferenciaNF}
          onOpenChange={(open: boolean) => !open && setConferenciaNF(null)}
        />
      )}
      {baixaModalNF && (
        <BaixaModal nf={baixaModalNF} isOpen={!!baixaModalNF} onOpenChange={(open: boolean) => !open && setBaixaModalNF(null)} />
      )}
    </div>
  )
}
