import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpenCheck, Brain, FileUp, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { type WriterSkill, writerSkillsApi } from "@/lib/api/writer-skills"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/dashboard/project/$projectId/settings")({
  component: ProjectSettingsRoute,
})

const BUILT_IN_SKILL_TRANSLATIONS: Record<string, { checklistItems: number; prefix: string }> = {
  "builtin-character-interaction-dynamics": {
    checklistItems: 4,
    prefix: "projects.detail.settings.builtIns.characterInteraction",
  },
  "builtin-parameterized-prose-practice": {
    checklistItems: 5,
    prefix: "projects.detail.settings.builtIns.parameterizedProse",
  },
  "builtin-stateful-chapter-continuity": {
    checklistItems: 4,
    prefix: "projects.detail.settings.builtIns.chapterContinuity",
  },
}

function localizeBuiltInSkill(
  skill: WriterSkill,
  locale: string,
  t: (key: string) => string
): WriterSkill {
  const translation = BUILT_IN_SKILL_TRANSLATIONS[skill.id]
  if (locale !== "zh-CN" || !skill.builtIn || !translation) {
    return skill
  }

  return {
    ...skill,
    name: t(`${translation.prefix}.name`),
    description: t(`${translation.prefix}.description`),
    instructions: t(`${translation.prefix}.instructions`),
    checklist: Array.from({ length: translation.checklistItems }, (_, index) =>
      t(`${translation.prefix}.checklist.${index + 1}`)
    ),
  }
}

function ProjectSettingsRoute() {
  const { projectId } = Route.useParams()
  return <WriterSkillsPage projectId={projectId} />
}

