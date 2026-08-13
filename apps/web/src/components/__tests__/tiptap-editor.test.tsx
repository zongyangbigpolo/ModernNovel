import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n"
import TiptapEditor from "../tiptap-editor"

function renderTiptapEditor(props: React.ComponentProps<typeof TiptapEditor>) {
  return render(
    <I18nProvider>
      <TiptapEditor {...props} />
    </I18nProvider>
  )
}

describe("TiptapEditor", () => {
  it("renders the editor with the shadcn toolbar", () => {
    renderTiptapEditor({ content: "<p>Hello world</p>", onUpdate: vi.fn() })

    expect(screen.getByTitle("Bold")).toBeInTheDocument()
    expect(screen.getByTitle("Highlight")).toBeInTheDocument()
    expect(screen.getByTitle("Add link")).toBeInTheDocument()
    expect(screen.getByTitle("Code block")).toBeInTheDocument()
    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("disables undo before any edits", () => {
    renderTiptapEditor({ content: "", onUpdate: vi.fn() })
    expect(screen.getByTitle("Undo")).toBeDisabled()
  })
})
