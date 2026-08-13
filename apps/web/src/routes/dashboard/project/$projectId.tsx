import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router"
import { Edit3, FileText, MessageCircle, Settings, Users } from "lucide-react"
import { ExportButton } from "@/components/export-button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AISidebarProvider, useAISidebar } from "@/contexts/ai-sidebar-context"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/dashboard/project/$projectId")({
  component: () => (
    <AISidebarProvider>
      <ProjectLayout />
    </AISidebarProvider>
  ),
})

function ProjectLayout() {
  const { projectId: id } = Route.useParams()
  const location = useLocation()
  const { locale, t } = useI18n()
  const { isOpen: aiSidebarOpen, toggle: toggleAISidebar } = useAISidebar()

  const isWritePage = location.pathname.includes("/write")

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const result = await api.projects.get(id)
      return result
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse">{t("projects.detail.loading")}</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 font-semibold text-2xl text-gray-900">
            {t("projects.detail.notFoundTitle")}
          </h2>
          <Link to="/dashboard/projects">
            <Button variant="outline">{t("projects.detail.backToProjects")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentWords = project.currentWordCount.toLocaleString(locale)
  const targetWords = project.targetWordCount?.toLocaleString(locale) || "∞"

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex flex-col space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard/projects">{t("projects.list.breadcrumb")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl">{project.title}</h1>
              {project.description && <p className="mt-1">{project.description}</p>}
            </div>

            <div className="flex items-center gap-4">
              <div className="min-w-32">
                <div className="text-sm opacity-75">
                  {t("projects.meta.wordsProgress", {
                    current: currentWords,
                    target: targetWords,
                  })}
                </div>
                {project.targetWordCount ? (
                  <Progress
                    className="mt-1 h-1.5"
                    value={Math.min(
                      100,
                      (project.currentWordCount / project.targetWordCount) * 100
                    )}
                  />
                ) : null}
              </div>

              <ExportButton projectId={id} projectTitle={project.title} />

              {isWritePage && (
                <Button className="gap-2" onClick={toggleAISidebar} size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4" />
                  {aiSidebarOpen ? t("projects.detail.hideAi") : t("projects.detail.showAi")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-6">
          <Link
            activeProps={{ className: "text-blue-600 border-blue-600" }}
            className="flex items-center border-transparent border-b-2 px-3 py-2 font-medium text-sm [&.active]:border-blue-600 [&.active]:text-blue-600"
            params={{ projectId: id }}
            to="/projects/$projectId/write"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            {t("projects.detail.nav.write")}
          </Link>

          <Link
            activeProps={{ className: "text-blue-600 border-blue-600" }}
            className="flex items-center border-transparent border-b-2 px-3 py-2 font-medium text-sm [&.active]:border-blue-600 [&.active]:text-blue-600"
            params={{ projectId: id }}
            to="/dashboard/project/$projectId/outline"
          >
            <FileText className="mr-2 h-4 w-4" />
            {t("projects.detail.nav.outline")}
          </Link>

          <Link
            activeProps={{ className: "text-blue-600 border-blue-600" }}
            className="flex items-center border-transparent border-b-2 px-3 py-2 font-medium text-sm [&.active]:border-blue-600 [&.active]:text-blue-600"
            params={{ projectId: id }}
            to="/dashboard/project/$projectId/characters"
          >
            <Users className="mr-2 h-4 w-4" />
            {t("projects.detail.nav.characters")}
          </Link>

          <Link
            activeProps={{ className: "text-blue-600 border-blue-600" }}
            className="flex items-center border-transparent border-b-2 px-3 py-2 font-medium text-sm [&.active]:border-blue-600 [&.active]:text-blue-600"
            params={{ projectId: id }}
            to="/dashboard/project/$projectId/settings"
          >
            <Settings className="mr-2 h-4 w-4" />
            {t("projects.detail.nav.settings")}
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
