import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, useI18n } from "../i18n"

function LocaleHarness() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div>
      <span>{locale}</span>
      <span>{t("nav.dashboard")}</span>
      <button onClick={() => setLocale("zh-CN")} type="button">
        Chinese
      </button>
      <button onClick={() => setLocale("en")} type="button">
        English
      </button>
    </div>
  )
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ""
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "en-US",
    })
  })

  it("uses the browser language when no preference is stored", () => {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "zh-CN",
    })

    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>
    )

    expect(screen.getByText("zh-CN")).toBeInTheDocument()
    expect(screen.getByText("工作台")).toBeInTheDocument()
  })

  it("prefers and applies the persisted locale", async () => {
    localStorage.setItem("modernnovel-locale", "zh-CN")

    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>
    )

    expect(screen.getByText("工作台")).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"))
  })

  it("persists language changes and updates the document language", async () => {
    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Chinese" }))

    expect(screen.getByText("工作台")).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem("modernnovel-locale")).toBe("zh-CN")
      expect(document.documentElement.lang).toBe("zh-CN")
    })

    fireEvent.click(screen.getByRole("button", { name: "English" }))
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })
})
