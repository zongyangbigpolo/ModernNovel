/**
 * Word counting for editor HTML content.
 * Strips tags and entities, counts each CJK character as one word and
 * other text as whitespace-separated words.
 */

const HTML_TAG_PATTERN = /<[^>]*>/g
const HTML_ENTITY_PATTERN = /&[#a-zA-Z0-9]+;/g
const WHITESPACE_PATTERN = /\s+/
// Han ideographs, kana and Hangul count one per character, as Chinese/Japanese/Korean 字数 conventions expect
const CJK_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
const CJK_PUNCTUATION_PATTERN =
  /[\u3000-\u303f\uff00-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/g

export function countWordsInHtml(html: string): number {
  const text = html.replace(HTML_TAG_PATTERN, " ").replace(HTML_ENTITY_PATTERN, " ").trim()

  if (text.length === 0) {
    return 0
  }

  const cjkCount = text.match(CJK_CHARACTER_PATTERN)?.length ?? 0
  const rest = text.replace(CJK_CHARACTER_PATTERN, " ").replace(CJK_PUNCTUATION_PATTERN, " ").trim()
  const otherWords = rest.length === 0 ? 0 : rest.split(WHITESPACE_PATTERN).length

  return cjkCount + otherWords
}
