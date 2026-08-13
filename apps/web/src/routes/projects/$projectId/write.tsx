import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ChapterList } from "@/components/chapter-list"
import { GuidedTour, type TourStep, useTour } from "@/components/guided-tour"
import { StatusBar } from "@/components/status-bar"
import TiptapEditor from "@/components/tiptap-editor"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import type { SaveState } from "@/lib/save-status"
import { countWordsInHtml } from "@/lib/word-count"

const AUTOSAVE_DELAY_MS = 1500

export const Route = createFileRoute("/projects/$projectId/write")({
  component: WriteInterface,
})

function WriteInterface() {
  const { projectId } = Route.useParams()
  const queryClient = useQueryClient()
  const tour = useTour("openwrite-tour-write-v1")
  const { t } = useI18n()

  const writeTourSteps: TourStep[] = [
    {
      target: '[data-tour="editor"]',
      title: t("editor.write.tour.manuscript.title"),
      body: t("editor.write.tour.manuscript.body"),
    },
    {
      target: '[data-tour="chapters"]',
      title: t("editor.write.tour.chapters.title"),
      body: t("editor.write.tour.chapters.body"),
    },
    {
      target: '[data-tour="ai-assistant"]',
      title: t("editor.write.tour.aiAssistant.title"),
      body: t("editor.write.tour.aiAssistant.body"),
    },
    {
      target: '[data-tour="story-map"]',
      title: t("editor.write.tour.storyMap.title"),
      body: t("editor.write.tour.storyMap.body"),
    },
  ]

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["chapters", projectId],
    queryFn: async () => await api.chapters.list(projectId),
  })

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)

  // Select the first chapter once the list loads (or after deletion)
  useEffect(() => {
    if (chapters.length === 0) {
      setSelectedChapterId(null)
      return
    }
    if (!(selectedChapterId && chapters.some((ch) => ch.id === selectedChapterId))) {
      setSelectedChapterId(chapters[0].id)
    }
  }, [chapters, selectedChapterId])

  const { data: doc, isLoading: contentLoading } = useQuery({
    queryKey: ["chapter-content", projectId, selectedChapterId],
    queryFn: async () => {
      if (!selectedChapterId) {
        throw new Error("No chapter selected")
      }
      return await api.chapters.getContent(projectId, selectedChapterId)
    },
    enabled: Boolean(selectedChapterId),
    // The editor is keyed on `doc.updatedAt`; only refetch when we explicitly
    // invalidate (chapter switch or conflict reload) so a background refetch
    // never remounts the editor and drops in-progress edits.
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const [wordCount, setWordCount] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const pendingRef = useRef({ chapterId: "", content: "", dirty: false })
  const timerRef = useRef(0)
  // The `updatedAt` token last seen from the server; echoed back on save so the
  // server can reject a write that would clobber an edit made elsewhere.
  const baseUpdatedAtRef = useRef<string | null>(null)
  // While true, the chapter changed under us — stop autosaving until the writer
  // reloads, so we never overwrite the newer version.
  const conflictRef = useRef(false)

  // Seed word count and last-saved time from the loaded chapter
  useEffect(() => {
    if (doc) {
      setWordCount(doc.wordCount)
      setSavedAt(doc.updatedAt)
      setSaveState("idle")
      baseUpdatedAtRef.current = doc.updatedAt
      conflictRef.current = false
    }
  }, [doc])

  // Discard local edits and pull the latest server version of the chapter.
  const reloadChapter = useCallback(() => {
    conflictRef.current = false
    pendingRef.current.dirty = false
    window.clearTimeout(timerRef.current)
    toast.dismiss()
    queryClient.invalidateQueries({
      queryKey: ["chapter-content", projectId, selectedChapterId],
    })
  }, [projectId, selectedChapterId, queryClient])

  const { mutate: saveContent } = useMutation({
    mutationFn: async ({ chapterId, content }: { chapterId: string; content: string }) =>
      await api.chapters.saveContent(
        projectId,
        chapterId,
        content,
        baseUpdatedAtRef.current ?? undefined
      ),
    onSuccess: (result) => {
      baseUpdatedAtRef.current = result.savedAt
      setSavedAt(result.savedAt)
      setSaveState(pendingRef.current.dirty ? "dirty" : "saved")
      queryClient.invalidateQueries({ queryKey: ["chapters", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "stale_content") {
        conflictRef.current = true
        pendingRef.current.dirty = false
        setSaveState("conflict")
        toast.error(t("editor.write.chapterEditedElsewhere"), {
          description: t("editor.write.reloadLatestVersion"),
          action: { label: t("editor.write.reload"), onClick: reloadChapter },
          duration: Number.POSITIVE_INFINITY,
        })
        return
      }
      pendingRef.current.dirty = true
      setSaveState("error")
    },
  })

  const handleEditorUpdate = useCallback(
    (content: string) => {
      if (!selectedChapterId) {
        return
      }
      setWordCount(countWordsInHtml(content))
      // A reload is required to resolve a conflict; don't keep retrying saves
      // that would just be rejected (or clobber the newer version).
      if (conflictRef.current) {
        return
      }
      pendingRef.current = { chapterId: selectedChapterId, content, dirty: true }
      setSaveState("dirty")
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        pendingRef.current.dirty = false
        setSaveState("saving")
        saveContent({
          chapterId: pendingRef.current.chapterId,
          content: pendingRef.current.content,
        })
      }, AUTOSAVE_DELAY_MS)
    },
    [selectedChapterId, saveContent]
  )

  // Flush unsaved changes when switching chapters or leaving the page
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedChapterId intentionally re-arms the cleanup so pending edits flush on chapter switch
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      if (!conflictRef.current && pendingRef.current.dirty && pendingRef.current.chapterId) {
        pendingRef.current.dirty = false
        api.chapters
          .saveContent(
            projectId,
            pendingRef.current.chapterId,
            pendingRef.current.content,
            baseUpdatedAtRef.current ?? undefined
          )
          .catch((error) => {
            console.error("Failed to save draft on exit:", error)
          })
      }
    },
    [projectId, selectedChapterId]
  )

  const createFirstChapter = useMutation({
    mutationFn: async () =>
      await api.chapters.create(projectId, t("editor.chapterList.defaultTitle", { number: 1 })),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["chapters", projectId] })
      setSelectedChapterId(result.id)
    },
  })
  const { mutate: createFirstChapterMutate } = createFirstChapter

  // A brand-new project has no chapters; create Chapter 1 automatically so the
  // writer lands in an editor, not in front of another button. The ref makes
  // this a single attempt — on failure the manual button below takes over.
  const autoCreateAttemptedRef = useRef(false)
  useEffect(() => {
    if (chaptersLoading || chapters.length > 0 || autoCreateAttemptedRef.current) {
      return
    }
    autoCreateAttemptedRef.current = true
    createFirstChapterMutate()
  }, [chaptersLoading, chapters.length, createFirstChapterMutate])

  if (chaptersLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {t("editor.write.loadingManuscript")}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <ChapterList
        chapters={chapters}
        onSelect={setSelectedChapterId}
        projectId={projectId}
        selectedChapterId={selectedChapterId}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {chapters.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            {createFirstChapter.isError ? (
              <>
                <p className="text-muted-foreground">{t("editor.write.everyNovelStarts")}</p>
                <Button
                  disabled={createFirstChapter.isPending}
                  onClick={() => createFirstChapter.mutate()}
                  type="button"
                >
                  {t("editor.write.createChapterOne")}
                </Button>
              </>
            ) : (
              <p className="animate-pulse text-muted-foreground">
                {t("editor.write.preparingFirstChapter")}
              </p>
            )}
          </div>
        )}

        {chapters.length > 0 && selectedChapterId && (
          <>
            <div className="flex-1 overflow-auto" data-tour="editor">
              {contentLoading || !doc ? (
                <div className="flex h-full items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">
                    {t("editor.write.loadingChapter")}
                  </div>
                </div>
              ) : (
                <TiptapEditor
                  content={doc.content}
                  key={`${selectedChapterId}:${doc.updatedAt}`}
                  onUpdate={handleEditorUpdate}
                  placeholder={t("editor.write.editorPlaceholder")}
                />
              )}
            </div>
            <StatusBar
              onShowGuide={tour.start}
              savedAt={savedAt}
              saveState={saveState}
              wordCount={wordCount}
            />
          </>
        )}
      </div>

      {/* First-visit walkthrough; replayable via the ? in the status bar.
          Gated on a loaded editor so targets exist before the tour opens. */}
      <GuidedTour
        onFinish={tour.finish}
        open={tour.open && chapters.length > 0 && Boolean(doc)}
        steps={writeTourSteps}
      />
    </div>
  )
}
