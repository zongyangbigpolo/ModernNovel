import { and, asc, eq } from "drizzle-orm"
import { type Context, Hono } from "hono"
import { db } from "../db"
import { aiProvider } from "../db/schema"
import { isSupportedProvider } from "../lib/ai-provider-types"
import { decryptApiKey, encryptApiKey, hashApiKey } from "../lib/encryption"
import { requireAuth } from "../middleware/auth"

interface Env {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
  ENCRYPTION_KEY: string
}

interface Variables {
  activeOrganization: {
    id: string
    name: string
    slug: string
  } | null
  session: {
    id: string
    userId: string
  }
  user: {
    id: string
    email: string
    name: string
  }
}

const aiProvidersRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

function parseStoredJson(value: string | null): unknown {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

// Apply the shared auth + active-organization middleware to all routes
// (see middleware/auth.ts — this used to be a duplicated, buggy local copy).
aiProvidersRouter.use("*", requireAuth)

// Helper function to prepare provider configuration
function prepareProviderConfig(
  providerConfig: Record<string, unknown> | undefined,
  apiUrl: string | undefined,
  configuration: Record<string, unknown> | undefined
): string | null {
  const combinedConfig = {
    ...(providerConfig || {}),
    ...(apiUrl == null ? {} : { apiUrl }),
    ...(configuration || {}),
  }

  return Object.keys(combinedConfig).length > 0 ? JSON.stringify(combinedConfig) : null
}

// List user's AI providers
aiProvidersRouter.get("/", async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
  const user = c.get("user")

  const providers = await db
    .select({
      id: aiProvider.id,
      provider: aiProvider.provider,
      keyLabel: aiProvider.keyLabel,
      keyHash: aiProvider.keyHash, // Safe to return, it's just for identification
      isActive: aiProvider.isActive,
      isDefault: aiProvider.isDefault,
      usageLimit: aiProvider.usageLimit,
      usageRemaining: aiProvider.usageRemaining,
      currentUsage: aiProvider.currentUsage,
      createdAt: aiProvider.createdAt,
      lastUsedAt: aiProvider.lastUsedAt,
      supportedModels: aiProvider.supportedModels,
      providerConfig: aiProvider.providerConfig,
    })
    .from(aiProvider)
    .where(eq(aiProvider.userId, user.id))
    .orderBy(aiProvider.createdAt)

  return c.json({
    providers: providers.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      lastUsedAt: p.lastUsedAt?.toISOString() || null,
      supportedModels: parseStoredJson(p.supportedModels),
      providerConfig: parseStoredJson(p.providerConfig),
    })),
  })
})

// Create new AI provider
aiProvidersRouter.post("/", async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
  const user = c.get("user")

  try {
    const body = await c.req.json()
    const {
      provider,
      apiKey,
      apiUrl,
      configuration,
      keyLabel,
      keyHash,
      providerUserId,
      isDefault = false,
      usageLimit,
      supportedModels,
      providerConfig,
    } = body

    if (!isSupportedProvider(provider)) {
      return c.json({ error: "A supported provider is required" }, 400)
    }

    // API key is optional for Ollama (local installation)
    if (provider !== "ollama" && !apiKey) {
      return c.json({ error: "API key is required for this provider" }, 400)
    }

    // Check if user already has a provider of this type (due to unique constraint)
    const existingProvider = await db
      .select({ id: aiProvider.id })
      .from(aiProvider)
      .where(and(eq(aiProvider.userId, user.id), eq(aiProvider.provider, provider)))
      .limit(1)
      .get()

    if (existingProvider) {
      return c.json(
        { error: "Provider already exists for this user. Use update endpoint instead." },
        409
      )
    }

    const existingDefault = await db
      .select({ id: aiProvider.id })
      .from(aiProvider)
      .where(and(eq(aiProvider.userId, user.id), eq(aiProvider.isDefault, true)))
      .limit(1)
      .get()
    const shouldBeDefault = isDefault || !existingDefault

    if (shouldBeDefault) {
      await db.update(aiProvider).set({ isDefault: false }).where(eq(aiProvider.userId, user.id))
    }

    const id = crypto.randomUUID()
    const now = new Date()

    // Encrypt the API key before storing (if provided)
    const encryptedApiKey = apiKey ? await encryptApiKey(apiKey, c.env) : ""
    // Generate hash for identification if not provided (skip for Ollama)
    const apiKeyHash = apiKey ? keyHash || (await hashApiKey(apiKey)) : ""

    // Prepare provider config with apiUrl and configuration
    const finalProviderConfig = prepareProviderConfig(providerConfig, apiUrl, configuration)

    await db.insert(aiProvider).values({
      id,
      userId: user.id,
      provider,
      apiKey: encryptedApiKey, // Now encrypted (empty for Ollama)
      keyLabel: keyLabel || (provider === "ollama" ? "Local Ollama" : null),
      keyHash: apiKeyHash, // Empty for Ollama
      providerUserId: providerUserId || null,
      isActive: true,
      isDefault: shouldBeDefault,
      usageLimit: usageLimit || null,
      currentUsage: 0,
      supportedModels: supportedModels ? JSON.stringify(supportedModels) : null,
      providerConfig: finalProviderConfig,
      createdAt: now,
      updatedAt: now,
    })

    return c.json({ success: true, id })
  } catch {
    return c.json({ error: "Failed to create AI provider" }, 500)
  }
})

