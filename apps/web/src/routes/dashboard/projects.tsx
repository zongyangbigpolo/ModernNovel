import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BookOpen, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditProjectDialog } from "@/components/edit-project-dialog"
import { ProjectCard } from "@/components/project-card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export const Route = createFileRoute("/dashboard/projects")({
  component: ProjectsPage,
})

interface CreateProjectForm {
  description: string
  genre: string
  targetWordCount: string
  title: string
  type: "novel" | "trilogy" | "series" | "short_story_collection" | "graphic_novel" | "screenplay"
  visibility: "private" | "organization" | "public"
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

function ProjectsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [createForm, setCreateForm] = useState<CreateProjectForm>({
    title: "",
    description: "",
    type: "novel",
    genre: "",
    targetWordCount: "",
    visibility: "private",
  })

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const result = await api.projects.list()
      return result
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      const result = await api.projects.create({
        title: data.title,
        description: data.description || null,
        type: data.type,
        genre: data.genre || null,
        targetWordCount: data.targetWordCount ? Number.parseInt(data.targetWordCount, 10) : null,
        visibility: data.visibility,
      })
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsCreateDialogOpen(false)
      setCreateForm({
        title: "",
        description: "",
        type: "novel",
        genre: "",
        targetWordCount: "",
        visibility: "private",
      })
      navigate({ to: "/projects/$projectId/write", params: { projectId: result.id } })
    },
    onError: () => {
      toast.error(t("projects.list.feedback.createFailed"))
    },
  })

  const handleCreateProject = () => {
    if (!createForm.title.trim()) {
      toast.error(t("projects.list.feedback.titleRequired"))
      return
    }
    createProjectMutation.mutate(createForm)
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-lg">{t("common.loading")}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("projects.list.breadcrumb")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-3xl">{t("projects.list.title")}</h1>
              <p className="mt-2">{t("projects.list.description")}</p>
            </div>

            <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("projects.list.newProject")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("projects.list.createDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("projects.list.createDialog.description")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("projects.list.form.titleLabel")}</Label>
                    <Input
                      id="title"
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder={t("projects.list.form.titlePlaceholder")}
                      value={createForm.title}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t("common.description")}</Label>
                    <Textarea
                      id="description"
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder={t("projects.list.form.descriptionPlaceholder")}
                      value={createForm.description}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">{t("projects.list.form.projectType")}</Label>
                      <Select
                        onValueChange={(
                          value:
                            | "novel"
                            | "trilogy"
                            | "series"
                            | "short_story_collection"
                            | "graphic_novel"
                            | "screenplay"
                        ) => setCreateForm((prev) => ({ ...prev, type: value }))}
                        value={createForm.type}
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
                          <SelectItem value="screenplay">
                            {t(PROJECT_TYPE_KEYS.screenplay)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="genre">{t("projects.list.form.genre")}</Label>
                        <Input
                          id="genre"
                          onChange={(e) =>
                            setCreateForm((prev) => ({ ...prev, genre: e.target.value }))
                          }
                          placeholder={t("projects.list.form.genrePlaceholder")}
                          value={createForm.genre}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetWordCount">
                          {t("projects.list.form.targetWords")}
                        </Label>
                        <Input
                          id="targetWordCount"
                          onChange={(e) =>
                            setCreateForm((prev) => ({ ...prev, targetWordCount: e.target.value }))
                          }
                          placeholder="50000"
                          type="number"
                          value={createForm.targetWordCount}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visibility">{t("projects.list.form.visibility")}</Label>
                      <Select
                        onValueChange={(value: "private" | "organization" | "public") =>
                          setCreateForm((prev) => ({ ...prev, visibility: value }))
                        }
                        value={createForm.visibility}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">{t(VISIBILITY_KEYS.private)}</SelectItem>
                          <SelectItem value="organization">
                            {t(VISIBILITY_KEYS.organization)}
                          </SelectItem>
                          <SelectItem value="public">{t(VISIBILITY_KEYS.public)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline">
                    {t("common.cancel")}
                  </Button>
                  <Button disabled={createProjectMutation.isPending} onClick={handleCreateProject}>
                    {createProjectMutation.isPending
                      ? t("common.creating")
                      : t("projects.list.actions.createProject")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: Project) => (
              <ProjectCard key={project.id} onEdit={setEditingProject} project={project} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <h3 className="mb-2 font-medium text-xl">{t("projects.list.empty.title")}</h3>
            <p className="mb-6">{t("projects.list.empty.description")}</p>
            <Button className="flex items-center gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("projects.list.empty.cta")}
            </Button>
          </div>
        )}

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
