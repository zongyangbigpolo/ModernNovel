import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import z from "zod"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"
import Loader from "./loader"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const { t } = useI18n()
  const navigate = useNavigate({
    from: "/",
  })
  const queryClient = useQueryClient()
  const { isPending } = authClient.useSession()

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.signIn.email(
          {
            email: value.email,
            password: value.password,
          },
          {
            onError: (error) => {
              toast.error(error.error.message)
            },
          }
        )

        const isSuccess =
          result &&
          ((typeof result === "object" && "user" in result && result.user) ||
            (typeof result === "object" &&
              "data" in result &&
              typeof result.data === "object" &&
              result.data &&
              "user" in result.data &&
              result.data.user) ||
            (result && typeof result === "object" && !("error" in result)))

        if (isSuccess) {
          toast.success(t("auth.feedback.signInSuccess"))

          const fetchSessionData = async () => {
            const baseUrl =
              import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
                ? import.meta.env.VITE_SERVER_URL
                : window.location.origin

            const response = await fetch(`${baseUrl}/api/session`, {
              credentials: "include",
            })

            if (!response.ok) {
              throw new Error("Failed to fetch session")
            }

            return response.json()
          }

          try {
            await new Promise((resolve) => setTimeout(resolve, 200))
            const sessionData = await fetchSessionData()

            if (sessionData?.authenticated) {
              queryClient.setQueryData(["session"], sessionData)
              await queryClient.invalidateQueries({ queryKey: ["session"] })
              await queryClient.refetchQueries({
                queryKey: ["session"],
                type: "all",
              })

              await new Promise((resolve) => setTimeout(resolve, 100))

              navigate({
                to: "/dashboard",
              })
            } else {
              toast.error(t("auth.feedback.signInSessionNotEstablished"))
            }
          } catch {
            toast.error(t("auth.feedback.signInFailedRetry"))
          }
        } else {
          toast.error(t("auth.feedback.signInInvalidCredentials"))
        }
      } catch {
        toast.error(t("auth.feedback.signInFailed"))
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email(t("auth.validation.invalidEmail")),
        password: z.string().min(6, t("auth.validation.passwordMinSix")),
      }),
    },
  })

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center font-bold text-3xl">{t("auth.signInForm.title")}</h1>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{t("auth.fields.email")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="email"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-red-500" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{t("auth.fields.password")}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="password"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-red-500" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
              type="submit"
            >
              {state.isSubmitting ? t("auth.signInForm.submitting") : t("auth.signInForm.submit")}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={onSwitchToSignUp}
          variant="link"
        >
          {t("auth.signInForm.switchPrompt")}
        </Button>
      </div>
    </div>
  )
}
