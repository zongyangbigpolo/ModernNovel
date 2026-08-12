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

export const Route = createFileRoute("/dashboard/project/$projectId/settings")({
  component: ProjectSettingsPage,
})

function ProjectSettingsPage() {
  const { projectId } = Route.useParams()
  const queryClient = useQueryClient()
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
      toast.success("Writer Skill imported")
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (skillId: string) => writerSkillsApi.delete(projectId, skillId),
    onSuccess: async () => {
      await refresh()
      toast.success("Writer Skill deleted")
    },
    onError: (error) => toast.error(error.message),
  })
  const editMutation = useMutation({
    mutationFn: () => {
      if (!editingSkill) {
        throw new Error("No Writer Skill selected")
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
      toast.success("Writer Skill updated")
    },
    onError: (error) => toast.error(error.message),
  })
  const learnMutation = useMutation({
    mutationFn: () => writerSkillsApi.learn(projectId),
    onSuccess: async () => {
      await refresh()
      toast.success("Project style memory updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const state = skillsQuery.data

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="font-semibold text-2xl">Writer Skills</h2>
          <p className="text-muted-foreground">
            Skills and learned style memory are attached to this novel and applied to every future
            AI conversation.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Persistent style memory
                </CardTitle>
                <CardDescription>
                  Analyze a bounded sample of the manuscript and remember its voice, rhythm,
                  viewpoint, dialogue, imagery, and pacing.
                </CardDescription>
              </div>
              <Button
                disabled={!state?.canManage || learnMutation.isPending}
                onClick={() => learnMutation.mutate()}
              >
                {learnMutation.isPending ? "Learning..." : "Learn from manuscript"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {memoryQuery.data?.memory ? (
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <MemoryItem label="Voice" value={memoryQuery.data.memory.profile.voice} />
                <MemoryItem
                  label="Sentence rhythm"
                  value={memoryQuery.data.memory.profile.sentenceRhythm}
                />
                <MemoryItem
                  label="Point of view and tense"
                  value={memoryQuery.data.memory.profile.povTense}
                />
                <MemoryItem label="Dialogue" value={memoryQuery.data.memory.profile.dialogue} />
                <MemoryItem label="Imagery" value={memoryQuery.data.memory.profile.imagery} />
                <MemoryItem label="Pacing" value={memoryQuery.data.memory.profile.pacing} />
                <div className="md:col-span-2">
                  <div className="font-medium">Avoid</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {memoryQuery.data.memory.profile.avoid.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground md:col-span-2">
                  Learned from {memoryQuery.data.memory.sourceChapterIds.length} chapter(s) and{" "}
                  {memoryQuery.data.memory.sourceWordCount.toLocaleString()} words, updated{" "}
                  {new Date(memoryQuery.data.memory.updatedAt).toLocaleString()}.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No style memory yet. Write some chapters, configure an AI Provider, then run
                learning.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {(state?.skills ?? []).map((skill) => (
            <Card key={skill.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      <Badge variant={skill.builtIn ? "secondary" : "outline"}>
                        {skill.builtIn ? "Built in" : "Imported"}
                      </Badge>
                    </div>
                    <CardDescription>{skill.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {!skill.builtIn && state?.canManage && (
                      <>
                        <Button
                          aria-label={`Edit ${skill.name}`}
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
                          aria-label={`Delete ${skill.name}`}
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
                <p className="whitespace-pre-wrap">{skill.instructions}</p>
                {skill.checklist.length > 0 && (
                  <ul className="list-inside list-disc text-muted-foreground">
                    {skill.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {(skill.sourceUrl || skill.sourceLicense) && (
                  <p className="text-muted-foreground text-xs">
                    Source: {skill.sourceUrl || "Original"} · License:{" "}
                    {skill.sourceLicense || "Unknown"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {state?.canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Import a Writer Skill
              </CardTitle>
              <CardDescription>
                Import concise methods, structural rules, and checklists—not full novels or
                copyrighted passages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-48 space-y-2">
                <Label>Format</Label>
                <Select
                  onValueChange={(value) => setFormat(value === "json" ? "json" : "markdown")}
                  value={format}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                className="min-h-64 font-mono text-sm"
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  format === "markdown"
                    ? "# Skill name\n\nDescription\n\n## Instructions\n...\n\n## Checklist\n- ..."
                    : '{\n  "name": "Skill name",\n  "description": "...",\n  "instructions": "...",\n  "checklist": []\n}'
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
                {importMutation.isPending ? "Importing..." : "Import and enable"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog onOpenChange={(open) => !open && setEditingSkill(null)} open={editingSkill !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Writer Skill</DialogTitle>
            <DialogDescription>
              Changes affect every future AI conversation for projects using this skill.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-description">Description</Label>
              <Textarea
                id="skill-description"
                onChange={(event) => setEditDescription(event.target.value)}
                value={editDescription}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-instructions">Instructions</Label>
              <Textarea
                className="min-h-40"
                id="skill-instructions"
                onChange={(event) => setEditInstructions(event.target.value)}
                value={editInstructions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-checklist">Checklist, one item per line</Label>
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
              {editMutation.isPending ? "Saving..." : "Save changes"}
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
