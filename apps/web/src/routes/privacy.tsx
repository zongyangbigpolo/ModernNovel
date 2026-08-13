import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/privacy")({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useI18n()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button asChild className="mb-4" variant="ghost">
          <Link className="flex items-center gap-2" to="/">
            <ArrowLeft className="h-4 w-4" />
            {t("legal.privacy.backToHome")}
          </Link>
        </Button>
        <h1 className="mb-2 font-bold text-3xl">{t("legal.privacy.title")}</h1>
        <p className="text-muted-foreground">
          {t("legal.privacy.lastUpdated")} {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.introduction.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.introduction.body")}</p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.collect.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <h3>{t("legal.privacy.collect.personalTitle")}</h3>
            <ul>
              <li>{t("legal.privacy.collect.personal.email")}</li>
              <li>{t("legal.privacy.collect.personal.name")}</li>
              <li>{t("legal.privacy.collect.personal.content")}</li>
            </ul>

            <h3>{t("legal.privacy.collect.autoTitle")}</h3>
            <ul>
              <li>{t("legal.privacy.collect.auto.usage")}</li>
              <li>{t("legal.privacy.collect.auto.device")}</li>
              <li>{t("legal.privacy.collect.auto.ip")}</li>
              <li>{t("legal.privacy.collect.auto.cookies")}</li>
            </ul>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.use.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.use.intro")}</p>
            <ul>
              <li>{t("legal.privacy.use.items.platform")}</li>
              <li>{t("legal.privacy.use.items.auth")}</li>
              <li>{t("legal.privacy.use.items.sync")}</li>
              <li>{t("legal.privacy.use.items.ai")}</li>
              <li>{t("legal.privacy.use.items.analytics")}</li>
              <li>{t("legal.privacy.use.items.communicate")}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Storage and Security */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.security.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.security.p1")}</p>
            <p>{t("legal.privacy.security.p2")}</p>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.sharing.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.sharing.p1")}</p>
            <ul>
              <li>{t("legal.privacy.sharing.items.consent")}</li>
              <li>{t("legal.privacy.sharing.items.legal")}</li>
              <li>{t("legal.privacy.sharing.items.rights")}</li>
              <li>{t("legal.privacy.sharing.items.transfer")}</li>
            </ul>
            <p>{t("legal.privacy.sharing.p2")}</p>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.rights.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.rights.intro")}</p>
            <ul>
              <li>{t("legal.privacy.rights.items.access")}</li>
              <li>{t("legal.privacy.rights.items.correct")}</li>
              <li>{t("legal.privacy.rights.items.delete")}</li>
              <li>{t("legal.privacy.rights.items.export")}</li>
              <li>{t("legal.privacy.rights.items.marketing")}</li>
              <li>{t("legal.privacy.rights.items.withdraw")}</li>
            </ul>
            <p>{t("legal.privacy.rights.p2")}</p>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.cookies.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.cookies.p1")}</p>
            <p>{t("legal.privacy.cookies.p2")}</p>
          </CardContent>
        </Card>

        {/* Open Source */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.openSource.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.openSource.p1")}</p>
            <p>
              {t("legal.privacy.openSource.p2Prefix")}
              <a
                className="text-primary hover:underline"
                href="https://github.com/ilrein/openwrite"
                rel="noopener noreferrer"
                target="_blank"
              >
                github.com/ilrein/openwrite
              </a>
              {t("legal.privacy.openSource.p2Suffix")}
            </p>
          </CardContent>
        </Card>

        {/* Changes to Policy */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.changes.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.changes.p1")}</p>
            <p>{t("legal.privacy.changes.p2")}</p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.privacy.contact.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.privacy.contact.intro")}</p>
            <ul>
              <li>
                {t("legal.privacy.contact.githubIssues")}{" "}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/ilrein/openwrite/issues"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  github.com/ilrein/openwrite/issues
                </a>
              </li>
              <li>{t("legal.privacy.contact.email")} zongyangpolo@gmail.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
