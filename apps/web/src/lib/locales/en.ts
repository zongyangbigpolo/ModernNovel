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

/**
 * English translation dictionary, assembled from per-domain modules under
 * `./domains/`. Add a new domain by creating `./domains/<name>.ts` (exporting
 * `{ en, "zh-CN" }`) and including its `en` dict below.
 */
export const en: TranslationDict = {
  ...common.en,
  ...auth.en,
  ...legal.en,
  ...dashboard.en,
  ...ai.en,
  ...projects.en,
  ...editor.en,
  ...canvas.en,
  ...codex.en,
}
