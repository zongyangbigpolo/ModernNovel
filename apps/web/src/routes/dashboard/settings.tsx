import { createFileRoute } from "@tanstack/react-router"
import { Settings } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useI18n } from "@/lib/i18n"

function OrganizationSettingsPage() {
  const { t } = useI18n()

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl">{t("dashboard.settings.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.settings.description")}</p>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>{t("dashboard.settings.comingSoon")}</AlertDescription>
      </Alert>
    </div>
  )
}

export const Route = createFileRoute("/dashboard/settings")({
  component: OrganizationSettingsPage,
})
