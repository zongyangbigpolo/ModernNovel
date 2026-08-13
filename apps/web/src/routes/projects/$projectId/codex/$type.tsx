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
import { useI18n } from "@/lib/i18n"

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
  nounLabelLower: string
  title: string
  titleLower: string
}

interface CodexBinding {
  create: (values: CodexEntryValues, currentCount: number) => Promise<unknown>
  list: () => Promise<CodexEntry[]>
  remove: (id: string) => Promise<unknown>
  update: (id: string, values: CodexEntryValues) => Promise<unknown>
}

interface CodexConfigSpec {
  descriptionKey: string
  icon: typeof Users
  nameLabelKey: string
  nounKey: string
  titleKey: string
}

const CODEX_CONFIG: Record<string, CodexConfigSpec> = {
  characters: {
    titleKey: "codex.types.characters.title",
    descriptionKey: "codex.types.characters.description",
    icon: Users,
    nounKey: "codex.types.characters.singular",
    nameLabelKey: "common.name",
  },
  locations: {
    titleKey: "codex.types.locations.title",
    descriptionKey: "codex.types.locations.description",
    icon: MapPin,
    nounKey: "codex.types.locations.singular",
    nameLabelKey: "common.name",
  },
  lore: {
    titleKey: "codex.types.lore.title",
    descriptionKey: "codex.types.lore.description",
    icon: Scroll,
    nounKey: "codex.types.lore.singular",
    nameLabelKey: "codex.form.fields.title",
  },
  plot: {
    titleKey: "codex.types.plot.title",
    descriptionKey: "codex.types.plot.description",
    icon: FileText,
    nounKey: "codex.types.plot.singular",
    nameLabelKey: "codex.form.fields.title",
  },
}

const FALLBACK_CONFIG: CodexConfigSpec = {
  titleKey: "codex.types.unknown.title",
  descriptionKey: "codex.types.unknown.description",
  icon: FileText,
  nounKey: "codex.types.unknown.singular",
  nameLabelKey: "common.name",
}

function getCodexConfig(t: ReturnType<typeof useI18n>["t"], type: string): CodexConfig {
  const spec = CODEX_CONFIG[type] ?? FALLBACK_CONFIG
  const title = t(spec.titleKey)
  const nounLabel = t(spec.nounKey)

  return {
    title,
    titleLower: title.toLowerCase(),
    description: t(spec.descriptionKey),
    icon: spec.icon,
    nounLabel,
    nounLabelLower: nounLabel.toLowerCase(),
    nameLabel: t(spec.nameLabelKey),
  }
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
  const { t } = useI18n()
  const { type, projectId } = Route.useParams()
  const queryClient = useQueryClient()

  const config = getCodexConfig(t, type)
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
        throw new Error(t("codex.typePage.errors.unknownType"))
      }
      return binding.create(values, entries.length)
    },
    onSuccess: () => {
      invalidate()
      toast.success(t("codex.typePage.feedback.added", { noun: config.nounLabel }))
      setDialogOpen(false)
    },
    onError: (error) =>
      toast.error(
        t("codex.typePage.feedback.addFailed", {
          noun: config.nounLabelLower,
          message: error.message,
        })
      ),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CodexEntryValues }) => {
      if (!binding) {
        throw new Error(t("codex.typePage.errors.unknownType"))
      }
      return binding.update(id, values)
    },
    onSuccess: () => {
      invalidate()
      toast.success(t("codex.typePage.feedback.updated", { noun: config.nounLabel }))
      setEditingEntry(null)
    },
    onError: (error) =>
      toast.error(
        t("codex.typePage.feedback.updateFailed", {
          noun: config.nounLabelLower,
          message: error.message,
        })
      ),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!binding) {
        throw new Error(t("codex.typePage.errors.unknownType"))
      }
      return binding.remove(id)
    },
    onSuccess: () => {
      invalidate()
      toast.success(t("codex.typePage.feedback.deleted", { noun: config.nounLabel }))
      setDeletingEntry(null)
    },
    onError: (error) =>
      toast.error(
        t("codex.typePage.feedback.deleteFailed", {
          noun: config.nounLabelLower,
          message: error.message,
        })
      ),
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
              {t("codex.typePage.actions.add", { noun: config.nounLabel })}
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
                        aria-label={t("codex.typePage.aria.edit", { name: entry.label })}
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
                        aria-label={t("codex.typePage.aria.delete", { name: entry.label })}
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
                    {entry.description || t("codex.typePage.emptyDescriptionShort")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && binding && entries.length === 0 && (
          <div className="py-12 text-center">
            <IconComponent className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <h3 className="mb-2 font-medium text-xl">
              {t("codex.typePage.empty.title", { type: config.titleLower })}
            </h3>
            <p className="mb-6 text-muted-foreground">
              {t("codex.typePage.empty.description", { noun: config.nounLabelLower })}
            </p>
            <Button
              onClick={() => {
                setEditingEntry(null)
                setDialogOpen(true)
              }}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("codex.typePage.actions.add", { noun: config.nounLabel })}
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
            <AlertDialogTitle>
              {t("codex.typePage.delete.title", { noun: config.nounLabel })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("codex.typePage.delete.description.prefix")}{" "}
              <strong>{deletingEntry?.label}</strong>
              {t("codex.typePage.delete.description.suffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
            >
              {deleteMutation.isPending ? t("codex.typePage.delete.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
