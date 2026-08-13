import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api, type Character } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const createCharacterSchema = (t: ReturnType<typeof useI18n>["t"]) =>
  z.object({
    name: z
      .string()
      .min(1, t("codex.character.validation.nameRequired"))
      .max(100, t("codex.character.validation.nameTooLong")),
    description: z.string().optional(),
    // role field removed - users can describe character roles freely in description
    // appearance, personality, backstory, motivation removed - simplified to just name and description
  })

type CharacterFormData = z.infer<ReturnType<typeof createCharacterSchema>>

interface CharacterDialogProps {
  character?: Character | null
  mode: "create" | "edit"
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export function CharacterDialog({
  open,
  onOpenChange,
  projectId,
  character,
  mode,
}: CharacterDialogProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const characterSchema = useMemo(() => createCharacterSchema(t), [t])

  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: character?.name || "",
      description: character?.description || "",
      // role field removed
      // appearance, personality, backstory, motivation removed - simplified to just name and description
    },
  })

  // Reset form when character or mode changes
  useEffect(() => {
    form.reset({
      name: character?.name || "",
      description: character?.description || "",
      // role field removed
      // appearance, personality, backstory, motivation removed - simplified to just name and description
    })
  }, [character, form])

  const createCharacterMutation = useMutation({
    mutationFn: (data: CharacterFormData) => api.characters.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
      toast.success(t("codex.character.feedback.created"))
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(t("codex.character.feedback.createFailed", { message: error.message }))
    },
  })

  const updateCharacterMutation = useMutation({
    mutationFn: (data: CharacterFormData) => {
      if (!character?.id) {
        throw new Error(t("codex.character.errors.missingId"))
      }
      return api.characters.update(projectId, character.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
      toast.success(t("codex.character.feedback.updated"))
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t("codex.character.feedback.updateFailed", { message: error.message }))
    },
  })

  const onSubmit = (data: CharacterFormData) => {
    if (mode === "create") {
      createCharacterMutation.mutate(data)
    } else {
      updateCharacterMutation.mutate(data)
    }
  }

  const isLoading = createCharacterMutation.isPending || updateCharacterMutation.isPending

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("codex.character.dialog.title.create")
              : t("codex.character.dialog.title.edit", { name: character?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("codex.character.dialog.description.create")
              : t("codex.character.dialog.description.edit")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="character_name"
                      placeholder={t("codex.character.placeholder.name")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[80px]"
                      placeholder={t("codex.character.placeholder.description")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Appearance, personality, backstory, motivation fields removed - simplified to just name and description */}

            <DialogFooter>
              <Button
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={isLoading} type="submit">
                {(() => {
                  if (isLoading) {
                    return t("common.saving")
                  }
                  return mode === "create"
                    ? t("codex.character.actions.create")
                    : t("codex.character.actions.update")
                })()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