// Update AI provider
aiProvidersRouter.put("/:id", async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
  const providerId = c.req.param("id")
  const user = c.get("user")

  if (!providerId) {
    return c.json({ error: "Provider ID is required" }, 400)
  }

  try {
    const body = await c.req.json()
    const { keyLabel, isActive, isDefault, usageLimit, supportedModels, providerConfig } = body

    const existingProvider = await db
      .select({ id: aiProvider.id })
      .from(aiProvider)
      .where(and(eq(aiProvider.id, providerId), eq(aiProvider.userId, user.id)))
      .limit(1)
      .get()

    if (!existingProvider) {
      return c.json({ error: "AI provider not found" }, 404)
    }

    if (isDefault) {
      await db.update(aiProvider).set({ isDefault: false }).where(eq(aiProvider.userId, user.id))
    }

    await db
      .update(aiProvider)
      .set({
        keyLabel: keyLabel === undefined ? undefined : keyLabel,
        isActive: isActive === undefined ? undefined : isActive,
        isDefault: isDefault === undefined ? undefined : isDefault,
        usageLimit: usageLimit === undefined ? undefined : usageLimit,
        supportedModels: supportedModels ? JSON.stringify(supportedModels) : undefined,
        providerConfig: providerConfig ? JSON.stringify(providerConfig) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(aiProvider.id, providerId), eq(aiProvider.userId, user.id)))

    return c.json({ success: true })
  } catch {
    return c.json({ error: "Failed to update AI provider" }, 500)
  }
})

// Delete AI provider
aiProvidersRouter.delete("/:id", async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
  const providerId = c.req.param("id")
  const user = c.get("user")

  if (!providerId) {
    return c.json({ error: "Provider ID is required" }, 400)
  }

  try {
    const provider = await db
      .select({ isDefault: aiProvider.isDefault })
      .from(aiProvider)
      .where(and(eq(aiProvider.id, providerId), eq(aiProvider.userId, user.id)))
      .limit(1)
      .get()

    if (!provider) {
      return c.json({ error: "AI provider not found" }, 404)
    }

    await db
      .delete(aiProvider)
      .where(and(eq(aiProvider.id, providerId), eq(aiProvider.userId, user.id)))

    if (provider.isDefault) {
      const nextProvider = await db
        .select({ id: aiProvider.id })
        .from(aiProvider)
        .where(and(eq(aiProvider.userId, user.id), eq(aiProvider.isActive, true)))
        .orderBy(asc(aiProvider.createdAt))
        .limit(1)
        .get()

      if (nextProvider) {
        await db
          .update(aiProvider)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(aiProvider.id, nextProvider.id))
      }
    }

    return c.json({ success: true })
  } catch {
    return c.json({ error: "Failed to delete AI provider" }, 500)
  }
})

