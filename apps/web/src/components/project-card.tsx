import { Link } from "@tanstack/react-router"
import { BookOpen, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Project } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface ProjectCardProps {
  onEdit?: (project: Project) => void
  project: Project
}

const PROJECT_STATUS_KEYS = {
  draft: "projects.meta.status.draft",
  in_progress: "projects.meta.status.in_progress",
  completed: "projects.meta.status.completed",
  published: "projects.meta.status.published",
  archived: "projects.meta.status.archived",
} as const

const PROJECT_TYPE_KEYS = {
  novel: "projects.meta.type.novel",
  trilogy: "projects.meta.type.trilogy",
  series: "projects.meta.type.series",
  short_story_collection: "projects.meta.type.short_story_collection",
  graphic_novel: "projects.meta.type.graphic_novel",
  screenplay: "projects.meta.type.screenplay",
} as const

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { locale, t } = useI18n()
  const currentWords = project.currentWordCount.toLocaleString(locale)
  const targetWords = project.targetWordCount?.toLocaleString(locale) || "∞"
  const projectTypeLabel =
    locale === "en"
      ? project.type.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : t(PROJECT_TYPE_KEYS[project.type])

  return (
    <Card className="relative transition-shadow hover:shadow-lg">
      {onEdit && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit(project)
            }}
            size="sm"
            variant="ghost"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Link params={{ projectId: project.id }} to="/projects/$projectId/write">
        <div className="cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between pr-8">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <Badge variant={project.status === "draft" ? "secondary" : "default"}>
                {t(PROJECT_STATUS_KEYS[project.status])}
              </Badge>
            </div>
            <CardTitle className="mt-4 truncate">{project.title}</CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2">{project.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-gray-600 text-sm">
                <span className="font-medium">{t("projects.card.labels.type")}</span>{" "}
                {projectTypeLabel}
              </div>
              {project.genre && (
                <div className="text-gray-600 text-sm">
                  <span className="font-medium">{t("projects.card.labels.genre")}</span>{" "}
                  {project.genre}
                </div>
              )}
              <div className="text-gray-600 text-sm">
                <span className="font-medium">{t("projects.card.labels.progress")}</span>{" "}
                {t("projects.meta.wordsProgress", {
                  current: currentWords,
                  target: targetWords,
                })}
              </div>
              {project.targetWordCount && (
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min((project.currentWordCount / project.targetWordCount) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  )
}
