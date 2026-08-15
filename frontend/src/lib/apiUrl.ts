/** Origem do backend, com ou sem sufixo `/api/v1` no `.env`. */
export function apiOrigin(raw = import.meta.env.VITE_API_URL): string {
  const value = (raw || "http://localhost:8000").trim()
  return value.replace(/\/api\/v1\/?$/i, "").replace(/\/$/, "")
}

export function apiV1Base(raw = import.meta.env.VITE_API_URL): string {
  return `${apiOrigin(raw)}/api/v1`
}
