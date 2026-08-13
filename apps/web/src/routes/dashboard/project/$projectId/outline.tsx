import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/dashboard/project/$projectId/outline")({
  component: ProjectOutlinePage,
})

function ProjectOutlinePage() {
  const { t } = useI18n()

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
          <h3 className="mb-2 font-medium text-xl">{t("projects.detail.outline.title")}</h3>
          <p>{t("projects.detail.outline.description")}</p>
        </div>
      </div>
    </div>
  )
}
