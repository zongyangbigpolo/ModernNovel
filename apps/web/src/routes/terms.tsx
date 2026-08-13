import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/terms")({
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
            {t("legal.terms.backToHome")}
          </Link>
        </Button>
        <h1 className="mb-2 font-bold text-3xl">{t("legal.terms.title")}</h1>
        <p className="text-muted-foreground">
          {t("legal.terms.lastUpdated")} {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.introduction.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.introduction.p1")}</p>
            <p>{t("legal.terms.introduction.p2")}</p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.acceptance.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.acceptance.p1")}</p>
            <p>{t("legal.terms.acceptance.p2")}</p>
          </CardContent>
        </Card>

        {/* Description of Service */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.service.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.service.intro")}</p>
            <ul>
              <li>{t("legal.terms.service.items.richText")}</li>
              <li>{t("legal.terms.service.items.ai")}</li>
              <li>{t("legal.terms.service.items.storage")}</li>
              <li>{t("legal.terms.service.items.export")}</li>
              <li>{t("legal.terms.service.items.analytics")}</li>
            </ul>
            <p>{t("legal.terms.service.p2")}</p>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.accounts.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.accounts.intro")}</p>
            <ul>
              <li>{t("legal.terms.accounts.items.credentials")}</li>
              <li>{t("legal.terms.accounts.items.activities")}</li>
              <li>{t("legal.terms.accounts.items.accurate")}</li>
              <li>{t("legal.terms.accounts.items.notify")}</li>
            </ul>
            <p>{t("legal.terms.accounts.p2")}</p>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.acceptable.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.acceptable.intro")}</p>
            <ul>
              <li>{t("legal.terms.acceptable.items.laws")}</li>
              <li>{t("legal.terms.acceptable.items.ip")}</li>
              <li>{t("legal.terms.acceptable.items.harmful")}</li>
              <li>{t("legal.terms.acceptable.items.access")}</li>
              <li>{t("legal.terms.acceptable.items.malware")}</li>
              <li>{t("legal.terms.acceptable.items.spam")}</li>
              <li>{t("legal.terms.acceptable.items.commercial")}</li>
            </ul>
            <p>{t("legal.terms.acceptable.p2")}</p>
          </CardContent>
        </Card>

        {/* Content Ownership and License */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.ownership.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <h3>{t("legal.terms.ownership.yourContentTitle")}</h3>
            <p>{t("legal.terms.ownership.yourContentBody")}</p>

            <h3>{t("legal.terms.ownership.ourContentTitle")}</h3>
            <p>{t("legal.terms.ownership.ourContentBody")}</p>

            <h3>{t("legal.terms.ownership.openSourceTitle")}</h3>
            <p>
              {t("legal.terms.ownership.openSourceBodyPrefix")}
              <a
                className="text-primary hover:underline"
                href="https://github.com/ilrein/openwrite"
                rel="noopener noreferrer"
                target="_blank"
              >
                github.com/ilrein/openwrite
              </a>
              {t("legal.terms.ownership.openSourceBodySuffix")}
            </p>
          </CardContent>
        </Card>

        {/* AI and Data Processing */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.ai.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.ai.p1")}</p>
            <ul>
              <li>{t("legal.terms.ai.items.auto")}</li>
              <li>{t("legal.terms.ai.items.responsible")}</li>
              <li>{t("legal.terms.ai.items.processed")}</li>
              <li>{t("legal.terms.ai.items.noGuarantee")}</li>
            </ul>
            <p>{t("legal.terms.ai.p2")}</p>
          </CardContent>
        </Card>

        {/* Service Availability */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.availability.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.availability.p1")}</p>
            <ul>
              <li>{t("legal.terms.availability.items.maintenance")}</li>
              <li>{t("legal.terms.availability.items.technical")}</li>
              <li>{t("legal.terms.availability.items.thirdParty")}</li>
              <li>{t("legal.terms.availability.items.forceMajeure")}</li>
            </ul>
            <p>{t("legal.terms.availability.p2")}</p>
          </CardContent>
        </Card>

        {/* Disclaimer of Warranties */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.disclaimer.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.disclaimer.p1")}</p>
            <p>{t("legal.terms.disclaimer.p2")}</p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.liability.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.liability.p1")}</p>
            <p>{t("legal.terms.liability.p2")}</p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.termination.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.termination.p1")}</p>
            <ul>
              <li>{t("legal.terms.termination.items.revoked")}</li>
              <li>{t("legal.terms.termination.items.deleted")}</li>
              <li>{t("legal.terms.termination.items.retained")}</li>
            </ul>
            <p>{t("legal.terms.termination.p2")}</p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.law.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.law.p1")}</p>
            <p>{t("legal.terms.law.p2")}</p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.changes.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.changes.p1")}</p>
            <p>{t("legal.terms.changes.p2")}</p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("legal.terms.contact.title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{t("legal.terms.contact.intro")}</p>
            <ul>
              <li>
                {t("legal.terms.contact.githubIssues")}{" "}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/ilrein/openwrite/issues"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  github.com/ilrein/openwrite/issues
                </a>
              </li>
              <li>{t("legal.terms.contact.email")} zongyangpolo@gmail.com</li>
            </ul>
            <p>{t("legal.terms.contact.p2")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
