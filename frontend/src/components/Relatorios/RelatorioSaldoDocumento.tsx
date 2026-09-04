import { Fragment } from "react"

import { formatarDataBR } from "@/lib/contrato"
import {
  dataHoraExtenso,
  numeroBR,
  percentualBR,
  quantidadeBR,
  quantidadeTotalBR,
} from "@/lib/relatorio"
import { unidadeEhInteira } from "@/lib/unidadesMedida"

import "./relatorio.css"

export type RelatorioItem = {
  item_id: number
  numero_item: number
  codigo?: string | null
  descricao: string
  unidade: string
  valor_unitario: number
  quantidade_contratada: number
  valor_contratado: number
  quantidade_aditivada: number
  valor_aditivado: number
  quantidade_vigente: number
  valor_vigente: number
  quantidade_utilizada: number
  valor_utilizado: number
  quantidade_saldo: number
  valor_saldo: number
  percentual_utilizado: number
}

export type RelatorioTotais = Omit<
  RelatorioItem,
  | "item_id"
  | "numero_item"
  | "codigo"
  | "descricao"
  | "unidade"
  | "valor_unitario"
>

export type RelatorioOrgao = {
  almoxarifado_id?: number | null
  nome: string
  quantidade_utilizada: number
  valor_utilizado: number
}

export type RelatorioContrato = {
  contrato_id: number
  numero: string
  ano: number
  objeto: string
  situacao: string
  data_inicio?: string | null
  data_fim?: string | null
  licitacao_numero?: string | null
  modalidade?: string | null
  objeto_licitacao?: string | null
  observacao?: string | null
  fornecedor_razao_social: string
  fornecedor_nome_fantasia?: string | null
  fornecedor_cnpj?: string | null
  fornecedor_cidade?: string | null
  fornecedor_estado?: string | null
  fornecedor_telefone?: string | null
  fornecedor_email?: string | null
  itens: RelatorioItem[]
  orgaos: RelatorioOrgao[]
  totais: RelatorioTotais
}

export type RelatorioSaldo = {
  emitente: { nome: string; estado?: string | null; setor?: string | null }
  gerado_em: string
  contratos: RelatorioContrato[]
  totais: RelatorioTotais
}

const COLUNAS = 13

function Campo({
  rotulo,
  valor,
  forte,
  className,
}: {
  rotulo: string
  valor: string
  forte?: boolean
  className?: string
}) {
  return (
    <div className={`rel-campo ${className || ""}`}>
      <span className="rel-rotulo">{rotulo}</span>
      <span className={`rel-valor ${forte ? "rel-valor--forte" : ""}`}>
        {valor || "—"}
      </span>
    </div>
  )
}

function Emitente({ emitente }: { emitente: RelatorioSaldo["emitente"] }) {
  return (
    <div className="rel-emitente">
      <div className="rel-emitente-nome">{emitente.nome}</div>
      {emitente.estado ? (
        <div className="rel-emitente-linha">{emitente.estado}</div>
      ) : null}
      {emitente.setor ? (
        <div className="rel-emitente-linha">{emitente.setor}</div>
      ) : null}
      <div className="rel-titulo">Relatório de Saldo de Contrato</div>
    </div>
  )
}

