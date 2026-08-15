/** Origem do backend, com ou sem sufixo `/api/v1` no `.env`. */
export function apiOrigin(raw = import.meta.env.VITE_API_URL): string {
  const value = (raw || "").trim()
  if (!value) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin.replace(/\/$/, "")
    }
    return "http://localhost:8000"
  }
  return value.replace(/\/api\/v1\/?$/i, "").replace(/\/$/, "")
}

export function apiV1Base(raw = import.meta.env.VITE_API_URL): string {
  return `${apiOrigin(raw)}/api/v1`
}