export function WriterSkillsPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const { locale, t } = useI18n()
  const [format, setFormat] = useState<"markdown" | "json">("markdown")
  const [content, setContent] = useState("")
  const [editingSkill, setEditingSkill] = useState<WriterSkill | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editInstructions, setEditInstructions] = useState("")
  const [editChecklist, setEditChecklist] = useState("")
  const queryKey = ["writer-skills", projectId]

  const skillsQuery = useQuery({
    queryKey,
    queryFn: () => writerSkillsApi.list(projectId),
  })
  const memoryQuery = useQuery({
    queryKey: [...queryKey, "memory"],
    queryFn: () => writerSkillsApi.memory(projectId),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey })

  const bindingMutation = useMutation({
    mutationFn: ({ skillId, enabled }: { skillId: string; enabled: boolean }) =>
      writerSkillsApi.setEnabled(projectId, skillId, enabled),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  })
  const importMutation = useMutation({
    mutationFn: () => writerSkillsApi.import(projectId, { content, format }),
    onSuccess: async ({ skill }) => {
      await writerSkillsApi.setEnabled(projectId, skill.id, true)
      setContent("")
      await refresh()
      toast.success(t("projects.detail.settings.feedback.imported"))
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (skillId: string) => writerSkillsApi.delete(projectId, skillId),
    onSuccess: async () => {
      await refresh()
      toast.success(t("projects.detail.settings.feedback.deleted"))
    },
    onError: (error) => toast.error(error.message),
  })
  const editMutation = useMutation({
    mutationFn: () => {
      if (!editingSkill) {
        throw new Error(t("projects.detail.settings.feedback.noSkillSelected"))
      }
      return writerSkillsApi.update(projectId, editingSkill.id, {
        name: editName,
        description: editDescription,
        instructions: editInstructions,
        checklist: editChecklist
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      })
    },
    onSuccess: async () => {
      setEditingSkill(null)
      await refresh()
      toast.success(t("projects.detail.settings.feedback.updated"))
    },
    onError: (error) => toast.error(error.message),
  })
  const learnMutation = useMutation({
    mutationFn: () => writerSkillsApi.learn(projectId),
    onSuccess: async () => {
      await refresh()
      toast.success(t("projects.detail.settings.feedback.learned"))
    },
    onError: (error) => toast.error(error.message),
  })

  const state = skillsQuery.data
  const memory = memoryQuery.data?.memory

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="font-semibold text-2xl">{t("projects.detail.settings.title")}</h2>
          <p className="text-muted-foreground">{t("projects.detail.settings.description")}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {t("projects.detail.settings.memory.title")}
                </CardTitle>
                <CardDescription>
                  {t("projects.detail.settings.memory.description")}
                </CardDescription>
              </div>
              <Button
                disabled={!state?.canManage || learnMutation.isPending}
                onClick={() => learnMutation.mutate()}
              >
                {learnMutation.isPending
                  ? t("projects.detail.settings.memory.learning")
                  : t("projects.detail.settings.memory.learn")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {memory ? (
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <MemoryItem
                  label={t("projects.detail.settings.memory.voice")}
                  value={memory.profile.voice}
                />
                <MemoryItem
                  label={t("projects.detail.settings.memory.sentenceRhythm")}
                  value={memory.profile.sentenceRhythm}
                />
                <MemoryItem
                  label={t("projects.detail.settings.memory.povTense")}
                  value={memory.profile.povTense}
                />
                <MemoryItem
                  label={t("projects.detail.settings.memory.dialogue")}
                  value={memory.profile.dialogue}
                />
                <MemoryItem
                  label={t("projects.detail.settings.memory.imagery")}
                  value={memory.profile.imagery}
                />
                <MemoryItem
                  label={t("projects.detail.settings.memory.pacing")}
                  value={memory.profile.pacing}
                />
                <div className="md:col-span-2">
                  <div className="font-medium">{t("projects.detail.settings.memory.avoid")}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {memory.profile.avoid.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground md:col-span-2">
                  {t("projects.detail.settings.memory.learnedFrom", {
                    chapters: memory.sourceChapterIds.length.toLocaleString(locale),
                    words: memory.sourceWordCount.toLocaleString(locale),
                    updatedAt: new Date(memory.updatedAt).toLocaleString(locale),
                  })}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("projects.detail.settings.memory.empty")}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {(state?.skills ?? []).map((skill) => {
            const displaySkill = localizeBuiltInSkill(skill, locale, t)

            return (
              <Card key={skill.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{displaySkill.name}</CardTitle>
                        <Badge variant={skill.builtIn ? "secondary" : "outline"}>
                          {skill.builtIn
                            ? t("projects.detail.settings.skills.builtIn")
                            : t("projects.detail.settings.skills.imported")}
                        </Badge>
                      </div>
                      <CardDescription>{displaySkill.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {!skill.builtIn && state?.canManage && (
                        <>
                          <Button
                            aria-label={t("projects.detail.settings.skills.editAria", {
                              name: displaySkill.name,
                            })}
                            onClick={() => {
                              setEditingSkill(skill)
                              setEditName(skill.name)
                              setEditDescription(skill.description ?? "")
                              setEditInstructions(skill.instructions)
                              setEditChecklist(skill.checklist.join("\n"))
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={t("projects.detail.settings.skills.deleteAria", {
                              name: displaySkill.name,
                            })}
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(skill.id)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Switch
                        checked={skill.binding?.enabled ?? false}
                        disabled={!state?.canManage || bindingMutation.isPending}
                        onCheckedChange={(enabled) =>
                          bindingMutation.mutate({ skillId: skill.id, enabled })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="whitespace-pre-wrap">{displaySkill.instructions}</p>
                  {displaySkill.checklist.length > 0 && (
                    <ul className="list-inside list-disc text-muted-foreground">
                      {displaySkill.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {(skill.sourceUrl || skill.sourceLicense) && (
                    <p className="text-muted-foreground text-xs">
                      {t("projects.detail.settings.skills.sourceLine", {
                        source: skill.sourceUrl || t("projects.detail.settings.skills.original"),
                        license: skill.sourceLicense || t("common.unknown"),
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {state?.canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                {t("projects.detail.settings.import.title")}
              </CardTitle>
              <CardDescription>{t("projects.detail.settings.import.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-48 space-y-2">
                <Label>{t("projects.detail.settings.import.format")}</Label>
                <Select
                  onValueChange={(value) => setFormat(value === "json" ? "json" : "markdown")}
                  value={format}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">
                      {t("projects.detail.settings.import.formatMarkdown")}
                    </SelectItem>
                    <SelectItem value="json">
                      {t("projects.detail.settings.import.formatJson")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                className="min-h-64 font-mono text-sm"
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  format === "markdown"
                    ? t("projects.detail.settings.import.placeholderMarkdown")
                    : t("projects.detail.settings.import.placeholderJson")
                }
                value={content}
              />
              <Input
                accept={
                  format === "markdown" ? ".md,.markdown,text/markdown" : ".json,application/json"
                }
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) {
                    return
                  }
                  setContent(await file.text())
                }}
                type="file"
              />
              <Button
                disabled={!content.trim() || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                <BookOpenCheck className="mr-2 h-4 w-4" />
                {importMutation.isPending
                  ? t("projects.detail.settings.import.importing")
                  : t("projects.detail.settings.import.button")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog onOpenChange={(open) => !open && setEditingSkill(null)} open={editingSkill !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projects.detail.settings.edit.title")}</DialogTitle>
            <DialogDescription>{t("projects.detail.settings.edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">{t("common.name")}</Label>
              <Input
                id="skill-name"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-description">{t("common.description")}</Label>
              <Textarea
                id="skill-description"
                onChange={(event) => setEditDescription(event.target.value)}
                value={editDescription}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-instructions">
                {t("projects.detail.settings.edit.instructions")}
              </Label>
              <Textarea
                className="min-h-40"
                id="skill-instructions"
                onChange={(event) => setEditInstructions(event.target.value)}
                value={editInstructions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-checklist">
                {t("projects.detail.settings.edit.checklist")}
              </Label>
              <Textarea
                id="skill-checklist"
                onChange={(event) => setEditChecklist(event.target.value)}
                value={editChecklist}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!(editName.trim() && editInstructions.trim()) || editMutation.isPending}
              onClick={() => editMutation.mutate()}
            >
              {editMutation.isPending
                ? t("common.saving")
                : t("projects.detail.settings.edit.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemoryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-medium">{label}</div>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  )
}
