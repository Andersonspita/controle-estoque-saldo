import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between">
          <Logo variant="full" className="h-[30px] text-base" asLink={false} />
          <Appearance />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
        <Footer />
      </div>
      <div className="relative hidden items-center justify-center bg-foreground p-12 text-background lg:flex">
        <div className="max-w-md space-y-8">
          <p className="text-2xl font-medium tracking-tight">{APP_TAGLINE}</p>
          <ul className="space-y-3 text-sm text-background/80">
            <li>Importação de XML e PDF com OCR</li>
            <li>Vínculo automático dos itens da NF ao contrato</li>
            <li>Previsão de consumo e alerta de esgotamento</li>
          </ul>
          <p className="text-sm font-medium text-background/90">{APP_NAME}</p>
        </div>
      </div>
    </div>
  )
}
