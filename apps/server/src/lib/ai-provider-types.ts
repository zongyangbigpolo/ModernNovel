export const SUPPORTED_PROVIDER_IDS = [
  "openrouter",
  "openai",
  "anthropic",
  "ollama",
  "groq",
  "gemini",
  "cohere",
  "kimi",
  "deepseek",
  "qwen",
  "minimax",
] as const

export type SupportedProvider = (typeof SUPPORTED_PROVIDER_IDS)[number]

const SUPPORTED_PROVIDERS = new Set<string>(SUPPORTED_PROVIDER_IDS)

export function isSupportedProvider(provider: unknown): provider is SupportedProvider {
  return typeof provider === "string" && SUPPORTED_PROVIDERS.has(provider)
}
