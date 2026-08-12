import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FileText, MapPin, Pencil, Plus, Scroll, Trash2, Users } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CodexEntryDialog, type CodexEntryValues } from "@/components/codex-entry-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

export const Route = createFileRoute("/projects/$projectId/codex/$type")({
  component: CodexTypeInterface,
})

// A codex entry, normalized across the four underlying entities so a single
// view can render any of them.
interface CodexEntry {
  description: string
  id: string
  label: string
}

interface CodexConfig {
  description: string
  icon: typeof Users
  nameLabel: string
  nounLabel: string
  title: string
}

interface CodexBinding {
  create: (values: CodexEntryValues, currentCount: number) => Promise<unknown>
  list: () => Promise<CodexEntry[]>
  remove: (id: string) => Promise<unknown>
  update: (id: string, values: CodexEntryValues) => Promise<unknown>
}

const CODEX_CONFIG: Record<string, CodexConfig> = {
  characters: {
    title: "Characters",
    description: "Manage your story's characters",
    icon: Users,
    nounLabel: "Character",
    nameLabel: "Name",
  },
  locations: {
    title: "Locations",
    description: "Track your story's places and settings",
    icon: MapPin,
    nounLabel: "Location",
    nameLabel: "Name",
  },
  lore: {
    title: "Lore & World-building",
    description: "Document your world's history and rules",
    icon: Scroll,
    nounLabel: "Lore Entry",
    nameLabel: "Name",
  },
  plot: {
    title: "Plot Threads",
    description: "Track your story's narrative threads and arcs",
    icon: FileText,
    nounLabel: "Plot Thread",
    nameLabel: "Title",
  },
}

const FALLBACK_CONFIG: CodexConfig = {
  title: "Codex",
  description: "Manage your story elements",
  icon: FileText,
  nounLabel: "Entry",
  nameLabel: "Name",
}

// Maps the generic codex form onto the right API client for the active type.
function getBinding(type: string, projectId: string): CodexBinding | null {
  switch (type) {
    case "characters":
      return {
        list: async () =>
          (await api.characters.list(projectId)).map((c) => ({
            id: c.id,
            label: c.name,
            description: c.description ?? "",
          })),
        create: (values) => api.characters.create(projectId, values),
        update: (id, values) => api.characters.update(projectId, id, values),
        remove: (id) => api.characters.delete(projectId, id),
      }
    case "locations":
      return {
        list: async () =>
          (await api.locations.list(projectId)).map((l) => ({
            id: l.id,
            label: l.name,
            description: l.description ?? "",
          })),
        create: (values) => api.locations.create(projectId, values),
        update: (id, values) => api.locations.update(projectId, id, values),
        remove: (id) => api.locations.delete(projectId, id),
      }
    case "lore":
      return {
        list: async () =>
          (await api.lore.list(projectId)).map((l) => ({
            id: l.id,
            label: l.name,
            description: l.description ?? "",
          })),
        create: (values) => api.lore.create(projectId, values),
        update: (id, values) => api.lore.update(projectId, id, values),
        remove: (id) => api.lore.delete(projectId, id),
      }
    case "plot":
      return {
        list: async () =>
          (await api.plot.list(projectId)).map((p) => ({
            id: p.id,
            label: p.title,
            description: p.description ?? "",
          })),
        create: (values, currentCount) =>
          api.plot.create(projectId, {
            title: values.name,
            description: values.description,
            order: currentCount + 1,
          }),
        update: (id, values) =>
          api.plot.update(projectId, id, {
            title: values.name,
            description: values.description,
          }),
        remove: (id) => api.plot.delete(projectId, id),
      }
    default:
      return null
  }
}

function CodexTypeInterface() {
  const { type, projectId } = Route.useParams()
  const queryClient = useQueryClient()

  const config = CODEX_CONFIG[type] ?? FALLBACK_CONFIG
  const IconComponent = config.icon
  const binding = getBinding(type, projectId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CodexEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<CodexEntry | null>(null)

  const queryKey = ["codex", type, projectId]

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => (binding ? binding.list() : Promise.resolve([])),
    enabled: Boolean(binding),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const createMutation = useMutation({
    mutationFn: (values: CodexEntryValues) => {
      if (!binding) {
        throw new Error("Unknown codex type")
      }
      return binding.create(values, entries.length)
    },
    onSuccess: () => {
      invalidate()
      toast.success(`${config.nounLabel} added`)
      setDialogOpen(false)
    },
    onError: (error) =>
      toast.error(`Failed to add ${config.nounLabel.toLowerCase()}: ${error.message}`),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CodexEntryValues }) => {
      if (!binding) {
        throw new Error("Unknown codex type")
      }
      return binding.update(id, values)
    },
    onSuccess: () => {
      invalidate()
      toast.success(`${config.nounLabel} updated`)
      setEditingEntry(null)
    },
    onError: (error) =>
      toast.error(`Failed to update ${config.nounLabel.toLowerCase()}: ${error.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!binding) {
        throw new Error("Unknown codex type")
      }
      return binding.remove(id)
    },
    onSuccess: () => {
      invalidate()
      toast.success(`${config.nounLabel} deleted`)
      setDeletingEntry(null)
    },
    onError: (error) =>
      toast.error(`Failed to delete ${config.nounLabel.toLowerCase()}: ${error.message}`),
  })

  const handleSubmit = (values: CodexEntryValues) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 font-bold text-3xl">
              <IconComponent className="h-8 w-8" />
              {config.title}
            </h1>
            <p className="mt-2 text-muted-foreground">{config.description}</p>
          </div>
          {binding && (
            <Button
              onClick={() => {
                setEditingEntry(null)
                setDialogOpen(true)
              }}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {config.nounLabel}
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <Skeleton className="h-36 w-full" key={n} />
            ))}
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="break-words">{entry.label}</CardTitle>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        aria-label={`Edit ${entry.label}`}
                        onClick={() => {
                          setEditingEntry(entry)
                          setDialogOpen(true)
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Delete ${entry.label}`}
                        onClick={() => setDeletingEntry(entry)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                    {entry.description || "No description yet."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && binding && entries.length === 0 && (
          <div className="py-12 text-center">
            <IconComponent className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <h3 className="mb-2 font-medium text-xl">No {config.title.toLowerCase()} yet</h3>
            <p className="mb-6 text-muted-foreground">
              Create your first {config.nounLabel.toLowerCase()} to start building your story world.
            </p>
            <Button
              onClick={() => {
                setEditingEntry(null)
                setDialogOpen(true)
              }}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {config.nounLabel}
            </Button>
          </div>
        )}
      </div>

      {binding && (
        <CodexEntryDialog
          initialDescription={editingEntry?.description ?? ""}
          initialName={editingEntry?.label ?? ""}
          isSaving={createMutation.isPending || updateMutation.isPending}
          key={editingEntry?.id ?? "new"}
          mode={editingEntry ? "edit" : "create"}
          nameLabel={config.nameLabel}
          nounLabel={config.nounLabel}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingEntry(null)
            }
          }}
          onSubmit={handleSubmit}
          open={dialogOpen}
        />
      )}

      <AlertDialog
        onOpenChange={(open) => !open && setDeletingEntry(null)}
        open={Boolean(deletingEntry)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config.nounLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingEntry?.label}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