function ConsumoPorOrgao({ orgaos }: { orgaos: RelatorioOrgao[] }) {
  if (orgaos.length === 0) return null

  // Duas colunas por linha, como no relatório de origem.
  const linhas: RelatorioOrgao[][] = []
  for (let i = 0; i < orgaos.length; i += 2) {
    linhas.push(orgaos.slice(i, i + 2))
  }

  return (
    <div className="rel-secao">
      <div className="rel-secao-titulo">Consumo por órgão de destino</div>
      <table className="rel-tabela">
        <thead>
          <tr>
            <th>Unidade / Órgão</th>
            <th style={{ width: "12%" }}>Quant. utilizada</th>
            <th style={{ width: "14%" }}>Valor utilizado</th>
            <th>Unidade / Órgão</th>
            <th style={{ width: "12%" }}>Quant. utilizada</th>
            <th style={{ width: "14%" }}>Valor utilizado</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((par) => (
            <tr key={par.map((o) => o.nome).join("|")}>
              {[0, 1].map((coluna) => {
                const orgao = par[coluna]
                if (!orgao) {
                  return (
                    <td key={coluna} colSpan={3} aria-hidden>
                      &nbsp;
                    </td>
                  )
                }
                return (
                  <Fragment key={coluna}>
                    <td>{orgao.nome}</td>
                    <td className="rel-num">
                      {quantidadeTotalBR(orgao.quantidade_utilizada)}
                    </td>
                    <td className="rel-num">
                      {numeroBR(orgao.valor_utilizado)}
                    </td>
                  </Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelaItens({ contrato }: { contrato: RelatorioContrato }) {
  const { itens, totais } = contrato

  return (
    <div className="rel-secao">
      <div className="rel-secao-titulo">Itens do contrato</div>
      <table className="rel-tabela">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: "3%" }}>
              Item
            </th>
            <th rowSpan={2}>Descrição</th>
            <th rowSpan={2} style={{ width: "4%" }}>
              Unid.
            </th>
            <th rowSpan={2} style={{ width: "7%" }}>
              Vl. unit.
            </th>
            <th colSpan={2} className="rel-grupo">
              Contratado
            </th>
            <th colSpan={2} className="rel-grupo">
              Aditivado
            </th>
            <th colSpan={2} className="rel-grupo">
              Utilizado
            </th>
            <th colSpan={2} className="rel-grupo">
              Saldo
            </th>
            <th rowSpan={2} style={{ width: "5%" }} className="rel-grupo">
              % util.
            </th>
          </tr>
          <tr>
            <th className="rel-grupo" style={{ width: "6%" }}>
              Quant.
            </th>
            <th style={{ width: "8%" }}>Valor</th>
            <th className="rel-grupo" style={{ width: "6%" }}>
              Quant.
            </th>
            <th style={{ width: "8%" }}>Valor</th>
            <th className="rel-grupo" style={{ width: "6%" }}>
              Quant.
            </th>
            <th style={{ width: "8%" }}>Valor</th>
            <th className="rel-grupo" style={{ width: "6%" }}>
              Quant.
            </th>
            <th style={{ width: "8%" }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 ? (
            <tr>
              <td colSpan={COLUNAS} className="rel-centro">
                Este contrato não possui itens cadastrados.
              </td>
            </tr>
          ) : (
            itens.map((item) => {
              const inteira = unidadeEhInteira(item.unidade)
              const esgotado = item.quantidade_saldo <= 0
              return (
                <tr
                  key={item.item_id}
                  className={esgotado ? "rel-esgotado" : undefined}
                >
                  <td className="rel-centro">{item.numero_item}</td>
                  <td>
                    {item.codigo ? `${item.codigo} · ` : ""}
                    {item.descricao}
                  </td>
                  <td className="rel-centro">{item.unidade}</td>
                  <td className="rel-num">{numeroBR(item.valor_unitario)}</td>
                  <td className="rel-num rel-grupo">
                    {quantidadeBR(item.quantidade_contratada, inteira)}
                  </td>
                  <td className="rel-num">{numeroBR(item.valor_contratado)}</td>
                  <td className="rel-num rel-grupo">
                    {quantidadeBR(item.quantidade_aditivada, inteira)}
                  </td>
                  <td className="rel-num">{numeroBR(item.valor_aditivado)}</td>
                  <td className="rel-num rel-grupo">
                    {quantidadeBR(item.quantidade_utilizada, inteira)}
                  </td>
                  <td className="rel-num">{numeroBR(item.valor_utilizado)}</td>
                  <td className="rel-num rel-grupo">
                    {quantidadeBR(item.quantidade_saldo, inteira)}
                  </td>
                  <td className="rel-num">{numeroBR(item.valor_saldo)}</td>
                  <td className="rel-num rel-grupo">
                    {percentualBR(item.percentual_utilizado)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="rel-centro">
              Totais
            </td>
            <td className="rel-num rel-grupo">
              {quantidadeTotalBR(totais.quantidade_contratada)}
            </td>
            <td className="rel-num">{numeroBR(totais.valor_contratado)}</td>
            <td className="rel-num rel-grupo">
              {quantidadeTotalBR(totais.quantidade_aditivada)}
            </td>
            <td className="rel-num">{numeroBR(totais.valor_aditivado)}</td>
            <td className="rel-num rel-grupo">
              {quantidadeTotalBR(totais.quantidade_utilizada)}
            </td>
            <td className="rel-num">{numeroBR(totais.valor_utilizado)}</td>
            <td className="rel-num rel-grupo">
              {quantidadeTotalBR(totais.quantidade_saldo)}
            </td>
            <td className="rel-num">{numeroBR(totais.valor_saldo)}</td>
            <td className="rel-num rel-grupo">
              {percentualBR(totais.percentual_utilizado)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function FolhaContrato({
  contrato,
  emitente,
  geradoEm,
}: {
  contrato: RelatorioContrato
  emitente: RelatorioSaldo["emitente"]
  geradoEm: string
}) {
  const vigente = contrato.totais.valor_vigente
  const documentoFornecedor = contrato.fornecedor_cnpj || ""
  const cidadeUf = [contrato.fornecedor_cidade, contrato.fornecedor_estado]
    .filter(Boolean)
    .join(" / ")

  return (
    <section className="rel-folha">
      <Emitente emitente={emitente} />

      <div className="rel-identificacao">
        <div className="rel-grade">
          <Campo
            rotulo="Contratado"
            valor={contrato.fornecedor_razao_social}
            forte
            className="rel-campo--largo"
          />
        </div>
        <div className="rel-grade">
          <Campo
            rotulo="CNPJ / CPF"
            valor={documentoFornecedor}
            className="rel-campo--duplo"
          />
          <Campo
            rotulo="Cidade / UF"
            valor={cidadeUf}
            className="rel-campo--duplo rel-campo--fim"
          />
        </div>
        <div className="rel-grade">
          <Campo
            rotulo="Contrato nº"
            valor={`${contrato.numero}/${contrato.ano}`}
            forte
          />
          <Campo rotulo="Situação" valor={contrato.situacao} />
          <Campo
            rotulo="Data inicial"
            valor={formatarDataBR(contrato.data_inicio)}
          />
          <Campo
            rotulo="Data final"
            valor={formatarDataBR(contrato.data_fim)}
          />
        </div>
        <div className="rel-grade">
          <Campo
            rotulo="Licitação nº"
            valor={contrato.licitacao_numero || ""}
            className="rel-campo--duplo"
          />
          <Campo
            rotulo="Modalidade da licitação"
            valor={contrato.modalidade || ""}
            className="rel-campo--duplo rel-campo--fim"
          />
        </div>
        <div className="rel-grade">
          <Campo
            rotulo="Valor contratado"
            valor={numeroBR(contrato.totais.valor_contratado)}
          />
          <Campo
            rotulo="Valor aditivado"
            valor={numeroBR(contrato.totais.valor_aditivado)}
          />
          <Campo rotulo="Valor vigente" valor={numeroBR(vigente)} forte />
          <Campo
            rotulo="Saldo disponível"
            valor={numeroBR(contrato.totais.valor_saldo)}
            forte
          />
        </div>
        <div className="rel-grade">
          <Campo
            rotulo="Objeto do contrato"
            valor={contrato.objeto}
            className="rel-campo--largo"
          />
        </div>
        {contrato.observacao ? (
          <div className="rel-grade">
            <Campo
              rotulo="Observação"
              valor={contrato.observacao}
              className="rel-campo--largo rel-campo--ultimo"
            />
          </div>
        ) : null}
      </div>

      <ConsumoPorOrgao orgaos={contrato.orgaos} />
      <TabelaItens contrato={contrato} />

      <div className="rel-rodape">
        <span>{dataHoraExtenso(geradoEm)}</span>
        <span>
          Contrato {contrato.numero}/{contrato.ano} · {contrato.itens.length}{" "}
          {contrato.itens.length === 1 ? "item" : "itens"}
        </span>
      </div>
    </section>
  )
}

function FolhaConsolidada({ relatorio }: { relatorio: RelatorioSaldo }) {
  const { totais, contratos } = relatorio

  return (
    <section className="rel-folha">
      <Emitente emitente={relatorio.emitente} />
      <div className="rel-subtitulo">
        Consolidado de {contratos.length} contratos
      </div>

      <div className="rel-secao">
        <table className="rel-tabela">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Contrato</th>
              <th>Contratado</th>
              <th style={{ width: "10%" }}>Vigência</th>
              <th style={{ width: "7%" }}>Situação</th>
              <th style={{ width: "10%" }}>Valor contratado</th>
              <th style={{ width: "9%" }}>Valor aditivado</th>
              <th style={{ width: "10%" }}>Valor vigente</th>
              <th style={{ width: "10%" }}>Valor utilizado</th>
              <th style={{ width: "10%" }}>Saldo</th>
              <th style={{ width: "6%" }}>% util.</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((contrato) => (
              <tr key={contrato.contrato_id}>
                <td className="rel-centro">
                  {contrato.numero}/{contrato.ano}
                </td>
                <td>{contrato.fornecedor_razao_social}</td>
                <td className="rel-centro">
                  {formatarDataBR(contrato.data_inicio)} a{" "}
                  {formatarDataBR(contrato.data_fim)}
                </td>
                <td className="rel-centro">{contrato.situacao}</td>
                <td className="rel-num">
                  {numeroBR(contrato.totais.valor_contratado)}
                </td>
                <td className="rel-num">
                  {numeroBR(contrato.totais.valor_aditivado)}
                </td>
                <td className="rel-num">
                  {numeroBR(contrato.totais.valor_vigente)}
                </td>
                <td className="rel-num">
                  {numeroBR(contrato.totais.valor_utilizado)}
                </td>
                <td className="rel-num">
                  {numeroBR(contrato.totais.valor_saldo)}
                </td>
                <td className="rel-num">
                  {percentualBR(contrato.totais.percentual_utilizado)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="rel-centro">
                Totais
              </td>
              <td className="rel-num">{numeroBR(totais.valor_contratado)}</td>
              <td className="rel-num">{numeroBR(totais.valor_aditivado)}</td>
              <td className="rel-num">{numeroBR(totais.valor_vigente)}</td>
              <td className="rel-num">{numeroBR(totais.valor_utilizado)}</td>
              <td className="rel-num">{numeroBR(totais.valor_saldo)}</td>
              <td className="rel-num">
                {percentualBR(totais.percentual_utilizado)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rel-rodape">
        <span>{dataHoraExtenso(relatorio.gerado_em)}</span>
        <span>Resumo consolidado</span>
      </div>
    </section>
  )
}

export function RelatorioSaldoDocumento({
  relatorio,
  comConsolidado = true,
}: {
  relatorio: RelatorioSaldo
  comConsolidado?: boolean
}) {
  const mostrarConsolidado = comConsolidado && relatorio.contratos.length > 1

  return (
    <div className="rel-doc">
      {mostrarConsolidado ? <FolhaConsolidada relatorio={relatorio} /> : null}
      {relatorio.contratos.map((contrato) => (
        <FolhaContrato
          key={contrato.contrato_id}
          contrato={contrato}
          emitente={relatorio.emitente}
          geradoEm={relatorio.gerado_em}
        />
      ))}
    </div>
  )
}
