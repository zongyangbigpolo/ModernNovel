import { Download } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { buildManuscriptMarkdown, manuscriptFilename } from "@/lib/export-markdown"
import { useI18n } from "@/lib/i18n"

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

interface ExportButtonProps {
  projectId: string
  projectTitle: string
}

export function ExportButton({ projectId, projectTitle }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const { t } = useI18n()

  const handleExport = async () => {
    setExporting(true)
    try {
      const chapters = await api.chapters.list(projectId)
      if (chapters.length === 0) {
        toast.error(t("projects.export.empty"))
        return
      }

      const withContent = await Promise.all(
        chapters.map(async (chapter) => ({
          title: chapter.title,
          content: (await api.chapters.getContent(projectId, chapter.id)).content,
        }))
      )

      downloadTextFile(
        manuscriptFilename(projectTitle),
        buildManuscriptMarkdown(projectTitle, withContent)
      )
      toast.success(t("projects.export.success"))
    } catch (error) {
      toast.error(
        t("projects.export.failed", {
          message: error instanceof Error ? error.message : t("projects.export.unknownError"),
        })
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      className="gap-2"
      disabled={exporting}
      onClick={handleExport}
      size="sm"
      type="button"
      variant="outline"
    >
      <Download className="h-4 w-4" />
      {exporting ? t("projects.export.exporting") : t("projects.export.button")}
    </Button>
  )
}
