import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, Brain, Users } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"

export const Route = createFileRoute("/")({
  component: HomeComponent,
})

async function fetchSession() {
  const baseUrl =
    import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
      ? import.meta.env.VITE_SERVER_URL
      : window.location.origin
  const response = await fetch(`${baseUrl}/api/session`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch session")
  }

  return response.json()
}

function HomeComponent() {
  const navigate = Route.useNavigate()
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
  })

  useEffect(() => {
    if (sessionQuery.data?.authenticated) {
      navigate({ to: "/dashboard" })
    }
  }, [sessionQuery.data, navigate])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Logo size="lg" />
        <Button asChild variant="ghost">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="mb-4 text-muted-foreground text-sm">
          A focused workspace for long-form writing
        </p>
        <h1 className="max-w-3xl text-balance font-semibold text-5xl tracking-tight md:text-7xl">
          Turn your next idea into a finished novel.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Plan your world, write chapters, collaborate with your team, and use the AI model you
          already trust.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/register">Create an account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Open workspace</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 pb-12 md:grid-cols-3">
        <Card>
          <CardHeader>
            <BookOpen className="h-5 w-5" />
            <CardTitle>Write without clutter</CardTitle>
            <CardDescription>
              Projects, chapters, characters, and story notes in one place.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Brain className="h-5 w-5" />
            <CardTitle>Bring your own AI</CardTitle>
            <CardDescription>
              Connect hosted providers or a local Ollama instance in the browser.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Users className="h-5 w-5" />
            <CardTitle>Share a workspace</CardTitle>
            <CardDescription>
              Invite collaborators and control who can manage your work.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  )
}
