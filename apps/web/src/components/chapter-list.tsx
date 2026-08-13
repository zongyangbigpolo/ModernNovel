import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowDown, ArrowUp, Network, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Chapter } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface ChapterListProps {
  chapters: Chapter[]
  onSelect: (chapterId: string) => void
  projectId: string
  selectedChapterId: string | null
}

export function ChapterList({
  projectId,
  chapters,
  selectedChapterId,
  onSelect,
}: ChapterListProps) {
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["chapters", projectId] })

  const createMutation = useMutation({
    mutationFn: async () =>
      await api.chapters.create(
        projectId,
        t("editor.chapterList.defaultTitle", { number: chapters.length + 1 })
      ),
    onSuccess: (result) => {
      refresh()
      onSelect(result.id)
    },
    onError: () => toast.error(t("editor.chapterList.failedCreate")),
  })

  const renameMutation = useMutation({
    mutationFn: async ({ chapterId, title }: { chapterId: string; title: string }) =>
      await api.chapters.update(projectId, chapterId, { title }),
    onSuccess: refresh,
    onError: () => toast.error(t("editor.chapterList.failedRename")),
  })

  const reorderMutation = useMutation({
    mutationFn: async (chapterIds: string[]) => await api.chapters.reorder(projectId, chapterIds),
    onSuccess: refresh,
    onError: () => toast.error(t("editor.chapterList.failedReorder")),
  })

  const deleteMutation = useMutation({
    mutationFn: async (chapterId: string) => await api.chapters.delete(projectId, chapterId),
    onSuccess: (_, deletedId) => {
      refresh()
      if (selectedChapterId === deletedId) {
        const remaining = chapters.filter((ch) => ch.id !== deletedId)
        const next = remaining.at(0)
        if (next) {
          onSelect(next.id)
        }
      }
    },
    onError: () => toast.error(t("editor.chapterList.failedDelete")),
  })

  const startRename = (ch: Chapter) => {
    setEditingId(ch.id)
    setEditingTitle(ch.title)
  }

  const commitRename = () => {
    if (editingId && editingTitle.trim()) {
      renameMutation.mutate({ chapterId: editingId, title: editingTitle.trim() })
    }
    setEditingId(null)
  }

  const move = (chapterId: string, direction: -1 | 1) => {
    const ids = chapters.map((ch) => ch.id)
    const index = ids.indexOf(chapterId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) {
      return
    }
    ids[index] = ids[target]
    ids[target] = chapterId
    reorderMutation.mutate(ids)
  }

  return (
    <div className="flex h-full w-44 flex-col border-r bg-muted/20 sm:w-60" data-tour="chapters">
      <div className="flex items-center justify-between border-b p-3">
        <span className="font-medium text-sm">{t("editor.chapterList.heading")}</span>
        <Button
          aria-label={t("editor.chapterList.newChapter")}
          className="h-7 w-7 p-0"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
          size="sm"
          title={t("editor.chapterList.newChapter")}
          type="button"
          variant="ghost"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {chapters.length === 0 && (
          <p className="px-2 py-4 text-muted-foreground text-xs">{t("editor.chapterList.empty")}</p>
        )}

        {chapters.map((ch, index) => (
          <div
            className={cn(
              "group flex items-center gap-1 rounded-md px-2 py-1.5",
              selectedChapterId === ch.id ? "bg-background shadow-sm" : "hover:bg-background/60"
            )}
            key={ch.id}
          >
            {editingId === ch.id ? (
              <Input
                autoFocus
                className="h-7 text-sm"
                onBlur={commitRename}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRename()
                  }
                  if (e.key === "Escape") {
                    setEditingId(null)
                  }
                }}
                value={editingTitle}
              />
            ) : (
              <>
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelect(ch.id)}
                  type="button"
                >
                  <span className="block truncate font-medium text-sm">{ch.title}</span>
                  <span className="block text-muted-foreground text-xs">
                    {t("editor.chapterList.wordCount", { count: ch.wordCount.toLocaleString() })}
                  </span>
                </button>

                <div className="hidden shrink-0 items-center group-hover:flex">
                  <Button
                    aria-label={t("editor.chapterList.moveUp")}
                    className="h-6 w-6 p-0"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => move(ch.id, -1)}
                    size="sm"
                    title={t("editor.chapterList.moveUp")}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    aria-label={t("editor.chapterList.moveDown")}
                    className="h-6 w-6 p-0"
                    disabled={index === chapters.length - 1 || reorderMutation.isPending}
                    onClick={() => move(ch.id, 1)}
                    size="sm"
                    title={t("editor.chapterList.moveDown")}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    aria-label={t("common.rename")}
                    className="h-6 w-6 p-0"
                    onClick={() => startRename(ch)}
                    size="sm"
                    title={t("common.rename")}
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <ConfirmDialog
                    confirmText={t("common.delete")}
                    description={t("editor.chapterList.deleteDescription", { title: ch.title })}
                    onConfirm={() => deleteMutation.mutate(ch.id)}
                    title={t("editor.chapterList.deleteTitle")}
                    variant="destructive"
                  >
                    <Button
                      aria-label={t("common.delete")}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      size="sm"
                      title={t("common.delete")}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </ConfirmDialog>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-2" data-tour="story-map">
        <Button
          asChild
          className="w-full justify-start text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          <Link params={{ projectId }} to="/projects/$projectId/canvas">
            <Network className="mr-2 h-4 w-4" />
            {t("editor.chapterList.mapYourStory")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
