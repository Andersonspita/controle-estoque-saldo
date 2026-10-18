export type UnidadeMedida = {
  sigla: string
  nome: string
  grupo: string
}

export const UNIDADES_MEDIDA: UnidadeMedida[] = [
  { sigla: "UN", nome: "Unidade", grupo: "Quantidade" },
  { sigla: "PC", nome: "Peça", grupo: "Quantidade" },
  { sigla: "PR", nome: "Par", grupo: "Quantidade" },
  { sigla: "JG", nome: "Jogo", grupo: "Quantidade" },
  { sigla: "CJ", nome: "Conjunto", grupo: "Quantidade" },
  { sigla: "KIT", nome: "Kit", grupo: "Quantidade" },
  { sigla: "DZ", nome: "Dúzia", grupo: "Quantidade" },
  { sigla: "CT", nome: "Cento", grupo: "Quantidade" },
  { sigla: "MIL", nome: "Milheiro", grupo: "Quantidade" },
  { sigla: "FOL", nome: "Folha", grupo: "Quantidade" },
  { sigla: "CX", nome: "Caixa", grupo: "Embalagem" },
  { sigla: "PCT", nome: "Pacote", grupo: "Embalagem" },
  { sigla: "FD", nome: "Fardo", grupo: "Embalagem" },
  { sigla: "SC", nome: "Saco", grupo: "Embalagem" },
  { sigla: "RL", nome: "Rolo", grupo: "Embalagem" },
  { sigla: "BD", nome: "Balde", grupo: "Embalagem" },
  { sigla: "TMB", nome: "Tambor", grupo: "Embalagem" },
  { sigla: "GL", nome: "Galão", grupo: "Embalagem" },
  { sigla: "LT", nome: "Lata", grupo: "Embalagem" },
  { sigla: "FR", nome: "Frasco", grupo: "Embalagem" },
  { sigla: "AMP", nome: "Ampola", grupo: "Embalagem" },
  { sigla: "VD", nome: "Vidro", grupo: "Embalagem" },
  { sigla: "GF", nome: "Garrafa", grupo: "Embalagem" },
  { sigla: "TB", nome: "Tubo", grupo: "Embalagem" },
  { sigla: "BL", nome: "Blister", grupo: "Embalagem" },
  { sigla: "CART", nome: "Cartela", grupo: "Embalagem" },
  { sigla: "RES", nome: "Resma", grupo: "Embalagem" },
  { sigla: "M", nome: "Metro", grupo: "Comprimento" },
  { sigla: "CM", nome: "Centímetro", grupo: "Comprimento" },
  { sigla: "MM", nome: "Milímetro", grupo: "Comprimento" },
  { sigla: "KM", nome: "Quilômetro", grupo: "Comprimento" },
  { sigla: "M2", nome: "Metro quadrado", grupo: "Área" },
  { sigla: "CM2", nome: "Centímetro quadrado", grupo: "Área" },
  { sigla: "HA", nome: "Hectare", grupo: "Área" },
  { sigla: "L", nome: "Litro", grupo: "Volume" },
  { sigla: "ML", nome: "Mililitro", grupo: "Volume" },
  { sigla: "M3", nome: "Metro cúbico", grupo: "Volume" },
  { sigla: "CM3", nome: "Centímetro cúbico", grupo: "Volume" },
  { sigla: "KG", nome: "Quilograma", grupo: "Massa" },
  { sigla: "G", nome: "Grama", grupo: "Massa" },
  { sigla: "MG", nome: "Miligrama", grupo: "Massa" },
  { sigla: "T", nome: "Tonelada", grupo: "Massa" },
  { sigla: "H", nome: "Hora", grupo: "Tempo e serviço" },
  { sigla: "D", nome: "Dia", grupo: "Tempo e serviço" },
  { sigla: "MES", nome: "Mês", grupo: "Tempo e serviço" },
  { sigla: "ANO", nome: "Ano", grupo: "Tempo e serviço" },
  { sigla: "HH", nome: "Homem-hora", grupo: "Tempo e serviço" },
  { sigla: "SV", nome: "Serviço", grupo: "Tempo e serviço" },
  { sigla: "US", nome: "Unidade de serviço", grupo: "Tempo e serviço" },
  { sigla: "VB", nome: "Verba", grupo: "Tempo e serviço" },
]

const ALIAS: Record<string, string> = {
  unid: "UN",
  und: "UN",
  unidade: "UN",
  unidades: "UN",
  peca: "PC",
  pecas: "PC",
  par: "PR",
  pares: "PR",
  jogo: "JG",
  conjunto: "CJ",
  duzia: "DZ",
  caixa: "CX",
  pacote: "PCT",
  fardo: "FD",
  saco: "SC",
  rolo: "RL",
  balde: "BD",
  tambor: "TMB",
  galao: "GL",
  lata: "LT",
  frasco: "FR",
  ampola: "AMP",
  vidro: "VD",
  garrafa: "GF",
  tubo: "TB",
  resma: "RES",
  metro: "M",
  centimetro: "CM",
  milimetro: "MM",
  quilometro: "KM",
  "metroquadrado": "M2",
  hectare: "HA",
  litro: "L",
  litros: "L",
  mililitro: "ML",
  "metrocubico": "M3",
  quilograma: "KG",
  kilo: "KG",
  quilo: "KG",
  grama: "G",
  tonelada: "T",
  ton: "T",
  hora: "H",
  horas: "H",
  dia: "D",
  dias: "D",
  mes: "MES",
  meses: "MES",
  ano: "ANO",
  anos: "ANO",
  servico: "SV",
  verba: "VB",
}

function chave(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/[\s.-]/g, "")
}

const POR_SIGLA = new Map(UNIDADES_MEDIDA.map((u) => [u.sigla.toUpperCase(), u]))
const POR_NOME = new Map(UNIDADES_MEDIDA.map((u) => [chave(u.nome), u.sigla]))

export function resolverUnidade(valor?: string | null, padrao = "UN") {
  const texto = (valor || "").trim()
  if (!texto) return padrao
  const n = chave(texto)
  if (ALIAS[n]) return ALIAS[n]
  if (POR_SIGLA.has(texto.toUpperCase())) return texto.toUpperCase()
  if (POR_NOME.has(n)) return POR_NOME.get(n) as string
  if (POR_SIGLA.has(n.toUpperCase())) return n.toUpperCase()
  return padrao
}

export function gruposUnidades(lista: UnidadeMedida[] = UNIDADES_MEDIDA) {
  const grupos: { grupo: string; itens: UnidadeMedida[] }[] = []
  for (const unidade of lista) {
    const atual = grupos.find((g) => g.grupo === unidade.grupo)
    if (atual) atual.itens.push(unidade)
    else grupos.push({ grupo: unidade.grupo, itens: [unidade] })
  }
  return grupos
}

export function rotuloUnidade(sigla: string, lista: UnidadeMedida[] = UNIDADES_MEDIDA) {
  const encontrada = lista.find((u) => u.sigla === sigla)
  return encontrada ? `${encontrada.sigla} — ${encontrada.nome}` : sigla
}
