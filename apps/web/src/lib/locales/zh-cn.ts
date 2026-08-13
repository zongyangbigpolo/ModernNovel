import { ai } from "./domains/ai"
import { auth } from "./domains/auth"
import { canvas } from "./domains/canvas"
import { codex } from "./domains/codex"
import { common } from "./domains/common"
import { dashboard } from "./domains/dashboard"
import { editor } from "./domains/editor"
import { legal } from "./domains/legal"
import { projects } from "./domains/projects"
import type { TranslationDict } from "./types"

/** Simplified Chinese translation dictionary assembled from per-domain modules. */
export const zhCN: TranslationDict = {
  ...common["zh-CN"],
  ...auth["zh-CN"],
  ...legal["zh-CN"],
  ...dashboard["zh-CN"],
  ...ai["zh-CN"],
  ...projects["zh-CN"],
  ...editor["zh-CN"],
  ...canvas["zh-CN"],
  ...codex["zh-CN"],
}
