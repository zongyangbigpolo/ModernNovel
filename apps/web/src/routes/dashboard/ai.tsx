import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle, Cpu, Plus, Settings2, Sparkles, Trash2 } from "lucide-react"

// Reusable success icon for toast notifications
const successIcon = <CheckCircle className="h-4 w-4" />

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { OllamaSetup } from "@/components/ollama-setup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  aiProvidersApi,
  type AiProvider as ConnectedAIProvider,
  type ProviderId,
} from "@/lib/api/ai-providers"
import { useI18n } from "@/lib/i18n"
import { buildAuthURL, generatePKCEParams } from "@/lib/pkce"

interface AIProvider {
  apiUrl?: string
  category: "china" | "global" | "local"
  defaultModel: string
  description: string
  enabled: boolean
  id: ProviderId
  models: string[]
  name: string
  recommended?: boolean
  supportsPKCE?: boolean
}

interface ProviderFormProps {
  apiKey: string
  apiUrl: string
  availableProviders: AIProvider[]
  defaultModel: string
  handleOAuthLogin: () => void
  handleOllamaConnect?: (config: {
    apiUrl: string
    connectionMethod: string
    defaultModel: string
  }) => void
  handleSubmit: (e: React.FormEvent) => void
  loading: boolean
  oauthLoading: boolean
  preSelectedProviderId?: string | null
  selectedProvider: string
  selectedProviderData: AIProvider | undefined
  selectedProviderSupportsPKCE: boolean
  setApiKey: (key: string) => void
  setApiUrl: (url: string) => void
  setDefaultModel: (model: string) => void
  setSelectedProvider: (provider: string) => void
  setShowManualApiKey: (show: boolean) => void
  showManualApiKey: boolean
}

function AIProvidersPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [_oauthProcessing, setOauthProcessing] = useState(false)
  const queryClient = useQueryClient()
  const { t } = useI18n()

  // Prevent double OAuth execution in React StrictMode
  const oauthHandled = useRef(false)

  const { data: providers, error } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => aiProvidersApi.list(),
  })

  if (error) {
    toast.error(t("ai.settings.toasts.loadProvidersError", { message: error.message }))
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiProvidersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] })
      toast.success(t("ai.settings.toasts.providerDisconnected"))
    },
    onError: (deleteError: Error) => {
      toast.error(t("ai.settings.toasts.disconnectProviderError", { message: deleteError.message }))
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => aiProvidersApi.update(id, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] })
      toast.success(t("ai.settings.toasts.defaultProviderUpdated"))
    },
    onError: (updateError: Error) => {
      toast.error(
        t("ai.settings.toasts.defaultProviderUpdateFailed", { message: updateError.message })
      )
    },
  })

  const oauthMutation = useMutation({
    mutationFn: (params: {
      code: string
      codeVerifier: string
      codeChallengeMethod: "S256" | "plain"
      provider: ProviderId
    }) => aiProvidersApi.exchangeOAuth(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] })
      toast.success(t("ai.settings.toasts.providerConnectedOAuth"), {
        icon: successIcon,
      })
      setOauthProcessing(false)
    },
    onError: (oauthError: Error) => {
      toast.error(t("ai.settings.toasts.oauthConnectionFailed", { message: oauthError.message }))
      setOauthProcessing(false)
    },
  })

  const handleOAuthCallback = useCallback(
    (code: string) => {
      try {
        setOauthProcessing(true)

        // Find PKCE params for any provider
        let storedParams: string | null = null
        let pkceKey: string | null = null

        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key?.endsWith("-pkce")) {
            storedParams = sessionStorage.getItem(key)
            pkceKey = key
            break
          }
        }

        if (!(storedParams && pkceKey)) {
          toast.error(t("ai.settings.toasts.noPkceParameters"))
          setOauthProcessing(false)
          return
        }

        const {
          codeVerifier,
          codeChallengeMethod,
          providerId,
        }: {
          codeVerifier: string
          codeChallengeMethod: "S256" | "plain"
          providerId: ProviderId
        } = JSON.parse(storedParams)
        sessionStorage.removeItem(pkceKey)

        oauthMutation.mutate({
          code,
          codeVerifier,
          codeChallengeMethod,
          provider: providerId,
        })
      } catch (callbackError) {
        toast.error(
          t("ai.settings.toasts.oauthCallbackFailed", {
            message:
              callbackError instanceof Error
                ? callbackError.message
                : t("ai.settings.unknownError"),
          })
        )
        setOauthProcessing(false)
      }
    },
    [oauthMutation, t]
  )

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")

    if (code && !oauthHandled.current) {
      oauthHandled.current = true
      // OAuth flow - handleOAuthCallback will invalidate and refetch providers
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
      handleOAuthCallback(code)
    }
    // No else block needed - TanStack Query handles normal loading
  }, [handleOAuthCallback])

  const availableProviders = useMemo<AIProvider[]>(
    () => [
      {
        id: "openrouter",
        category: "global",
        name: "OpenRouter",
        description: t("ai.settings.providers.openrouterDescription"),
        defaultModel: "openrouter/auto",
        models: ["openrouter/auto", "~openai/gpt-latest", "anthropic/claude-sonnet-5"],
        recommended: true,
        enabled: true,
        supportsPKCE: true,
      },
      {
        id: "kimi",
        category: "china",
        name: "Kimi / Moonshot AI",
        description: t("ai.settings.providers.kimiDescription"),
        apiUrl: "https://api.moonshot.cn/v1",
        defaultModel: "kimi-k3",
        models: ["kimi-k3", "kimi-k2.6", "kimi-k2.7-code-highspeed"],
        recommended: true,
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "deepseek",
        category: "china",
        name: "DeepSeek",
        description: t("ai.settings.providers.deepseekDescription"),
        apiUrl: "https://api.deepseek.com",
        defaultModel: "deepseek-v4-pro",
        models: ["deepseek-v4-pro", "deepseek-v4-flash"],
        recommended: true,
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "qwen",
        category: "china",
        name: "通义千问 / Qwen",
        description: t("ai.settings.providers.qwenDescription"),
        apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        defaultModel: "qwen3.8-max",
        models: ["qwen3.8-max", "qwen3.7-plus", "qwen3.7-flash"],
        recommended: true,
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "minimax",
        category: "china",
        name: "MiniMax",
        description: t("ai.settings.providers.minimaxDescription"),
        apiUrl: "https://api.minimaxi.com/v1",
        defaultModel: "MiniMax-M3",
        models: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "openai",
        category: "global",
        name: "OpenAI",
        description: t("ai.settings.providers.openaiDescription"),
        apiUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-5.6",
        models: ["gpt-5.6", "gpt-5.6-terra", "gpt-5.6-luna"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "anthropic",
        category: "global",
        name: "Anthropic",
        description: t("ai.settings.providers.anthropicDescription"),
        defaultModel: "claude-sonnet-5",
        models: ["claude-sonnet-5", "claude-opus-5", "claude-fable-5", "claude-haiku-4-5"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "gemini",
        category: "global",
        name: "Google Gemini",
        description: t("ai.settings.providers.geminiDescription"),
        apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        defaultModel: "gemini-3.6-flash",
        models: [
          "gemini-3.6-flash",
          "gemini-3.1-pro-preview",
          "gemini-3-flash-preview",
          "gemini-2.5-pro",
        ],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "ollama",
        category: "local",
        name: "Ollama",
        description: t("ai.settings.providers.ollamaDescription"),
        apiUrl: "http://localhost:11434",
        defaultModel: "qwen3",
        models: ["qwen3", "deepseek-r1", "llama3.2"],
        enabled: true,
        supportsPKCE: false,
      },
    ],
    [t]
  )

  // Performance optimization: Create Map for O(1) provider lookups
  const providersMap = useMemo(
    () => new Map(availableProviders.map((provider) => [provider.id, provider])),
    [availableProviders]
  )

  const getConnectedProvider = useCallback(
    (providerId: string) => providers?.find((p) => p.provider === providerId),
    [providers]
  )

  const connectedProviders = providers ?? []
  const defaultProvider =
    connectedProviders.find((provider) => provider.isDefault) ?? connectedProviders.at(0)
  const defaultProviderData = defaultProvider
    ? providersMap.get(defaultProvider.provider)
    : undefined
  const unconnectedProviders = availableProviders.filter(
    (provider) => provider.enabled && !getConnectedProvider(provider.id)
  )
  const editingProvider = connectedProviders.find((provider) => provider.id === editingProviderId)

  return (
    <div className="container mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl sm:text-3xl">{t("ai.settings.title")}</h1>
          <p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
            {t("ai.settings.description")}
          </p>
        </div>
        <Dialog
          onOpenChange={(open) => {
            setAddProviderOpen(open)
            if (!open) {
              setSelectedProviderId(null)
            }
          }}
          open={addProviderOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("ai.settings.addProvider")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProviderId
                  ? t("ai.settings.connectDialogTitle", {
                      provider: providersMap.get(selectedProviderId as ProviderId)?.name ?? "",
                    })
                  : t("ai.settings.addProvider")}
              </DialogTitle>
              <DialogDescription>
                {selectedProviderId
                  ? t("ai.settings.connectDialogDescription", {
                      provider: providersMap.get(selectedProviderId as ProviderId)?.name ?? "",
                    })
                  : t("ai.settings.addProviderDescription")}
              </DialogDescription>
            </DialogHeader>
            {selectedProviderId ? (
              <div className="space-y-4">
                <Button
                  className="px-0"
                  onClick={() => setSelectedProviderId(null)}
                  size="sm"
                  variant="ghost"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("common.back")}
                </Button>
                <AddProviderForm
                  availableProviders={availableProviders.filter(
                    (provider) => provider.id === selectedProviderId
                  )}
                  onSuccess={() => {
                    setSelectedProviderId(null)
                    setAddProviderOpen(false)
                    queryClient.invalidateQueries({ queryKey: ["ai-providers"] })
                  }}
                  preSelectedProviderId={selectedProviderId}
                />
              </div>
            ) : (
              <ProviderCatalog onSelect={setSelectedProviderId} providers={unconnectedProviders} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {providers === undefined && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {providers !== undefined && defaultProvider && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium text-sm">{t("ai.settings.currentDefault")}</span>
                </div>
                <CardTitle>{defaultProviderData?.name ?? defaultProvider.provider}</CardTitle>
                <CardDescription className="font-mono">
                  {getConfiguredModel(defaultProvider, defaultProviderData)}
                </CardDescription>
              </div>
              <Badge>{t("ai.settings.activeBadge")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setEditingProviderId(defaultProvider.id)} variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              {t("ai.settings.editModel")}
            </Button>
          </CardContent>
        </Card>
      )}

      {providers !== undefined && !defaultProvider && (
        <Card className="border-dashed">
          <CardHeader className="items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle>{t("ai.settings.emptyTitle")}</CardTitle>
            <CardDescription className="max-w-lg">
              {t("ai.settings.emptyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setAddProviderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("ai.settings.addProvider")}
            </Button>
          </CardContent>
        </Card>
      )}

      {connectedProviders.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg sm:text-xl">
              {t("ai.settings.connectedProviders")}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {t("ai.settings.connectedProvidersDescription")}
            </p>
          </div>
          <div className="grid gap-3">
            {connectedProviders.map((provider) => {
              const providerData = providersMap.get(provider.provider)
              const isDefault = provider.id === defaultProvider?.id
              return (
                <Card key={provider.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {providerData?.name ?? provider.provider}
                        </span>
                        <Badge variant={isDefault ? "default" : "outline"}>
                          {isDefault
                            ? t("ai.settings.defaultBadge")
                            : t("ai.settings.connectedBadge")}
                        </Badge>
                      </div>
                      <p className="truncate font-mono text-muted-foreground text-sm">
                        {getConfiguredModel(provider, providerData)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isDefault && (
                        <Button
                          disabled={setDefaultMutation.isPending}
                          onClick={() => setDefaultMutation.mutate(provider.id)}
                          size="sm"
                          variant="outline"
                        >
                          {t("ai.settings.setDefault")}
                        </Button>
                      )}
                      <Button
                        onClick={() => setEditingProviderId(provider.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                      <ConfirmDialog
                        confirmText={t("common.delete")}
                        description={t("ai.settings.deleteDialogDescription")}
                        onConfirm={() => deleteMutation.mutate(provider.id)}
                        title={t("ai.settings.deleteDialogTitle")}
                        variant="destructive"
                      >
                        <Button aria-label={t("common.delete")} size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {editingProvider && (
        <EditProviderModelDialog
          definition={providersMap.get(editingProvider.provider)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProviderId(null)
            }
          }}
          onSuccess={() => {
            setEditingProviderId(null)
            queryClient.invalidateQueries({ queryKey: ["ai-providers"] })
          }}
          open={editingProviderId !== null}
          provider={editingProvider}
        />
      )}
    </div>
  )
}

function getConfiguredModel(
  provider: ConnectedAIProvider,
  definition: AIProvider | undefined
): string {
  const configuredModel = provider.providerConfig?.defaultModel
  return typeof configuredModel === "string" && configuredModel
    ? configuredModel
    : (definition?.defaultModel ?? provider.provider)
}

function ProviderCatalog({
  providers,
  onSelect,
}: {
  providers: AIProvider[]
  onSelect: (providerId: string) => void
}) {
  const { t } = useI18n()
  const [category, setCategory] = useState<"recommended" | AIProvider["category"]>("recommended")
  const categories = [
    { id: "recommended" as const, label: t("ai.settings.categories.recommended") },
    { id: "china" as const, label: t("ai.settings.categories.china") },
    { id: "global" as const, label: t("ai.settings.categories.global") },
    { id: "local" as const, label: t("ai.settings.categories.local") },
  ]
  const filteredProviders = providers.filter((provider) =>
    category === "recommended" ? provider.recommended : provider.category === category
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Button
            key={item.id}
            onClick={() => setCategory(item.id)}
            size="sm"
            variant={category === item.id ? "default" : "outline"}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {category === "local" && (
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>{t("ai.settings.ollamaCloudflareNotice")}</p>
        </div>
      )}

      {filteredProviders.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredProviders.map((provider) => (
            <button
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
              key={provider.id}
              onClick={() => onSelect(provider.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{provider.name}</span>
                    {provider.recommended && (
                      <Badge variant="secondary">{t("ai.settings.recommendedBadge")}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-muted-foreground text-sm">{provider.description}</p>
                </div>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          {t("ai.settings.categoryEmpty")}
        </div>
      )}
    </div>
  )
}

function EditProviderModelDialog({
  provider,
  definition,
  open,
  onOpenChange,
  onSuccess,
}: {
  provider: ConnectedAIProvider
  definition: AIProvider | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const { t } = useI18n()
  const [model, setModel] = useState(() => getConfiguredModel(provider, definition))
  const mutation = useMutation({
    mutationFn: () =>
      aiProvidersApi.update(provider.id, {
        providerConfig: {
          ...provider.providerConfig,
          defaultModel: model.trim(),
        },
      }),
    onSuccess: () => {
      toast.success(t("ai.settings.toasts.modelUpdated"))
      onSuccess()
    },
    onError: (updateError: Error) => {
      toast.error(t("ai.settings.toasts.modelUpdateFailed", { message: updateError.message }))
    },
  })

  useEffect(() => {
    setModel(getConfiguredModel(provider, definition))
  }, [provider, definition])

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("ai.settings.editModelTitle", {
              provider: definition?.name ?? provider.provider,
            })}
          </DialogTitle>
          <DialogDescription>{t("ai.settings.editModelDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (model.trim()) {
              mutation.mutate()
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-default-model">{t("ai.settings.defaultModelLabel")}</Label>
            <Input
              id="edit-default-model"
              list="edit-provider-models"
              onChange={(event) => setModel(event.target.value)}
              value={model}
            />
            <datalist id="edit-provider-models">
              {definition?.models.map((availableModel) => (
                <option key={availableModel} value={availableModel} />
              ))}
            </datalist>
            {definition && (
              <p className="text-muted-foreground text-xs">
                {t("ai.settings.defaultModelHint", { models: definition.models.join(", ") })}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              {t("common.cancel")}
            </Button>
            <Button disabled={!model.trim() || mutation.isPending} type="submit">
              {mutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function useOAuthLogin(options: {
  providerId: string
  setOauthLoading: (loading: boolean) => void
}) {
  const { t } = useI18n()
  const { providerId, setOauthLoading } = options

  return async () => {
    try {
      setOauthLoading(true)

      const pkceParams = await generatePKCEParams()

      sessionStorage.setItem(
        `${providerId}-pkce`,
        JSON.stringify({
          codeVerifier: pkceParams.codeVerifier,
          codeChallengeMethod: pkceParams.codeChallengeMethod,
          providerId,
        })
      )

      const callbackUrl = `${window.location.origin}/dashboard/ai`
      const authUrl = buildAuthURL({
        callbackUrl,
        codeChallenge: pkceParams.codeChallenge,
        codeChallengeMethod: pkceParams.codeChallengeMethod,
      })

      window.location.href = authUrl
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("ai.settings.toasts.oauthInitiateFailed")
      toast.error(errorMessage)
      setOauthLoading(false)
    }
  }
}

function useProviderSubmit(options: {
  selectedProvider: string
  selectedProviderSupportsPKCE: boolean
  showManualApiKey: boolean
  apiKey: string
  apiUrl: string
  defaultModel: string
  onSuccess: () => void
  setLoading: (loading: boolean) => void
  setSelectedProvider: (provider: string) => void
  setApiKey: (key: string) => void
  setApiUrl: (url: string) => void
  setDefaultModel: (model: string) => void
  availableProviders: AIProvider[]
}) {
  const { t } = useI18n()
  const {
    selectedProvider,
    selectedProviderSupportsPKCE,
    showManualApiKey,
    apiKey,
    apiUrl,
    defaultModel,
    onSuccess,
    setLoading,
    setSelectedProvider,
    setApiKey,
    setApiUrl,
    setDefaultModel,
    availableProviders,
  } = options
  return async (e: React.FormEvent) => {
    e.preventDefault()

    const requiresApiKey = !selectedProviderSupportsPKCE || showManualApiKey
    if (!selectedProvider || (requiresApiKey && !apiKey && selectedProvider !== "ollama")) {
      return
    }

    try {
      setLoading(true)
      const providerData = availableProviders.find((p) => p.id === selectedProvider)
      await aiProvidersApi.create({
        provider: selectedProvider as ProviderId,
        apiKey,
        providerConfig: {
          apiUrl: apiUrl || undefined,
          defaultModel,
        },
        supportedModels: providerData?.models,
      })
      const providerName = providerData?.name || t("ai.settings.providerFallback")
      toast.success(t("ai.settings.toasts.providerConnected", { provider: providerName }), {
        icon: successIcon,
      })
      onSuccess()
      setSelectedProvider("")
      setApiKey("")
      setApiUrl("")
      setDefaultModel("")
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("ai.settings.toasts.connectProviderFailed")
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }
}

function AddProviderForm({
  availableProviders,
  preSelectedProviderId,
  onSuccess,
}: {
  availableProviders: AIProvider[]
  preSelectedProviderId?: string | null
  onSuccess: () => void
}) {
  const { t } = useI18n()
  const [selectedProvider, setSelectedProvider] = useState(preSelectedProviderId || "")
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [loading, setLoading] = useState(false)
  const [showManualApiKey, setShowManualApiKey] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  useEffect(() => {
    setSelectedProvider(preSelectedProviderId || "")
  }, [preSelectedProviderId])

  // Performance optimization: Create Map for O(1) provider lookups
  const providersMap = useMemo(
    () => new Map(availableProviders.map((provider) => [provider.id, provider])),
    [availableProviders]
  )

  const selectedProviderData = providersMap.get(selectedProvider as ProviderId)
  const selectedProviderSupportsPKCE = selectedProviderData?.supportsPKCE ?? false

  useEffect(() => {
    setApiUrl(selectedProviderData?.apiUrl ?? "")
    setDefaultModel(selectedProviderData?.defaultModel ?? "")
  }, [selectedProviderData])

  const handleOllamaConnect = async (config: {
    apiUrl: string
    connectionMethod: string
    defaultModel: string
  }) => {
    try {
      setLoading(true)
      await aiProvidersApi.create({
        provider: "ollama",
        apiKey: "", // Ollama doesn't require API key
        apiUrl: config.apiUrl,
        configuration: {
          connectionMethod: config.connectionMethod,
          defaultModel: config.defaultModel,
        },
        supportedModels: selectedProviderData?.models,
      })
      toast.success(t("ai.settings.toasts.ollamaConnected"), {
        icon: successIcon,
      })
      onSuccess()
      setSelectedProvider("")
      setApiKey("")
    } catch (error) {
      toast.error(
        t("ai.settings.toasts.ollamaConnectFailed", {
          message: error instanceof Error ? error.message : t("ai.settings.unknownError"),
        })
      )
    } finally {
      setLoading(false)
    }
  }
  const handleOAuthLogin = useOAuthLogin({
    providerId: selectedProvider,
    setOauthLoading,
  })
  const handleSubmit = useProviderSubmit({
    selectedProvider,
    selectedProviderSupportsPKCE,
    showManualApiKey,
    apiKey,
    apiUrl,
    defaultModel,
    onSuccess,
    setLoading,
    setSelectedProvider,
    setApiKey,
    setApiUrl,
    setDefaultModel,
    availableProviders,
  })

  return (
    <ProviderForm
      apiKey={apiKey}
      apiUrl={apiUrl}
      availableProviders={availableProviders}
      defaultModel={defaultModel}
      handleOAuthLogin={handleOAuthLogin}
      handleOllamaConnect={handleOllamaConnect}
      handleSubmit={handleSubmit}
      loading={loading}
      oauthLoading={oauthLoading}
      preSelectedProviderId={preSelectedProviderId}
      selectedProvider={selectedProvider}
      selectedProviderData={selectedProviderData}
      selectedProviderSupportsPKCE={selectedProviderSupportsPKCE}
      setApiKey={setApiKey}
      setApiUrl={setApiUrl}
      setDefaultModel={setDefaultModel}
      setSelectedProvider={setSelectedProvider}
      setShowManualApiKey={setShowManualApiKey}
      showManualApiKey={showManualApiKey}
    />
  )
}

function ProviderSelector({
  selectedProvider,
  setSelectedProvider,
  availableProviders,
  selectedProviderData,
}: {
  selectedProvider: string
  setSelectedProvider: (provider: string) => void
  availableProviders: AIProvider[]
  selectedProviderData: AIProvider | undefined
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <Label htmlFor="provider">{t("ai.settings.selectProviderLabel")}</Label>
      <Select onValueChange={setSelectedProvider} value={selectedProvider}>
        <SelectTrigger>
          <SelectValue placeholder={t("ai.settings.selectProviderPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {availableProviders.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex items-center gap-2">
                {provider.name}
                {provider.recommended && (
                  <Badge className="text-xs" variant="secondary">
                    {t("ai.settings.recommendedBadge")}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedProviderData && (
        <p className="mt-1 text-muted-foreground text-sm">{selectedProviderData.description}</p>
      )}
    </div>
  )
}

function ProviderInfo({ selectedProviderData }: { selectedProviderData: AIProvider }) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <Label>{t("ai.settings.connectingToProviderLabel")}</Label>
      <div className="flex items-center gap-3 rounded-md border p-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedProviderData.name}</span>
            {selectedProviderData.recommended && (
              <Badge variant="secondary">{t("ai.settings.recommendedBadge")}</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{selectedProviderData.description}</p>
        </div>
      </div>
    </div>
  )
}

function OAuthSection({
  oauthLoading,
  showManualApiKey,
  setShowManualApiKey,
  handleOAuthLogin,
}: {
  oauthLoading: boolean
  showManualApiKey: boolean
  setShowManualApiKey: (show: boolean) => void
  handleOAuthLogin: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <Separator />
      {!showManualApiKey && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={oauthLoading}
            onClick={handleOAuthLogin}
            type="button"
            variant="default"
          >
            {oauthLoading ? t("ai.settings.connecting") : t("ai.settings.oauthLoginRecommended")}
          </Button>
          <Button
            className="flex-1"
            onClick={() => setShowManualApiKey(true)}
            type="button"
            variant="outline"
          >
            {t("ai.settings.manualApiKey")}
          </Button>
        </div>
      )}
    </div>
  )
}

function ApiKeySection({
  apiKey,
  setApiKey,
  selectedProviderSupportsPKCE,
  showManualApiKey,
  setShowManualApiKey,
}: {
  apiKey: string
  setApiKey: (key: string) => void
  selectedProviderSupportsPKCE: boolean
  showManualApiKey: boolean
  setShowManualApiKey: (show: boolean) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="apiKey">{t("ai.settings.apiKeyLabel")}</Label>
        {selectedProviderSupportsPKCE && showManualApiKey && (
          <Button
            onClick={() => setShowManualApiKey(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("ai.settings.backToOAuth")}
          </Button>
        )}
      </div>
      <Input
        id="apiKey"
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={t("ai.settings.apiKeyPlaceholder")}
        required
        type="password"
        value={apiKey}
      />
      <p className="mt-1 text-muted-foreground text-sm">{t("ai.settings.apiKeyHint")}</p>
    </div>
  )
}

function ProviderModelConfiguration({
  apiUrl,
  defaultModel,
  provider,
  setApiUrl,
  setDefaultModel,
}: {
  apiUrl: string
  defaultModel: string
  provider: AIProvider
  setApiUrl: (url: string) => void
  setDefaultModel: (model: string) => void
}) {
  const { t } = useI18n()
  const modelListId = `${provider.id}-models`

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label htmlFor="defaultModel">{t("ai.settings.defaultModelLabel")}</Label>
        <Input
          id="defaultModel"
          list={modelListId}
          onChange={(event) => setDefaultModel(event.target.value)}
          placeholder={provider.defaultModel}
          value={defaultModel}
        />
        <datalist id={modelListId}>
          {provider.models.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p className="text-muted-foreground text-sm">
          {t("ai.settings.defaultModelHint", { models: provider.models.join(", ") })}
        </p>
      </div>

      {provider.apiUrl && (
        <div className="space-y-2">
          <Label htmlFor="apiUrl">{t("ai.settings.apiUrlLabel")}</Label>
          <Input
            id="apiUrl"
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder={provider.apiUrl}
            type="url"
            value={apiUrl}
          />
          <p className="text-muted-foreground text-sm">{t("ai.settings.apiUrlHint")}</p>
        </div>
      )}
    </div>
  )
}

function ProviderForm({
  selectedProvider,
  setSelectedProvider,
  apiKey,
  apiUrl,
  defaultModel,
  setApiKey,
  setApiUrl,
  setDefaultModel,
  loading,
  oauthLoading,
  showManualApiKey,
  setShowManualApiKey,
  availableProviders,
  preSelectedProviderId,
  selectedProviderData,
  selectedProviderSupportsPKCE,
  handleSubmit,
  handleOAuthLogin,
  handleOllamaConnect,
}: ProviderFormProps) {
  const { t } = useI18n()
  // Extract button state logic for better readability
  const hasSelectedProvider = !!selectedProvider
  const canUseOAuth = selectedProviderSupportsPKCE && !showManualApiKey
  const hasApiKeyForNonPKCE =
    !selectedProviderSupportsPKCE && apiKey && selectedProvider !== "ollama"
  const hasApiKeyForManualMode = selectedProviderSupportsPKCE && showManualApiKey && apiKey
  const isOllama = selectedProvider === "ollama"

  const isFormValid =
    hasSelectedProvider &&
    (canUseOAuth || hasApiKeyForNonPKCE || hasApiKeyForManualMode || isOllama)
  const isSubmitDisabled = !isFormValid || loading || oauthLoading
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {!preSelectedProviderId && (
        <ProviderSelector
          availableProviders={availableProviders}
          selectedProvider={selectedProvider}
          selectedProviderData={selectedProviderData}
          setSelectedProvider={setSelectedProvider}
        />
      )}

      {preSelectedProviderId && selectedProviderData && (
        <ProviderInfo selectedProviderData={selectedProviderData} />
      )}

      {selectedProviderData && selectedProvider !== "ollama" && (
        <ProviderModelConfiguration
          apiUrl={apiUrl}
          defaultModel={defaultModel}
          provider={selectedProviderData}
          setApiUrl={setApiUrl}
          setDefaultModel={setDefaultModel}
        />
      )}

      {selectedProvider === "ollama" && handleOllamaConnect && (
        <div className="space-y-3">
          <Separator />
          <OllamaSetup loading={loading} onConnect={handleOllamaConnect} />
        </div>
      )}

      {selectedProviderSupportsPKCE && (
        <OAuthSection
          handleOAuthLogin={handleOAuthLogin}
          oauthLoading={oauthLoading}
          setShowManualApiKey={setShowManualApiKey}
          showManualApiKey={showManualApiKey}
        />
      )}

      {selectedProvider &&
        selectedProvider !== "ollama" &&
        (!selectedProviderSupportsPKCE || showManualApiKey) && (
          <ApiKeySection
            apiKey={apiKey}
            selectedProviderSupportsPKCE={selectedProviderSupportsPKCE}
            setApiKey={setApiKey}
            setShowManualApiKey={setShowManualApiKey}
            showManualApiKey={showManualApiKey}
          />
        )}

      {selectedProvider !== "ollama" && (
        <div className="flex gap-2 pt-4">
          <Button disabled={isSubmitDisabled} type="submit">
            {loading ? t("ai.settings.connecting") : t("ai.settings.connectProviderButton")}
          </Button>
        </div>
      )}
    </form>
  )
}

export const Route = createFileRoute("/dashboard/ai")({
  component: AIProvidersPage,
})
