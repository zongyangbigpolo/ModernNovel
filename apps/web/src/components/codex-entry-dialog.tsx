import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"

export interface CodexEntryValues {
  description: string
  name: string
}

interface CodexEntryDialogProps {
  initialDescription?: string
  initialName?: string
  isSaving: boolean
  mode: "create" | "edit"
  nameLabel: string
  nounLabel: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CodexEntryValues) => void
  open: boolean
}

/**
 * Shared create/edit dialog for the codex entities (characters, locations,
 * lore, plot threads). They all reduce to a name/title plus a description, so a
 * single controlled form drives every type — the parent owns the mutation and
 * maps the values onto the right API client.
 */
export function CodexEntryDialog({
  open,
  onOpenChange,
  mode,
  nounLabel,
  nameLabel,
  initialName = "",
  initialDescription = "",
  isSaving,
  onSubmit,
}: CodexEntryDialogProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)

  // Reseed the fields whenever the dialog opens for a different entry.
  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialDescription)
    }
  }, [open, initialName, initialDescription])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !isSaving

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) {
      return
    }
    onSubmit({ name: trimmedName, description: description.trim() })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Add ${nounLabel}` : `Edit ${nounLabel}`}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? `Add a new ${nounLabel.toLowerCase()} to your story's codex.`
              : `Update this ${nounLabel.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="codex-entry-name">{nameLabel} *</Label>
            <Input
              autoFocus
              id="codex-entry-name"
              onChange={(event) => setName(event.target.value)}
              placeholder={`${nameLabel}`}
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codex-entry-description">Description</Label>
            <Textarea
              className="min-h-[120px]"
              id="codex-entry-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={`Describe this ${nounLabel.toLowerCase()}…`}
              value={description}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!canSave} type="submit">
              {(() => {
                if (isSaving) {
                  return "Saving…"
                }
                return mode === "create" ? `Add ${nounLabel}` : "Save changes"
              })()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
