import { Check, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Locale, useI18n } from "@/lib/i18n"

const localeOptions: Array<{ value: Locale; labelKey: string }> = [
  { value: "zh-CN", labelKey: "language.chinese" },
  { value: "en", labelKey: "language.english" },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={t("language.label")} size="icon" variant="ghost">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        {localeOptions.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setLocale(option.value)}>
            {t(option.labelKey)}
            {locale === option.value && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
