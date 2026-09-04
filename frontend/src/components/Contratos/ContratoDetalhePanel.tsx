import { FilePlus2, Pencil, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatarVigencia } from "@/lib/contrato"
import {
  formatarMoeda,
  saldoMonetarioItem,
  totaisContrato,
  valorContratadoItem,
} from "@/lib/money"
import { percentualRestante } from "@/lib/status"
import { ConsumoBar } from "../Common/ConsumoBar"

/** Um item só conta como aditivado quando a quantidade vigente difere da inicial. */
function itemTemAditivo(item: any) {
  if (item.quantidade_inicial == null) return false
  return Number(item.quantidade_contratada) !== Number(item.quantidade_inicial)
}

function Resumo({
  rotulo,
  valor,
  detalhe,
  forte,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  forte?: boolean
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={`truncate tabular-nums ${
          forte ? "text-lg font-bold" : "text-base font-semibold"
        }`}
      >
        {valor}
      </p>
      {detalhe ? (
        <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
      ) : null}
    </div>
  )
}

function Ficha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p className="text-sm break-words">{valor}</p>
    </div>
  )
}

export function ContratoDetalhePanel({
  contrato,
  onOpenChange,
  onEditar,
  onAditivo,
  podeEditar,
}: {
  contrato: any | null
  onOpenChange: (open: boolean) => void
  onEditar?: (contrato: any) => void
  onAditivo?: (contrato: any) => void
  podeEditar?: boolean
}) {
  const [busca, setBusca] = useState("")

  const itens = contrato?.itens || []
  const totais = contrato
    ? totaisContrato(contrato)
    : {
        valorContratado: 0,
        saldoAtual: 0,
        consumido: 0,
        qtdSaldo: 0,
        qtdContratada: 0,
      }
  const pct = percentualRestante(totais.saldoAtual, totais.valorContratado)

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens
    return itens.filter((item: any) =>
      [item.descricao, item.codigo, item.unidade]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    )
  }, [itens, busca])

  return (
    <Sheet
      open={!!contrato}
      onOpenChange={(open) => {
        if (!open) setBusca("")
        onOpenChange(open)
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-3xl"
        aria-describedby={undefined}
      >
        {contrato ? (
          <>
            <SheetHeader className="border-b p-5 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="font-mono text-lg">
                  Contrato {contrato.numero}
                  {contrato.ano ? `/${contrato.ano}` : ""}
                </SheetTitle>
                <Badge
                  variant={
                    contrato.situacao === "Ativo" ? "success" : "secondary"
                  }
                >
                  {contrato.situacao}
                </Badge>
              </div>
              <SheetDescription className="text-sm">
                {contrato.fornecedor?.razao_social ||
                  `Fornecedor ID ${contrato.fornecedor_id}`}
                {formatarVigencia(contrato.data_inicio, contrato.data_fim)
                  ? ` · Vigência ${formatarVigencia(contrato.data_inicio, contrato.data_fim)}`
                  : ""}
              </SheetDescription>
              {podeEditar ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditar?.(contrato)}
                  >
                    <Pencil /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAditivo?.(contrato)}
                  >
                    <FilePlus2 /> Aditivo
                  </Button>
                </div>
              ) : null}
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Resumo
                  rotulo="Valor contratado"
                  valor={formatarMoeda(totais.valorContratado)}
                  detalhe={
                    contrato.valor_total_inicial != null
                      ? `Inicial ${formatarMoeda(contrato.valor_total_inicial)}`
                      : undefined
                  }
                />
                <Resumo
                  rotulo="Baixado"
                  valor={formatarMoeda(totais.consumido)}
                  detalhe={`${(100 - pct).toFixed(0)}% do contratado`}
                />
                <Resumo
                  rotulo="Saldo atual"
                  valor={formatarMoeda(totais.saldoAtual)}
                  detalhe={`${totais.qtdSaldo.toLocaleString("pt-BR")} de ${totais.qtdContratada.toLocaleString("pt-BR")} unid.`}
                  forte
                />
              </div>

              <div className="mt-3">
                <ConsumoBar percentual={pct} />
              </div>

              {contrato.objeto ||
              contrato.licitacao_numero ||
              contrato.modalidade ||
              contrato.objeto_licitacao ||
              contrato.observacao ? (
                <div className="mt-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Ficha
                      rotulo="Objeto do contrato"
                      valor={contrato.objeto}
                    />
                  </div>
                  <Ficha
                    rotulo="Modalidade da licitação"
                    valor={contrato.modalidade}
                  />
                  <Ficha
                    rotulo="Nº da licitação"
                    valor={contrato.licitacao_numero}
                  />
                  <div className="sm:col-span-2">
                    <Ficha
                      rotulo="Objeto da licitação"
                      valor={contrato.objeto_licitacao}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Ficha rotulo="Observação" valor={contrato.observacao} />
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  Itens do contrato{" "}
                  <span className="font-normal text-muted-foreground">
                    ({itens.length})
                  </span>
                </h3>
                {itens.length > 5 ? (
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Filtrar itens"
                      className="h-9 rounded-lg bg-muted/50 pl-8"
                    />
                  </div>
                ) : null}
              </div>

              {itens.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Este contrato ainda não possui itens cadastrados.
                </p>
              ) : itensFiltrados.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum item corresponde ao filtro.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {itensFiltrados.map((item: any) => {
                    const pctItem = percentualRestante(
                      item.saldo_atual,
                      item.quantidade_contratada,
                    )
                    return (
                      <li
                        key={item.id}
                        className="rounded-lg border bg-card p-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">
                              {item.codigo ? `${item.codigo} · ` : ""}
                              {item.descricao}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatarMoeda(item.valor_unitario || 0)} /{" "}
                              {item.unidade}
                              {itemTemAditivo(item)
                                ? ` · aditivado (inicial ${Number(item.quantidade_inicial).toLocaleString("pt-BR")})`
                                : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold tabular-nums">
                              {formatarMoeda(saldoMonetarioItem(item))}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {Number(item.saldo_atual).toLocaleString("pt-BR")}{" "}
                              de{" "}
                              {Number(
                                item.quantidade_contratada,
                              ).toLocaleString("pt-BR")}{" "}
                              {item.unidade}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center gap-3">
                          <ConsumoBar percentual={pctItem} size="sm" />
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            contratado{" "}
                            {formatarMoeda(valorContratadoItem(item))}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
