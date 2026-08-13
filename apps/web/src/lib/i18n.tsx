import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { translations } from "@/lib/locales"

export type Locale = "en" | "zh-CN"

const STORAGE_KEY = "modernnovel-locale"

type TranslationParams = Record<string, string | number>

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslationParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
  const storedLocale = localStorage.getItem(STORAGE_KEY)
  if (storedLocale === "en" || storedLocale === "zh-CN") {
    return storedLocale
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en"
}

function interpolate(message: string, params?: TranslationParams): string {
  if (!params) {
    return message
  }

  return message.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? `{{${key}}}`))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, params) => {
        const message = translations[locale][key] ?? translations.en[key] ?? key
        return interpolate(message, params)
      },
    }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }

  return context
}
