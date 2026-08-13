import { AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useI18n } from "@/lib/i18n"

type ConnectionMethod = "ngrok" | "cloudflare" | "manual"

interface SetupStep {
  content: string
  copyable?: boolean
  title: string
}

interface OllamaSetupProps {
  loading?: boolean
  onConnect: (config: {
    apiUrl: string
    connectionMethod: ConnectionMethod
    defaultModel: string
  }) => void
}

export function OllamaSetup({ onConnect, loading }: OllamaSetupProps) {
  const { t } = useI18n()
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("ngrok")
  const [apiUrl, setApiUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("qwen3")
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t("ai.ollama.copySuccess"))
    } catch {
      toast.error(t("ai.ollama.copyError"))
    }
  }

  const testConnection = async () => {
    if (!apiUrl) {
      return
    }

    setTestingConnection(true)
    setConnectionStatus("idle")

    try {
      const testUrl = new URL("/api/tags", apiUrl).toString()

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        setConnectionStatus("success")
        toast.success(t("ai.ollama.connectionSuccessToast"))
      } else {
        setConnectionStatus("error")
        toast.error(
          t("ai.ollama.connectionFailedToast", {
            message: `${response.status} ${response.statusText}`,
          })
        )
      }
    } catch (error) {
      setConnectionStatus("error")
      toast.error(
        t("ai.ollama.connectionFailedToast", {
          message: error instanceof Error ? error.message : t("ai.settings.unknownError"),
        })
      )
    } finally {
      setTestingConnection(false)
    }
  }

  const handleConnect = () => {
    if (!apiUrl) {
      return
    }
    onConnect({ apiUrl, connectionMethod, defaultModel })
  }

  const setupGuides: Record<
    ConnectionMethod,
    { title: string; description: string; steps: SetupStep[] }
  > = {
    ngrok: {
      title: t("ai.ollama.guides.ngrok.title"),
      description: t("ai.ollama.guides.ngrok.description"),
      steps: [
        {
          title: t("ai.ollama.guides.ngrok.steps.install.title"),
          content: t("ai.ollama.guides.ngrok.steps.install.content"),
        },
        {
          title: t("ai.ollama.guides.ngrok.steps.start.title"),
          content: t("ai.ollama.guides.ngrok.steps.start.content"),
        },
        {
          title: t("ai.ollama.guides.ngrok.steps.tunnel.title"),
          content: 'ngrok http 11434 --host-header="localhost:11434"',
          copyable: true,
        },
        {
          title: t("ai.ollama.guides.ngrok.steps.copy.title"),
          content: t("ai.ollama.guides.ngrok.steps.copy.content"),
        },
      ],
    },
    cloudflare: {
      title: t("ai.ollama.guides.cloudflare.title"),
      description: t("ai.ollama.guides.cloudflare.description"),
      steps: [
        {
          title: t("ai.ollama.guides.cloudflare.steps.install.title"),
          content: t("ai.ollama.guides.cloudflare.steps.install.content"),
        },
        {
          title: t("ai.ollama.guides.cloudflare.steps.start.title"),
          content: t("ai.ollama.guides.cloudflare.steps.start.content"),
        },
        {
          title: t("ai.ollama.guides.cloudflare.steps.tunnel.title"),
          content:
            'cloudflared tunnel --url http://localhost:11434 --http-host-header="localhost:11434"',
          copyable: true,
        },
        {
          title: t("ai.ollama.guides.cloudflare.steps.copy.title"),
          content: t("ai.ollama.guides.cloudflare.steps.copy.content"),
        },
      ],
    },
    manual: {
      title: t("ai.ollama.guides.manual.title"),
      description: t("ai.ollama.guides.manual.description"),
      steps: [
        {
          title: t("ai.ollama.guides.manual.steps.custom.title"),
          content: t("ai.ollama.guides.manual.steps.custom.content"),
        },
      ],
    },
  }

  const currentGuide = setupGuides[connectionMethod]

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-medium text-base">{t("ai.ollama.connectionMethodLabel")}</Label>
          <p className="text-muted-foreground text-sm">
            {t("ai.ollama.connectionMethodDescription")}
          </p>
          <Select
            onValueChange={(value) => setConnectionMethod(value as ConnectionMethod)}
            value={connectionMethod}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("ai.ollama.connectionMethodPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ngrok">
                <div className="flex items-center gap-2">
                  Ngrok
                  <Badge className="text-xs" variant="secondary">
                    {t("ai.ollama.recommendedBadge")}
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="cloudflare">{t("ai.ollama.cloudflareOption")}</SelectItem>
              <SelectItem value="manual">{t("ai.ollama.manualOption")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {connectionMethod !== "manual" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {currentGuide.title}
              <Badge className="text-xs" variant="outline">
                {t("ai.ollama.setupGuideBadge")}
              </Badge>
            </CardTitle>
            <p className="text-muted-foreground text-sm">{currentGuide.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentGuide.steps.map((step, index) => (
              <div className="space-y-2" key={step.title}>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
                    {index + 1}
                  </div>
                  <h4 className="font-medium">{step.title}</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-muted-foreground text-sm">{step.content}</p>
                  {step.copyable && (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                        {step.content}
                      </code>
                      <Button
                        onClick={() => copyToClipboard(step.content)}
                        size="sm"
                        variant="ghost"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiUrl">
            {connectionMethod === "manual"
              ? t("ai.ollama.apiUrlLabel")
              : t("ai.ollama.tunnelUrlLabel")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="apiUrl"
              onChange={(e) => {
                setApiUrl(e.target.value)
                setConnectionStatus("idle")
              }}
              placeholder={
                connectionMethod === "manual"
                  ? t("ai.ollama.manualPlaceholder")
                  : t("ai.ollama.tunnelPlaceholder")
              }
              value={apiUrl}
            />
            <Button
              disabled={!apiUrl || testingConnection}
              onClick={testConnection}
              type="button"
              variant="outline"
            >
              {testingConnection ? t("ai.ollama.testing") : t("ai.ollama.test")}
            </Button>
          </div>
          {connectionStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              {t("ai.ollama.connectionSuccess")}
            </div>
          )}
          {connectionStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {t("ai.ollama.connectionFailed")}
            </div>
          )}
          <p className="text-muted-foreground text-sm">{t("ai.ollama.urlHint")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ollamaModel">{t("ai.settings.defaultModelLabel")}</Label>
          <Input
            id="ollamaModel"
            list="ollama-models"
            onChange={(event) => setDefaultModel(event.target.value)}
            placeholder="qwen3"
            value={defaultModel}
          />
          <datalist id="ollama-models">
            <option value="qwen3" />
            <option value="deepseek-r1" />
            <option value="llama3.2" />
          </datalist>
          <p className="text-muted-foreground text-sm">{t("ai.ollama.modelHint")}</p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            disabled={!(apiUrl && defaultModel.trim()) || loading || connectionStatus === "error"}
            onClick={handleConnect}
          >
            {loading ? t("ai.ollama.connecting") : t("ai.ollama.connectButton")}
          </Button>
          <Button
            onClick={() => window.open("https://ollama.com/download", "_blank")}
            type="button"
            variant="outline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("ai.ollama.downloadButton")}
          </Button>
        </div>
      </div>
    </div>
  )
}
