import { Download } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { buildManuscriptMarkdown, manuscriptFilename } from "@/lib/export-markdown"

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

  const handleExport = async () => {
    setExporting(true)
    try {
      const chapters = await api.chapters.list(projectId)
      if (chapters.length === 0) {
        toast.error("There's nothing to export yet.")
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
      toast.success("Manuscript exported as Markdown")
    } catch (error) {
      toast.error(`Export failed: ${error instanceof Error ? error.message : "unknown error"}`)
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
      {exporting ? "Exporting…" : "Export"}
    </Button>
  )
}
