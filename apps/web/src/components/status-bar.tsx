import { HelpCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { AutocompleteToggle } from "@/components/autocomplete-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n"
import type { SaveState } from "@/lib/save-status"

interface StatusBarProps {
  onShowGuide?: () => void
  savedAt: string | null
  saveState: SaveState
  wordCount: number
}

function formatTime(isoDate: string, locale: string): string {
  return new Date(isoDate).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

function getSaveStatusText(
  t: (key: string, params?: Record<string, string | number>) => string,
  saveState: SaveState,
  savedAt: string | null,
  locale: string
): string {
  switch (saveState) {
    case "dirty":
      return t("editor.write.save.unsavedChanges")
    case "saving":
      return t("editor.write.save.saving")
    case "error":
      return t("editor.write.save.failedRetrying")
    case "conflict":
      return t("editor.write.save.editedElsewhereReload")
    case "saved":
      return savedAt
        ? t("editor.write.save.savedAt", { time: formatTime(savedAt, locale) })
        : t("editor.write.save.saved")
    default:
      return savedAt
        ? t("editor.write.save.lastSavedAt", { time: formatTime(savedAt, locale) })
        : t("editor.write.save.notSavedYet")
  }
}

export function StatusBar({ wordCount, saveState, savedAt, onShowGuide }: StatusBarProps) {
  const { locale, t } = useI18n()
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  )

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))
    }, 60_000) // Update every minute

    return () => clearInterval(interval)
  }, [locale])

  return (
    <footer className="border-t px-2 py-2 sm:px-6">
      <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <span className="whitespace-nowrap">
            {t("editor.write.words", { count: wordCount.toLocaleString(locale) })}
          </span>
          <Separator className="h-4" orientation="vertical" />
          <span className="truncate">{getSaveStatusText(t, saveState, savedAt, locale)}</span>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <span>{currentTime}</span>
          <div className="h-4 w-px bg-border" />
          <AutocompleteToggle />
          {onShowGuide && (
            <Button
              aria-label={t("editor.write.showGuide")}
              className="h-6 w-6 p-0"
              onClick={onShowGuide}
              size="sm"
              title={t("editor.write.showGuide")}
              type="button"
              variant="ghost"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  )
}
