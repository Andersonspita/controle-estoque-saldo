import { Link } from "@tanstack/react-router"

import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

/**
 * Marca do SaldoContratual — "selo em relevo".
 * Disco de tinta, anel interno vazado e S em serifa itálica.
 * O anel só é desenhado a partir de 24px; abaixo disso o disco resolve sozinho.
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}) {
  const withRing = size >= 24
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={APP_NAME}
    >
      <circle cx="32" cy="32" r="32" className="fill-[#112928] dark:fill-[#f6f8f8]" />
      {withRing && (
        <circle
          cx="32"
          cy="32"
          r="26.9"
          fill="none"
          strokeWidth="0.9"
          className="stroke-white/25 dark:stroke-[#112928]/25"
        />
      )}
      <g transform="translate(6.1 0) skewX(-11)">
        <text
          x="32"
          y="32"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Instrument Serif', Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          fontSize="42"
          className="fill-[#f6f8f8] dark:fill-[#112928]"
        >
          S
        </text>
      </g>
    </svg>
  )
}

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const wordmark = (size: "sm" | "lg") => (
    <span
      className={cn(
        "font-semibold uppercase tracking-[0.08em] text-foreground",
        size === "lg" ? "text-base" : "text-sm",
      )}
    >
      Saldo Contratual
    </span>
  )

  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "flex items-center gap-3 group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          <LogoMark size={30} />
          {wordmark("sm")}
        </span>
        <LogoMark
          size={26}
          className={cn("hidden group-data-[collapsible=icon]:block", className)}
        />
      </>
    ) : variant === "full" ? (
      <span className={cn("flex items-center gap-3", className)}>
        <LogoMark size={40} />
        {wordmark("lg")}
      </span>
    ) : (
      <LogoMark size={26} className={className} />
    )

  if (!asLink) return content

  return (
    <Link to="/" aria-label={APP_NAME}>
      {content}
    </Link>
  )
}
