import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea"
import { api, type Project } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface EditProjectForm {
  description: string
  genre: string
  targetWordCount: string
  title: string
  type: "novel" | "trilogy" | "series" | "short_story_collection" | "graphic_novel" | "screenplay"
  visibility: "private" | "organization" | "public"
}

interface EditProjectDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  project: Project
}

const PROJECT_TYPE_KEYS = {
  novel: "projects.meta.type.novel",
  trilogy: "projects.meta.type.trilogy",
  series: "projects.meta.type.series",
  short_story_collection: "projects.meta.type.short_story_collection",
  graphic_novel: "projects.meta.type.graphic_novel",
  screenplay: "projects.meta.type.screenplay",
} as const

const VISIBILITY_KEYS = {
  private: "projects.meta.visibility.private",
  organization: "projects.meta.visibility.organization",
  public: "projects.meta.visibility.public",
} as const

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [editForm, setEditForm] = useState<EditProjectForm>({
    title: project.title,
    description: project.description || "",
    type: project.type,
    genre: project.genre || "",
    targetWordCount: project.targetWordCount?.toString() || "",
    visibility: project.visibility,
  })

  const updateProjectMutation = useMutation({
    mutationFn: async (data: EditProjectForm) => {
      if (!api.projects.update) {
        throw new Error(t("projects.editDialog.feedback.updateUnavailable"))
      }
      const result = await api.projects.update(project.id, {
        title: data.title,
        description: data.description || null,
        type: data.type,
        genre: data.genre || null,
        targetWordCount: data.targetWordCount ? Number.parseInt(data.targetWordCount, 10) : null,
        visibility: data.visibility,
      })
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      onOpenChange(false)
      toast.success(t("projects.editDialog.feedback.updatedTitle"), {
        description: t("projects.editDialog.feedback.updatedDescription"),
      })
    },
    onError: (error) => {
      toast.error(t("projects.editDialog.feedback.updateFailed"), {
        description:
          error instanceof Error ? error.message : t("projects.editDialog.feedback.tryAgain"),
      })
    },
  })

  const handleUpdateProject = () => {
    if (!editForm.title.trim()) {
      toast.error(t("projects.editDialog.feedback.titleRequired"))
      return
    }
    updateProjectMutation.mutate(editForm)
  }

  const handleCancel = () => {
    setEditForm({
      title: project.title,
      description: project.description || "",
      type: project.type,
      genre: project.genre || "",
      targetWordCount: project.targetWordCount?.toString() || "",
      visibility: project.visibility,
    })
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projects.editDialog.title")}</DialogTitle>
          <DialogDescription>{t("projects.editDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("projects.editDialog.form.titleLabel")}</Label>
            <Input
              id="edit-title"
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t("projects.editDialog.form.titlePlaceholder")}
              value={editForm.title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("common.description")}</Label>
            <Textarea
              id="edit-description"
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("projects.editDialog.form.descriptionPlaceholder")}
              value={editForm.description}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">{t("projects.editDialog.form.projectType")}</Label>
              <Select
                onValueChange={(
                  value:
                    | "novel"
                    | "trilogy"
                    | "series"
                    | "short_story_collection"
                    | "graphic_novel"
                    | "screenplay"
                ) => setEditForm((prev) => ({ ...prev, type: value }))}
                value={editForm.type}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novel">{t(PROJECT_TYPE_KEYS.novel)}</SelectItem>
                  <SelectItem value="trilogy">{t(PROJECT_TYPE_KEYS.trilogy)}</SelectItem>
                  <SelectItem value="series">{t(PROJECT_TYPE_KEYS.series)}</SelectItem>
                  <SelectItem value="short_story_collection">
                    {t(PROJECT_TYPE_KEYS.short_story_collection)}
                  </SelectItem>
                  <SelectItem value="graphic_novel">
                    {t(PROJECT_TYPE_KEYS.graphic_novel)}
                  </SelectItem>
                  <SelectItem value="screenplay">{t(PROJECT_TYPE_KEYS.screenplay)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-genre">{t("projects.editDialog.form.genre")}</Label>
                <Input
                  id="edit-genre"
                  onChange={(e) => setEditForm((prev) => ({ ...prev, genre: e.target.value }))}
                  placeholder={t("projects.editDialog.form.genrePlaceholder")}
                  value={editForm.genre}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-targetWordCount">
                  {t("projects.editDialog.form.targetWords")}
                </Label>
                <Input
                  id="edit-targetWordCount"
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, targetWordCount: e.target.value }))
                  }
                  placeholder="50000"
                  type="number"
                  value={editForm.targetWordCount}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-visibility">{t("projects.editDialog.form.visibility")}</Label>
              <Select
                onValueChange={(value: "private" | "organization" | "public") =>
                  setEditForm((prev) => ({ ...prev, visibility: value }))
                }
                value={editForm.visibility}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t(VISIBILITY_KEYS.private)}</SelectItem>
                  <SelectItem value="organization">{t(VISIBILITY_KEYS.organization)}</SelectItem>
                  <SelectItem value="public">{t(VISIBILITY_KEYS.public)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            {t("common.cancel")}
          </Button>
          <Button disabled={updateProjectMutation.isPending} onClick={handleUpdateProject}>
            {updateProjectMutation.isPending
              ? t("projects.editDialog.actions.updating")
              : t("projects.editDialog.actions.updateProject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
