import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/project/$projectId/")({
  loader: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/write",
      params: { projectId: params.projectId },
    })
  },
})
