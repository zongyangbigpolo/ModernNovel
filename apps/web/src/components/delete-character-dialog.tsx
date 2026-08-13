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
import { api, type Character } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface DeleteCharacterDialogProps {
  character: Character
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export function DeleteCharacterDialog({
  open,
  onOpenChange,
  projectId,
  character,
}: DeleteCharacterDialogProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const deleteCharacterMutation = useMutation({
    mutationFn: () => api.characters.delete(projectId, character.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
      toast.success(t("codex.character.delete.success", { name: character.name }))
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t("codex.character.delete.failed", { message: error.message }))
    },
  })

  const handleDelete = () => {
    deleteCharacterMutation.mutate()
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("codex.character.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("codex.character.delete.description.prefix")} <strong>{character.name}</strong>
            {t("codex.character.delete.description.suffix")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCharacterMutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteCharacterMutation.isPending}
            onClick={handleDelete}
          >
            {deleteCharacterMutation.isPending
              ? t("codex.character.delete.deleting")
              : t("codex.character.delete.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
