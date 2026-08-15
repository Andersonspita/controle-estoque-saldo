import { Link } from "@tanstack/react-router"
import { Scale } from "lucide-react"

import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "flex items-center gap-2 font-semibold tracking-tight group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          <Scale className="size-5 shrink-0" aria-hidden />
          {APP_NAME}
        </span>
        <Scale
          className={cn(
            "size-5 hidden group-data-[collapsible=icon]:block",
            className,
          )}
          aria-label={APP_NAME}
        />
      </>
    ) : variant === "full" ? (
      <span
        className={cn(
          "flex items-center gap-2 font-semibold tracking-tight",
          className,
        )}
      >
        <Scale className="size-8 shrink-0" aria-hidden />
        <span className="text-2xl leading-none">{APP_NAME}</span>
      </span>
    ) : (
      <Scale className={cn("size-5", className)} aria-label={APP_NAME} />
    )

  if (!asLink) {
    return content
  }

  return (
    <Link to="/" aria-label={APP_NAME}>
      {content}
    </Link>
  )
}
