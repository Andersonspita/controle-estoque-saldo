export const APP_NAME = "SaldoContratual"
export const APP_TAGLINE = "Gestão de saldos e itens de contratos"

export function pageTitle(page: string): string {
  return `${page} · ${APP_NAME}`
}
