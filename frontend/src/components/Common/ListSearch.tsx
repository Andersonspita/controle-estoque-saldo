import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouterState } from "@tanstack/react-router"

type ListSearchContextValue = {
  query: string
  setQuery: (value: string) => void
}

const ListSearchContext = createContext<ListSearchContextValue | null>(null)

export function ListSearchProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [query, setQuery] = useState("")

  useEffect(() => {
    setQuery("")
  }, [pathname])

  const value = useMemo(() => ({ query, setQuery }), [query])
  return <ListSearchContext.Provider value={value}>{children}</ListSearchContext.Provider>
}

export function useListSearch() {
  const ctx = useContext(ListSearchContext)
  if (!ctx) {
    throw new Error("useListSearch deve ser usado dentro de ListSearchProvider")
  }
  return ctx
}
