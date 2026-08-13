import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"

interface ConfirmDialogProps {
  cancelText?: string
  children: React.ReactNode
  confirmText?: string
  description: string
  disabled?: boolean
  onConfirm: () => void
  title: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText,
  variant = "default",
  onConfirm,
  children,
  disabled = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild disabled={disabled}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">
            {cancelText ?? t("confirmDialog.defaultCancel")}
          </Button>
          <Button onClick={handleConfirm} variant={variant}>
            {confirmText ?? t("confirmDialog.defaultConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