// Get specific provider details (without API key)
aiProvidersRouter.get("/:id", async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
  const providerId = c.req.param("id")
  const user = c.get("user")

  if (!providerId) {
    return c.json({ error: "Provider ID is required" }, 400)
  }

  const provider = await db
    .select({
      id: aiProvider.id,
      provider: aiProvider.provider,
      providerUserId: aiProvider.providerUserId,
      keyLabel: aiProvider.keyLabel,
      keyHash: aiProvider.keyHash,
      isActive: aiProvider.isActive,
      isDefault: aiProvider.isDefault,
      usageLimit: aiProvider.usageLimit,
      usageRemaining: aiProvider.usageRemaining,
      currentUsage: aiProvider.currentUsage,
      createdAt: aiProvider.createdAt,
      updatedAt: aiProvider.updatedAt,
      lastUsedAt: aiProvider.lastUsedAt,
      supportedModels: aiProvider.supportedModels,
      providerConfig: aiProvider.providerConfig,
    })
    .from(aiProvider)
    .where(and(eq(aiProvider.id, providerId), eq(aiProvider.userId, user.id)))
    .limit(1)
    .get()

  if (!provider) {
    return c.json({ error: "Provider not found" }, 404)
  }

  return c.json({
    provider: {
      ...provider,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
      lastUsedAt: provider.lastUsedAt?.toISOString() || null,
      supportedModels: parseStoredJson(provider.supportedModels),
      providerConfig: parseStoredJson(provider.providerConfig),
    },
  })
})

// Exchange OpenRouter OAuth code for API key
aiProvidersRouter.post(
  "/openrouter/exchange",
  async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
    const user = c.get("user")

    try {
      const body = await c.req.json()
      const { code, codeVerifier, codeChallengeMethod } = body

      if (!code) {
        return c.json({ error: "Authorization code is required" }, 400)
      }

      // Exchange code for API key with OpenRouter
      const exchangeResponse = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          code_challenge_method: codeChallengeMethod,
        }),
      })

      if (!exchangeResponse.ok) {
        const _errorText = await exchangeResponse.text()
        return c.json({ error: "Failed to exchange code with OpenRouter" }, 400)
      }

      const { key, user_id } = (await exchangeResponse.json()) as { key: string; user_id: string }

      if (!key) {
        return c.json({ error: "No API key received from OpenRouter" }, 400)
      }

      // Check if user already has an OpenRouter provider
      const existingProvider = await db
        .select({ id: aiProvider.id })
        .from(aiProvider)
        .where(and(eq(aiProvider.userId, user.id), eq(aiProvider.provider, "openrouter")))
        .limit(1)
        .get()

      const now = new Date()

      if (existingProvider) {
        // Update existing provider
        const encryptedApiKey = await encryptApiKey(key, c.env)
        const keyHash = await hashApiKey(key)

        await db
          .update(aiProvider)
          .set({
            apiKey: encryptedApiKey, // Now encrypted
            keyHash,
            providerUserId: user_id,
            isActive: true,
            updatedAt: now,
          })
          .where(eq(aiProvider.id, existingProvider.id))

        return c.json({ success: true, id: existingProvider.id })
      }
      // Create new provider
      const id = crypto.randomUUID()
      const encryptedApiKey = await encryptApiKey(key, c.env)
      const keyHash = await hashApiKey(key)

      await db.insert(aiProvider).values({
        id,
        userId: user.id,
        provider: "openrouter",
        apiKey: encryptedApiKey, // Now encrypted
        keyHash,
        providerUserId: user_id,
        keyLabel: "OpenRouter",
        isActive: true,
        isDefault: false,
        currentUsage: 0,
        createdAt: now,
        updatedAt: now,
      })

      return c.json({ success: true, id })
    } catch {
      return c.json({ error: "Failed to exchange code" }, 500)
    }
  }
)

// Helper function to get decrypted API key for a provider (for internal use)
export async function getDecryptedApiKey(
  userId: string,
  provider: "openrouter" | "openai" | "anthropic" | "ollama" | "groq" | "gemini" | "cohere",
  env: Env
): Promise<string | null> {
  const providerRecord = await db
    .select({ apiKey: aiProvider.apiKey })
    .from(aiProvider)
    .where(
      and(
        eq(aiProvider.userId, userId),
        eq(aiProvider.provider, provider),
        eq(aiProvider.isActive, true)
      )
    )
    .limit(1)
    .get()

  if (!providerRecord) {
    return null
  }

  try {
    return await decryptApiKey(providerRecord.apiKey, env)
  } catch {
    // Failed to decrypt - key may be corrupted or encryption key changed
    return null
  }
}

export { aiProvidersRouter }
