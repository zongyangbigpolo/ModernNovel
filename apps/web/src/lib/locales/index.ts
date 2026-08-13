import { en } from "./en"
import type { LocaleDictionaries } from "./types"
import { zhCN } from "./zh-cn"

/** All translation dictionaries, keyed by locale. Consumed by `@/lib/i18n`. */
export const translations: LocaleDictionaries = {
  en,
  "zh-CN": zhCN,
}

export type { LocaleDictionaries, TranslationDict } from "./types"
