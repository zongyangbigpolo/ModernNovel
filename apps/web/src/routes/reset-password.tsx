import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"

interface ResetPasswordSearch {
  error: string
  token: string
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : "",
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { t } = useI18n()
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const linkInvalid = Boolean(error) || !token

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) {
      return
    }
    if (password.length < 6) {
      toast.error(t("auth.validation.passwordMinSix"))
      return
    }
    if (password !== confirm) {
      toast.error(t("auth.feedback.passwordsDontMatch"))
      return
    }
    setSubmitting(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        toast.error(result.error.message || t("auth.feedback.resetPasswordFailed"))
        return
      }
      toast.success(t("auth.feedback.resetPasswordSuccess"))
      navigate({ to: "/login" })
    } catch {
      toast.error(t("auth.feedback.resetPasswordFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">{t("auth.resetPassword.title")}</h1>
        </div>

        {linkInvalid ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border bg-muted/30 p-4 text-sm">
              {t("auth.resetPassword.invalidLink")}
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">{t("auth.resetPassword.requestNewLink")}</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("auth.fields.newPassword")}</Label>
              <Input
                id="new-password"
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                value={password}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("auth.fields.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                value={confirm}
              />
            </div>
            <Button
              className="w-full"
              disabled={!(password && confirm) || submitting}
              type="submit"
            >
              {submitting
                ? t("auth.resetPassword.updating")
                : t("auth.resetPassword.updatePassword")}
            </Button>
          </form>
        )}

        <p className="text-center text-muted-foreground text-sm">
          <Link className="underline-offset-4 hover:text-primary hover:underline" to="/login">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  )
}
