import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || submitting) {
      return
    }
    setSubmitting(true)
    try {
      await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      })
    } finally {
      setSubmitted(true)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">{t("auth.forgotPassword.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.forgotPassword.description")}</p>
        </div>

        {submitted ? (
          <p className="rounded-lg border bg-muted/30 p-4 text-center text-sm">
            {t("auth.forgotPassword.successMessage", { email })}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.fields.email")}</Label>
              <Input
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.placeholders.email")}
                type="email"
                value={email}
              />
            </div>
            <Button className="w-full" disabled={!email.trim() || submitting} type="submit">
              {submitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendLink")}
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
