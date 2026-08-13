import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, type Character, type Location, type LoreEntry, type PlotThread } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

// Define field types for dynamic form generation
type FieldType = "text" | "textarea" | "select" | "number"

interface CodexFormField {
  label: string
  name: string
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  type: FieldType
  validation?: z.ZodSchema<unknown>
}

type Translate = ReturnType<typeof useI18n>["t"]

const createCharacterFormConfig = (t: Translate): CodexFormField[] => [
  {
    name: "name",
    label: t("common.name"),
    type: "text",
    required: true,
    placeholder: t("codex.form.placeholders.characterName"),
    validation: z
      .string()
      .min(1, t("codex.form.validation.nameRequired"))
      .max(100, t("codex.form.validation.nameTooLong")),
  },
  {
    name: "role",
    label: t("codex.form.fields.role"),
    type: "select",
    placeholder: t("codex.form.placeholders.selectRole"),
    options: [
      { value: "protagonist", label: t("codex.form.options.roles.protagonist") },
      { value: "antagonist", label: t("codex.form.options.roles.antagonist") },
      { value: "supporting", label: t("codex.form.options.roles.supporting") },
      { value: "minor", label: t("codex.form.options.roles.minor") },
    ],
    validation: z
      .union([z.enum(["protagonist", "antagonist", "supporting", "minor"]), z.literal("")])
      .optional(),
  },
  {
    name: "description",
    label: t("common.description"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.characterDescription"),
    validation: z.string().optional(),
  },
  {
    name: "appearance",
    label: t("codex.form.fields.appearance"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.appearance"),
    validation: z.string().optional(),
  },
  {
    name: "personality",
    label: t("codex.form.fields.personality"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.personality"),
    validation: z.string().optional(),
  },
  {
    name: "backstory",
    label: t("codex.form.fields.backstory"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.backstory"),
    validation: z.string().optional(),
  },
  {
    name: "motivation",
    label: t("codex.form.fields.motivation"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.motivation"),
    validation: z.string().optional(),
  },
]

const createLocationFormConfig = (t: Translate): CodexFormField[] => [
  {
    name: "name",
    label: t("common.name"),
    type: "text",
    required: true,
    placeholder: t("codex.form.placeholders.locationName"),
    validation: z
      .string()
      .min(1, t("codex.form.validation.nameRequired"))
      .max(100, t("codex.form.validation.nameTooLong")),
  },
  {
    name: "type",
    label: t("common.type"),
    type: "select",
    placeholder: t("codex.form.placeholders.selectType"),
    options: [
      { value: "city", label: t("codex.form.options.locationTypes.city") },
      { value: "country", label: t("codex.form.options.locationTypes.country") },
      { value: "building", label: t("codex.form.options.locationTypes.building") },
      { value: "room", label: t("codex.form.options.locationTypes.room") },
      {
        value: "fantasy_realm",
        label: t("codex.form.options.locationTypes.fantasyRealm"),
      },
      { value: "planet", label: t("codex.form.options.locationTypes.planet") },
      { value: "dimension", label: t("codex.form.options.locationTypes.dimension") },
    ],
    validation: z
      .union([
        z.enum(["city", "country", "building", "room", "fantasy_realm", "planet", "dimension"]),
        z.literal(""),
      ])
      .optional(),
  },
  {
    name: "description",
    label: t("common.description"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.locationDescription"),
    validation: z.string().optional(),
  },
]

const createLoreFormConfig = (t: Translate): CodexFormField[] => [
  {
    name: "name",
    label: t("codex.form.fields.title"),
    type: "text",
    required: true,
    placeholder: t("codex.form.placeholders.loreTitle"),
    validation: z
      .string()
      .min(1, t("codex.form.validation.titleRequired"))
      .max(100, t("codex.form.validation.titleTooLong")),
  },
  {
    name: "type",
    label: t("common.type"),
    type: "select",
    placeholder: t("codex.form.placeholders.selectType"),
    options: [
      { value: "core_rule", label: t("codex.form.options.loreTypes.coreRule") },
      { value: "history", label: t("codex.form.options.loreTypes.history") },
      { value: "culture", label: t("codex.form.options.loreTypes.culture") },
      { value: "magic_system", label: t("codex.form.options.loreTypes.magicSystem") },
      { value: "technology", label: t("codex.form.options.loreTypes.technology") },
      { value: "religion", label: t("codex.form.options.loreTypes.religion") },
      { value: "politics", label: t("codex.form.options.loreTypes.politics") },
      { value: "custom", label: t("codex.form.options.common.custom") },
    ],
    validation: z.string().optional(),
  },
  {
    name: "description",
    label: t("common.description"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.loreDescription"),
    validation: z.string().optional(),
  },
]

const createPlotFormConfig = (t: Translate): CodexFormField[] => [
  {
    name: "title",
    label: t("codex.form.fields.title"),
    type: "text",
    required: true,
    placeholder: t("codex.form.placeholders.plotTitle"),
    validation: z
      .string()
      .min(1, t("codex.form.validation.titleRequired"))
      .max(100, t("codex.form.validation.titleTooLong")),
  },
  {
    name: "type",
    label: t("common.type"),
    type: "select",
    placeholder: t("codex.form.placeholders.selectType"),
    options: [
      {
        value: "inciting_incident",
        label: t("codex.form.options.plotTypes.incitingIncident"),
      },
      { value: "plot_point_1", label: t("codex.form.options.plotTypes.plotPoint1") },
      { value: "midpoint", label: t("codex.form.options.plotTypes.midpoint") },
      { value: "plot_point_2", label: t("codex.form.options.plotTypes.plotPoint2") },
      { value: "climax", label: t("codex.form.options.plotTypes.climax") },
      { value: "resolution", label: t("codex.form.options.plotTypes.resolution") },
      { value: "custom", label: t("codex.form.options.common.custom") },
    ],
    validation: z.string().optional(),
  },
  {
    name: "order",
    label: t("codex.form.fields.order"),
    type: "number",
    placeholder: t("codex.form.placeholders.plotOrder"),
    validation: z.number().int().positive(t("codex.form.validation.orderPositive")),
  },
  {
    name: "status",
    label: t("common.status"),
    type: "select",
    placeholder: t("codex.form.placeholders.selectStatus"),
    options: [
      { value: "planned", label: t("codex.form.options.plotStatuses.planned") },
      { value: "in_progress", label: t("codex.form.options.plotStatuses.inProgress") },
      { value: "completed", label: t("codex.form.options.plotStatuses.completed") },
    ],
    validation: z
      .union([z.enum(["planned", "in_progress", "completed"]), z.literal("")])
      .optional(),
  },
  {
    name: "description",
    label: t("common.description"),
    type: "textarea",
    placeholder: t("codex.form.placeholders.plotDescription"),
    validation: z.string().optional(),
  },
]

// Create dynamic schema from form config
const createDynamicSchema = (fields: CodexFormField[]) => {
  const schemaFields: Record<string, z.ZodSchema<unknown>> = {}

  for (const field of fields) {
    if (field.validation) {
      schemaFields[field.name] = field.validation
    } else {
      schemaFields[field.name] = z.string().optional()
    }
  }

  return z.object(schemaFields)
}

const getFormConfig = (entryType: "characters" | "locations" | "lore" | "plot", t: Translate) => {
  switch (entryType) {
    case "characters":
      return createCharacterFormConfig(t)
    case "locations":
      return createLocationFormConfig(t)
    case "lore":
      return createLoreFormConfig(t)
    case "plot":
      return createPlotFormConfig(t)
    default:
      throw new Error(t("codex.form.errors.formNotImplemented", { type: entryType }))
  }
}

const getEntryLabel = (entryType: "characters" | "locations" | "lore" | "plot", t: Translate) => {
  switch (entryType) {
    case "characters":
      return t("codex.types.characters.singular").toLowerCase()
    case "locations":
      return t("codex.types.locations.singular").toLowerCase()
    case "lore":
      return t("codex.types.lore.singular").toLowerCase()
    case "plot":
      return t("codex.types.plot.singular").toLowerCase()
    default:
      return t("codex.types.unknown.singular").toLowerCase()
  }
}

interface DynamicCodexFormProps {
  entry: Character | Location | LoreEntry | PlotThread
  entryType: "characters" | "locations" | "lore" | "plot"
  onCancel: () => void
  onSave: () => void
  projectId: string
}

// Create default values from entry data
const createDefaultValues = (
  entryData: Character | Location | LoreEntry | PlotThread,
  fields: CodexFormField[]
) => {
  const defaults: Record<string, unknown> = {}
  for (const field of fields) {
    const value = (entryData as unknown as Record<string, unknown>)[field.name]
    // For select fields, preserve null/undefined as empty string to allow clearing
    defaults[field.name] = value ?? ""
  }
  return defaults
}

export function DynamicCodexForm({
  entry,
  projectId,
  entryType,
  onSave,
  onCancel,
}: DynamicCodexFormProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const formConfig = useMemo(() => getFormConfig(entryType, t), [entryType, t])
  const schema = useMemo(() => createDynamicSchema(formConfig), [formConfig])
  const defaultValues = useMemo(() => createDefaultValues(entry, formConfig), [entry, formConfig])
  const entryLabel = useMemo(() => getEntryLabel(entryType, t), [entryType, t])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>): Promise<unknown> => {
      if (entryType === "characters") {
        return api.characters.update(projectId, entry.id, data)
      }
      if (entryType === "locations") {
        return api.locations.update(projectId, entry.id, data)
      }
      if (entryType === "lore") {
        return api.lore.update(projectId, entry.id, data)
      }
      if (entryType === "plot") {
        return api.plot.update(projectId, entry.id, data)
      }
      throw new Error(t("codex.form.errors.updateNotImplemented", { type: entryType }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entryType, projectId] })
      toast.success(t("codex.form.feedback.updated", { noun: entryLabel }))
      onSave()
    },
    onError: (error) => {
      toast.error(
        t("codex.form.feedback.updateFailed", { noun: entryLabel, message: error.message })
      )
    },
  })

  const onSubmit = (data: Record<string, unknown>) => {
    updateMutation.mutate(data)
  }

  const renderField = (field: CodexFormField) => {
    switch (field.type) {
      case "text":
        return (
          <FormField
            control={form.control}
            key={field.name}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && "*"}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "textarea":
        return (
          <FormField
            control={form.control}
            key={field.name}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && "*"}
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[80px]"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "select":
        return (
          <FormField
            control={form.control}
            key={field.name}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && "*"}
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    formField.onChange(value === "clear" ? "" : value)
                  }}
                  value={(formField.value as string) || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!field.required && (
                      <SelectItem value="clear">
                        <span className="text-muted-foreground italic">
                          {t("codex.form.clearSelection")}
                        </span>
                      </SelectItem>
                    )}
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "number":
        return (
          <FormField
            control={form.control}
            key={field.name}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && "*"}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder}
                    type="number"
                    {...formField}
                    onChange={(e) => {
                      const value = e.target.value
                      formField.onChange(value === "" ? null : Number.parseInt(value, 10))
                    }}
                    value={(formField.value as number | null) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">{formConfig.map((field) => renderField(field))}</div>

        <div className="flex justify-end gap-2">
          <Button
            disabled={updateMutation.isPending}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            {t("common.cancel")}
          </Button>
          <Button disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? t("common.saving") : t("codex.form.saveChanges")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
