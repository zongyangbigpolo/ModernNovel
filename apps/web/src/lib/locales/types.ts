import type { Locale } from "@/lib/i18n"

/** A flat map of translation keys to their translated string for one locale. */
export type TranslationDict = Record<string, string>

/** A translation dictionary keyed by locale, e.g. `{ en: {...}, "zh-CN": {...} }`. */
export type LocaleDictionaries = Record<Locale, TranslationDict>
