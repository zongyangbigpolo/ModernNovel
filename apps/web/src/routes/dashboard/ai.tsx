import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle, Plus, Trash2 } from "lucide-react"

// Reusable success icon for toast notifications
const successIcon = <CheckCircle className="h-4 w-4" />

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { OllamaSetup } from "@/components/ollama-setup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { aiProvidersApi, type ProviderId } from "@/lib/api/ai-providers"
import { useI18n } from "@/lib/i18n"
import { buildAuthURL, generatePKCEParams } from "@/lib/pkce"

interface AIProvider {
  apiUrl?: string
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
        name: "Kimi / Moonshot AI",
        description: t("ai.settings.providers.kimiDescription"),
        apiUrl: "https://api.moonshot.cn/v1",
        defaultModel: "kimi-k3",
        models: ["kimi-k3", "kimi-k2.6", "kimi-k2.7-code-highspeed"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "deepseek",
        name: "DeepSeek",
        description: t("ai.settings.providers.deepseekDescription"),
        apiUrl: "https://api.deepseek.com",
        defaultModel: "deepseek-v4-pro",
        models: ["deepseek-v4-pro", "deepseek-v4-flash"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "qwen",
        name: "通义千问 / Qwen",
        description: t("ai.settings.providers.qwenDescription"),
        apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        defaultModel: "qwen3.8-max",
        models: ["qwen3.8-max", "qwen3.7-plus", "qwen3.7-flash"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "minimax",
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
        name: "Anthropic",
        description: t("ai.settings.providers.anthropicDescription"),
        defaultModel: "claude-sonnet-5",
        models: ["claude-sonnet-5", "claude-opus-5", "claude-fable-5", "claude-haiku-4-5"],
        enabled: true,
        supportsPKCE: false,
      },
      {
        id: "gemini",
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl sm:text-3xl">{t("ai.settings.title")}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">{t("ai.settings.description")}</p>
      </div>

      {providers && providers.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg sm:text-xl">
            {t("ai.settings.connectedProviders")}
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-32">{t("ai.settings.table.provider")}</TableHead>
                  <TableHead className="min-w-48">{t("common.description")}</TableHead>
                  <TableHead className="w-24">{t("common.status")}</TableHead>
                  <TableHead className="w-16 text-right">
                    {t("ai.settings.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const providerData = providersMap.get(provider.provider)
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {providerData?.name || provider.provider}
                          </span>
                          {providerData?.recommended && (
                            <Badge className="text-xs" variant="secondary">
                              {t("ai.settings.recommendedBadge")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          {providerData?.description || t("ai.settings.providerFallback")}
                          {typeof provider.providerConfig?.defaultModel === "string" && (
                            <div className="mt-1 font-mono text-xs">
                              {t("ai.settings.configuredModel", {
                                model: provider.providerConfig.defaultModel,
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs" variant="default">
                          {t("ai.settings.connectedBadge")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          confirmText={t("common.delete")}
                          description={t("ai.settings.deleteDialogDescription")}
                          onConfirm={() => deleteMutation.mutate(provider.id)}
                          title={t("ai.settings.deleteDialogTitle")}
                          variant="destructive"
                        >
                          <Button className="h-6 px-2 text-xs" variant="destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </ConfirmDialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {availableProviders.some((p) => p.enabled) && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg sm:text-xl">
            {t("ai.settings.availableProviders")}
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-32">{t("ai.settings.table.provider")}</TableHead>
                  <TableHead className="min-w-48">{t("common.description")}</TableHead>
                  <TableHead className="w-24">{t("common.status")}</TableHead>
                  <TableHead className="w-16 text-right">
                    {t("ai.settings.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableProviders
                  .filter((p) => p.enabled && !getConnectedProvider(p.id)) // Only show non-connected providers
                  .sort((a, b) => {
                    // Sort by recommended status first, then alphabetically
                    if (a.recommended && !b.recommended) {
                      return -1
                    }
                    if (!a.recommended && b.recommended) {
                      return 1
                    }

                    // Finally alphabetically
                    return a.name.localeCompare(b.name)
                  })
                  .map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          {provider.recommended && (
                            <Badge className="text-xs" variant="secondary">
                              {t("ai.settings.recommendedBadge")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {provider.description}
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs" variant="outline">
                          {t("ai.settings.availableBadge")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              aria-label={t("ai.settings.connectDialogTitle", {
                                provider: provider.name,
                              })}
                              className="h-6 px-2 text-xs"
                              onClick={() => setSelectedProviderId(provider.id)}
                              variant="default"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {t("ai.settings.connectDialogTitle", { provider: provider.name })}
                              </DialogTitle>
                              <DialogDescription>
                                {t("ai.settings.connectDialogDescription", {
                                  provider: provider.name,
                                })}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto pr-2">
                              {selectedProviderId === provider.id && (
                                <AddProviderForm
                                  availableProviders={[provider].filter((p) => p.enabled)}
                                  onSuccess={() => {
                                    setSelectedProviderId(null)
                                    queryClient.invalidateQueries({
                                      queryKey: ["ai-providers"],
                                    })
                                  }}
                                  preSelectedProviderId={provider.id}
                                />
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
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
