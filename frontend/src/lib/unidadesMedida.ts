export type UnidadeMedida = {
  sigla: string
  nome: string
  grupo: string
  inteira: boolean
}

export const UNIDADES_MEDIDA: UnidadeMedida[] = [
  { sigla: "UN", nome: "Unidade", grupo: "Quantidade", inteira: true },
  { sigla: "PC", nome: "Peça", grupo: "Quantidade", inteira: true },
  { sigla: "PR", nome: "Par", grupo: "Quantidade", inteira: true },
  { sigla: "JG", nome: "Jogo", grupo: "Quantidade", inteira: true },
  { sigla: "CJ", nome: "Conjunto", grupo: "Quantidade", inteira: true },
  { sigla: "KIT", nome: "Kit", grupo: "Quantidade", inteira: true },
  { sigla: "DZ", nome: "Dúzia", grupo: "Quantidade", inteira: true },
  { sigla: "CT", nome: "Cento", grupo: "Quantidade", inteira: true },
  { sigla: "MIL", nome: "Milheiro", grupo: "Quantidade", inteira: true },
  { sigla: "FOL", nome: "Folha", grupo: "Quantidade", inteira: true },
  { sigla: "CX", nome: "Caixa", grupo: "Embalagem", inteira: true },
  { sigla: "PCT", nome: "Pacote", grupo: "Embalagem", inteira: true },
  { sigla: "FD", nome: "Fardo", grupo: "Embalagem", inteira: true },
  { sigla: "SC", nome: "Saco", grupo: "Embalagem", inteira: true },
  { sigla: "RL", nome: "Rolo", grupo: "Embalagem", inteira: true },
  { sigla: "BD", nome: "Balde", grupo: "Embalagem", inteira: true },
  { sigla: "TMB", nome: "Tambor", grupo: "Embalagem", inteira: true },
  { sigla: "GL", nome: "Galão", grupo: "Embalagem", inteira: true },
  { sigla: "LT", nome: "Lata", grupo: "Embalagem", inteira: true },
  { sigla: "FR", nome: "Frasco", grupo: "Embalagem", inteira: true },
  { sigla: "AMP", nome: "Ampola", grupo: "Embalagem", inteira: true },
  { sigla: "VD", nome: "Vidro", grupo: "Embalagem", inteira: true },
  { sigla: "GF", nome: "Garrafa", grupo: "Embalagem", inteira: true },
  { sigla: "TB", nome: "Tubo", grupo: "Embalagem", inteira: true },
  { sigla: "BL", nome: "Blister", grupo: "Embalagem", inteira: true },
  { sigla: "CART", nome: "Cartela", grupo: "Embalagem", inteira: true },
  { sigla: "RES", nome: "Resma", grupo: "Embalagem", inteira: true },
  { sigla: "M", nome: "Metro", grupo: "Comprimento", inteira: false },
  { sigla: "CM", nome: "Centímetro", grupo: "Comprimento", inteira: false },
  { sigla: "MM", nome: "Milímetro", grupo: "Comprimento", inteira: false },
  { sigla: "KM", nome: "Quilômetro", grupo: "Comprimento", inteira: false },
  { sigla: "M2", nome: "Metro quadrado", grupo: "Área", inteira: false },
  { sigla: "CM2", nome: "Centímetro quadrado", grupo: "Área", inteira: false },
  { sigla: "HA", nome: "Hectare", grupo: "Área", inteira: false },
  { sigla: "L", nome: "Litro", grupo: "Volume", inteira: false },
  { sigla: "ML", nome: "Mililitro", grupo: "Volume", inteira: false },
  { sigla: "M3", nome: "Metro cúbico", grupo: "Volume", inteira: false },
  { sigla: "CM3", nome: "Centímetro cúbico", grupo: "Volume", inteira: false },
  { sigla: "KG", nome: "Quilograma", grupo: "Massa", inteira: false },
  { sigla: "G", nome: "Grama", grupo: "Massa", inteira: false },
  { sigla: "MG", nome: "Miligrama", grupo: "Massa", inteira: false },
  { sigla: "T", nome: "Tonelada", grupo: "Massa", inteira: false },
  { sigla: "H", nome: "Hora", grupo: "Tempo e serviço", inteira: false },
  { sigla: "D", nome: "Dia", grupo: "Tempo e serviço", inteira: true },
  { sigla: "MES", nome: "Mês", grupo: "Tempo e serviço", inteira: true },
  { sigla: "ANO", nome: "Ano", grupo: "Tempo e serviço", inteira: true },
  { sigla: "HH", nome: "Homem-hora", grupo: "Tempo e serviço", inteira: false },
  { sigla: "SV", nome: "Serviço", grupo: "Tempo e serviço", inteira: true },
  { sigla: "US", nome: "Unidade de serviço", grupo: "Tempo e serviço", inteira: true },
  { sigla: "VB", nome: "Verba", grupo: "Tempo e serviço", inteira: true },
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

export function unidadeEhInteira(unidade?: string | null) {
  const sigla = resolverUnidade(unidade)
  return POR_SIGLA.get(sigla)?.inteira ?? sigla.toLowerCase().startsWith("un")
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
