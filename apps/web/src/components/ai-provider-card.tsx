import { Plus } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"

interface AiProviderCardProps {
  children?: React.ReactNode // For the AddProviderForm
  description: string
  enabled: boolean
  isConnected: boolean
  name: string
  onConnect: () => void
  onDelete?: () => void
  recommended?: boolean
}

export function AiProviderCard({
  name,
  description,
  enabled,
  recommended,
  isConnected,
  onConnect,
  onDelete,
  children,
}: AiProviderCardProps) {
  const { t } = useI18n()
  const connectedAction = onDelete ? (
    <ConfirmDialog
      confirmText={t("common.delete")}
      description={t("ai.providerCard.deleteDialogDescription")}
      onConfirm={onDelete}
      title={t("ai.providerCard.deleteDialogTitle")}
      variant="destructive"
    >
      <Button size="sm" variant="destructive">
        {t("common.delete")}
      </Button>
    </ConfirmDialog>
  ) : (
    <Button disabled size="sm" variant="destructive">
      {t("common.delete")}
    </Button>
  )

  return (
    <Card className={`${enabled ? "" : "opacity-60"} transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <CardTitle className={`text-base sm:text-lg ${enabled ? "" : "text-muted-foreground"}`}>
              {name}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {recommended && (
                <Badge className="text-xs" variant="secondary">
                  {t("ai.providerCard.recommendedBadge")}
                </Badge>
              )}
              {isConnected && (
                <Badge className="text-xs" variant="default">
                  {t("ai.providerCard.connectedBadge")}
                </Badge>
              )}
              {!enabled && (
                <Badge className="text-xs" variant="outline">
                  {t("ai.providerCard.comingSoonBadge")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex w-full justify-end sm:w-auto">
            {isConnected ? (
              connectedAction
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto" disabled={!enabled} onClick={onConnect}>
                    <Plus className="mr-2 h-4 w-4" />
                    {enabled
                      ? t("ai.providerCard.connectButton")
                      : t("ai.providerCard.comingSoonBadge")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {t("ai.providerCard.connectDialogTitle", { provider: name })}
                    </DialogTitle>
                    <DialogDescription>
                      {t("ai.providerCard.connectDialogDescription", { provider: name })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[calc(90vh-8rem)] overflow-y-auto pr-2">{children}</div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <CardDescription className={`text-sm ${enabled ? "" : "text-muted-foreground/70"}`}>
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
