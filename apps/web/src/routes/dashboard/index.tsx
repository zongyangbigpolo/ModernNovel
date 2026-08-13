import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, Clock, Plus, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { EditProjectDialog } from "@/components/edit-project-dialog"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { api, type Project } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
})

function DashboardHome() {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const { t } = useI18n()

  // Fetch projects for overview
  const {
    data: projects,
    isError,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const result = await api.projects.list()
      return result
    },
    retry: 2,
    retryDelay: 1000,
  })

  // Handle error with toast notification
  useEffect(() => {
    if (isError && error) {
      toast.error(t("dashboard.home.feedback.loadFailedToast"))
    }
  }, [error, isError, t])

  const totalWords = projects?.reduce((sum, project) => sum + project.currentWordCount, 0) || 0
  const activeProjects =
    projects?.filter((project) => project.status === "in_progress" || project.status === "draft") ||
    []
  const recentProjects = projects?.slice(0, 3) || []

  // Handle error state
  if (isError) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="mb-2 font-semibold text-2xl text-destructive">
                {t("dashboard.home.error.title")}
              </h2>
              <p className="mb-4 text-muted-foreground">{t("dashboard.home.error.description")}</p>
              <Button onClick={() => window.location.reload()}>
                {t("dashboard.home.error.refresh")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-bold text-3xl">{t("dashboard.home.welcome.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("dashboard.home.welcome.description")}</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {t("dashboard.home.stats.totalProjects")}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{projects?.length || 0}</div>
              <p className="text-muted-foreground text-xs">
                {t("dashboard.home.stats.activeProjects", { count: activeProjects.length })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {t("dashboard.home.stats.totalWords")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{totalWords.toLocaleString()}</div>
              <p className="text-muted-foreground text-xs">
                {t("dashboard.home.stats.acrossAllProjects")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {t("dashboard.home.stats.thisWeek")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">0</div>
              <p className="text-muted-foreground text-xs">
                {t("dashboard.home.stats.wordsWritten")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {t("dashboard.home.stats.organization")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">1</div>
              <p className="text-muted-foreground text-xs">
                {t("dashboard.home.stats.teamMember")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Novels */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("dashboard.home.recent.title")}</CardTitle>
                <CardDescription>{t("dashboard.home.recent.description")}</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/projects">{t("common.viewAll")}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="space-y-4">
                  {recentProjects.map((project: Project) => (
                    <ProjectCard key={project.id} onEdit={setEditingProject} project={project} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="mb-4 text-muted-foreground">{t("dashboard.home.recent.empty")}</p>
                  <Button asChild>
                    <Link to="/dashboard/projects">
                      <Plus className="mr-2 h-4 w-4" />
                      {t("dashboard.home.recent.createFirst")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Writing Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.home.progress.title")}</CardTitle>
              <CardDescription>{t("dashboard.home.progress.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeProjects.slice(0, 3).map((project: Project) => {
                  const progress = project.targetWordCount
                    ? Math.min((project.currentWordCount / project.targetWordCount) * 100, 100)
                    : 0
                  const currentWords = project.currentWordCount.toLocaleString()
                  const targetWords = project.targetWordCount?.toLocaleString() || "∞"

                  return (
                    <div className="space-y-2" key={project.id}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{project.title}</p>
                        <p className="text-muted-foreground text-sm">{Math.round(progress)}%</p>
                      </div>
                      <Progress className="h-2" value={progress} />
                      <p className="text-muted-foreground text-xs">
                        {t("dashboard.home.progress.words", {
                          current: currentWords,
                          target: targetWords,
                        })}
                      </p>
                    </div>
                  )
                })}

                {activeProjects.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>{t("dashboard.home.progress.empty")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Project Dialog */}
        {editingProject && (
          <EditProjectDialog
            onOpenChange={(open) => {
              if (!open) {
                setEditingProject(null)
              }
            }}
            open={!!editingProject}
            project={editingProject}
          />
        )}
      </div>
    </div>
  )
}
