import { FaGithub } from "react-icons/fa"

import { APP_NAME } from "@/lib/brand"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {APP_NAME} · {currentYear}
        </p>
        <a
          href="https://github.com/Andersonspita/controle-estoque-saldo"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <FaGithub className="h-5 w-5" />
        </a>
      </div>
    </footer>
  )
}
