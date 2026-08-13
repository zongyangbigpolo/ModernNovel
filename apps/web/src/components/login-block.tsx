import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient, fetchSessionData } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"

interface LoginBlockProps {
  mode: "signin" | "signup"
  onModeChange: (mode: "signin" | "signup") => void
}

export default function LoginBlock({ mode, onModeChange }: LoginBlockProps) {
  const navigate = useNavigate({ from: "/login" })
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [showPassword, setShowPassword] = useState(false)
  const { isPending } = authClient.useSession()
  const isSignIn = mode === "signin"
  const getSubmitLabel = (isSubmitting: boolean) => {
    if (isSubmitting) {
      return t("auth.loginBlock.processing")
    }

    return isSignIn ? t("auth.signIn") : t("auth.loginBlock.createAccount")
  }
  const failedMessage = isSignIn ? t("auth.feedback.signInFailed") : t("auth.feedback.signUpFailed")
  const successMessage = isSignIn
    ? t("auth.feedback.signInSuccess")
    : t("auth.feedback.signUpSuccess")
  const credentialsMessage = isSignIn
    ? t("auth.feedback.signInInvalidCredentials")
    : t("auth.feedback.signUpFailedCheckCredentials")

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = isSignIn
          ? await authClient.signIn.email({
              email: value.email,
              password: value.password,
            })
          : await authClient.signUp.email({
              email: value.email,
              password: value.password,
              name: value.email.split("@")[0] || t("auth.loginBlock.defaultWriterName"),
            })

        if (result.error) {
          toast.error(result.error.message || failedMessage)
          return
        }

        const sessionData = await fetchSessionData()

        if (sessionData?.authenticated && sessionData?.session?.user) {
          toast.success(successMessage)
          queryClient.setQueryData(["session"], sessionData)
          await queryClient.invalidateQueries({ queryKey: ["session"] })
          navigate({ to: "/dashboard" })
        } else {
          toast.error(credentialsMessage)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : failedMessage)
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const schema = z.object({
          email: z.string().email(t("auth.validation.invalidEmail")),
          password: isSignIn
            ? z.string().min(1, t("auth.validation.passwordRequired"))
            : z.string().min(6, t("auth.validation.passwordMinSix")),
        })

        const result = schema.safeParse(value)
        if (!result.success) {
          return result.error.flatten()
        }
      },
    },
  })

  if (isPending) {
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center px-4 py-6">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] w-full items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center">
            <h1 className="font-semibold text-xl tracking-tight">
              {isSignIn ? t("auth.loginBlock.titleSignIn") : t("auth.loginBlock.titleSignUp")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isSignIn
                ? t("auth.loginBlock.descriptionSignIn")
                : t("auth.loginBlock.descriptionSignUp")}
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">
                {isSignIn ? t("auth.signIn") : t("auth.signUp")}
              </CardTitle>
              <CardDescription>
                {isSignIn
                  ? t("auth.loginBlock.cardDescriptionSignIn")
                  : t("auth.loginBlock.cardDescriptionSignUp")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <div className="space-y-2">
                  <form.Field name="email">
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>{t("auth.fields.email")}</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={t("auth.placeholders.email")}
                          type="email"
                          value={field.state.value}
                        />
                        {field.state.meta.errors.map((error) => (
                          <p className="text-destructive text-sm" key={String(error)}>
                            {String(error)}
                          </p>
                        ))}
                      </>
                    )}
                  </form.Field>
                </div>

                <div className="space-y-2">
                  <form.Field name="password">
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>{t("auth.fields.password")}</Label>
                        <div className="relative">
                          <Input
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder={t("auth.placeholders.password")}
                            type={showPassword ? "text" : "password"}
                            value={field.state.value}
                          />
                          <Button
                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {field.state.meta.errors.map((error) => (
                          <p className="text-destructive text-sm" key={String(error)}>
                            {String(error)}
                          </p>
                        ))}
                      </>
                    )}
                  </form.Field>
                </div>

                {isSignIn && (
                  <div className="text-right">
                    <Link
                      className="text-muted-foreground text-sm underline-offset-4 hover:text-primary hover:underline"
                      to="/forgot-password"
                    >
                      {t("auth.loginBlock.forgotPassword")}
                    </Link>
                  </div>
                )}

                <form.Subscribe>
                  {(state) => (
                    <Button
                      className="w-full"
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {getSubmitLabel(state.isSubmitting)}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm">
            {isSignIn ? (
              <>
                {t("auth.loginBlock.noAccountPrompt")}{" "}
                <Button
                  className="h-auto p-0 font-semibold"
                  onClick={() => onModeChange("signup")}
                  variant="link"
                >
                  {t("auth.signUp")}
                </Button>
              </>
            ) : (
              <>
                {t("auth.loginBlock.alreadyHaveAccountPrompt")}{" "}
                <Button
                  className="h-auto p-0 font-semibold"
                  onClick={() => onModeChange("signin")}
                  variant="link"
                >
                  {t("auth.signIn")}
                </Button>
              </>
            )}
          </div>

          <p className="px-2 text-center text-muted-foreground text-sm">
            {t("auth.loginBlock.termsPrefix")}{" "}
            <Link className="underline underline-offset-4 hover:text-primary" to="/terms">
              {t("auth.loginBlock.termsOfService")}
            </Link>{" "}
            {t("auth.loginBlock.termsAnd")}{" "}
            <Link className="underline underline-offset-4 hover:text-primary" to="/privacy">
              {t("auth.loginBlock.privacyPolicy")}
            </Link>
            {t("auth.loginBlock.termsSuffix")}
          </p>
        </div>
      </div>
    </div>
  )
}
