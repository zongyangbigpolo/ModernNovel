import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { LogOut, Monitor, Moon, Repeat2, Sun, UserRound } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n"
import { Button } from "./ui/button"
import { Skeleton } from "./ui/skeleton"

async function fetchSession() {
  const baseUrl =
    import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
      ? import.meta.env.VITE_SERVER_URL
      : window.location.origin

  const response = await fetch(`${baseUrl}/api/session`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch session")
  }

  return response.json()
}

export async function signOut() {
  const baseUrl =
    import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
      ? import.meta.env.VITE_SERVER_URL
      : window.location.origin

  const response = await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to sign out")
  }
}

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setTheme, theme } = useTheme()
  const { t } = useI18n()
  const [isEndingSession, setIsEndingSession] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: 2,
    staleTime: 0, // Always consider stale
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const handleEndSession = async (destination: "/" | "/login") => {
    if (isEndingSession) {
      return
    }

    setIsEndingSession(true)
    try {
      await signOut()
      queryClient.removeQueries({ queryKey: ["session"] })
      toast.dismiss()
      await navigate({ to: destination })
    } catch {
      toast.error(t("account.signOutFailed"))
    } finally {
      setIsEndingSession(false)
    }
  }

  if (sessionQuery.isLoading) {
    return <Skeleton className={compact ? "size-9" : "h-9 w-24"} />
  }

  if (!sessionQuery.data?.authenticated) {
    return (
      <Button
        aria-label={t("auth.signIn")}
        asChild
        size={compact ? "icon" : "default"}
        variant="outline"
      >
        <Link to="/login">{compact ? <UserRound className="h-4 w-4" /> : t("auth.signIn")}</Link>
      </Button>
    )
  }

  const session = sessionQuery.data.session

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={compact ? t("account.openMenu") : undefined}
          className={compact ? undefined : "w-full"}
          size={compact ? "icon" : "default"}
          variant="outline"
        >
          {compact ? <UserRound className="h-4 w-4" /> : session.user.name || t("common.user")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
        <DropdownMenuLabel>{t("account.myAccount")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>{session.user.email}</DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* Theme Selection */}
        <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          {t("theme.light")}
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          {t("theme.dark")}
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          {t("theme.system")}
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isEndingSession} onClick={() => handleEndSession("/login")}>
          <Repeat2 className="mr-2 h-4 w-4" />
          {t("account.switchAccount")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={isEndingSession}
          onClick={() => handleEndSession("/")}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
