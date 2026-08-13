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
import { api, type Location } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const createLocationSchema = (t: ReturnType<typeof useI18n>["t"]) =>
  z.object({
    name: z
      .string()
      .min(1, t("codex.location.validation.nameRequired"))
      .max(100, t("codex.location.validation.nameTooLong")),
    description: z.string().optional(),
    // type field removed - users can describe location types freely in description
    parentLocationId: z.string().optional(),
    image: z.string().optional(),
  })

type LocationFormData = z.infer<ReturnType<typeof createLocationSchema>>

interface LocationDialogProps {
  location?: Location | null
  mode: "create" | "edit"
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export function LocationDialog({
  open,
  onOpenChange,
  projectId,
  location,
  mode,
}: LocationDialogProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const locationSchema = useMemo(() => createLocationSchema(t), [t])

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name || "",
      description: location?.description || "",
      // type field removed
      parentLocationId: location?.parentLocationId || "",
      image: location?.image || "",
    },
  })

  // Reset form when location or mode changes
  useEffect(() => {
    form.reset({
      name: location?.name || "",
      description: location?.description || "",
      // type field removed
      parentLocationId: location?.parentLocationId || "",
      image: location?.image || "",
    })
  }, [location, form])

  const createLocationMutation = useMutation({
    mutationFn: (data: LocationFormData) => api.locations.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations", projectId] })
      toast.success(t("codex.location.feedback.created"))
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(t("codex.location.feedback.createFailed", { message: error.message }))
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: (data: LocationFormData) => {
      if (!location?.id) {
        throw new Error(t("codex.location.errors.missingId"))
      }
      return api.locations.update(projectId, location.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations", projectId] })
      toast.success(t("codex.location.feedback.updated"))
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t("codex.location.feedback.updateFailed", { message: error.message }))
    },
  })

  const onSubmit = (data: LocationFormData) => {
    if (mode === "create") {
      createLocationMutation.mutate(data)
    } else {
      updateLocationMutation.mutate(data)
    }
  }

  const isLoading = createLocationMutation.isPending || updateLocationMutation.isPending

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("codex.location.dialog.title.create")
              : t("codex.location.dialog.title.edit", { name: location?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("codex.location.dialog.description.create")
              : t("codex.location.dialog.description.edit")}
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
                      name="location_name"
                      placeholder={t("codex.location.placeholder.name")}
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
                      className="min-h-[100px]"
                      placeholder={t("codex.location.placeholder.description")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("codex.location.fields.parentLocation")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("codex.location.placeholder.parentLocation")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("codex.location.fields.imageUrl")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("codex.location.placeholder.imageUrl")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    ? t("codex.location.actions.create")
                    : t("codex.location.actions.update")
                })()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
