import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg"
  to?: string
}

export function Logo({ className, to = "/", size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5 sm:h-6 sm:w-6",
    lg: "h-6 w-6 sm:h-8 sm:w-8",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
  }

  const content = (
    <>
      <svg
        aria-label="ModernNovel brush mark"
        className={cn(sizeClasses[size])}
        fill="none"
        role="img"
        viewBox="0 0 32 32"
      >
        <path
          d="M24.8 3.8c-4.9 3.6-9.2 8.1-12.5 13.3-1.7 2.7-3 5.3-3.8 7.7 2.2-1.1 4.6-2.7 7-4.8 4.8-4.2 8.5-9.1 11-14.7.7-1.6-.3-2.5-1.7-1.5Z"
          fill="currentColor"
        />
        <path
          d="M8.8 21.3c-2.7 1.4-4.3 3.4-4.8 6 2.6-.2 4.8-1.3 6.5-3.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M13.4 24.8c4.4.9 8.7.8 13-.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
      {showText && (
        <span className={cn("font-semibold tracking-tight", textSizeClasses[size])}>
          ModernNovel
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link className={cn("flex items-center space-x-2", className)} to={to}>
        {content}
      </Link>
    )
  }

  return <div className={cn("flex items-center space-x-2", className)}>{content}</div>
}
