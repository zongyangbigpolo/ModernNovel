import { createFileRoute } from "@tanstack/react-router"
import { WriterSkillsPage } from "@/routes/dashboard/project/$projectId/settings"

export const Route = createFileRoute("/projects/$projectId/skills")({
  component: ProjectWriterSkillsRoute,
})

function ProjectWriterSkillsRoute() {
  const { projectId } = Route.useParams()
  return <WriterSkillsPage projectId={projectId} />
}
