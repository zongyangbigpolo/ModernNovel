import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api, type Location } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface DeleteLocationDialogProps {
  location: Location
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export function DeleteLocationDialog({
  open,
  onOpenChange,
  location,
  projectId,
}: DeleteLocationDialogProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const deleteLocationMutation = useMutation({
    mutationFn: () => api.locations.delete(projectId, location.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations", projectId] })
      toast.success(t("codex.location.delete.success", { name: location.name }))
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t("codex.location.delete.failed", { message: error.message }))
    },
  })

  const handleDelete = () => {
    deleteLocationMutation.mutate()
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("codex.location.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("codex.location.delete.description", { name: location.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteLocationMutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteLocationMutation.isPending}
            onClick={handleDelete}
          >
            {deleteLocationMutation.isPending
              ? t("codex.location.delete.deleting")
              : t("codex.location.delete.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
