import { expect, type Page, test } from "@playwright/test"

/**
 * Full writer journey against the real worker (wrangler dev + local D1):
 * sign up, create a project and chapter, write with autosave, verify
 * persistence across reload, and check the editor toolbar on mobile.
 */

async function signUp(page: Page, tag: string): Promise<void> {
  const email = `e2e-${tag}-${Date.now()}@example.com`
  await page.goto("/register")
  await page.getByLabel("Name").fill("E2E Tester")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill("e2e-password-123")
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL("**/dashboard**", { timeout: 20_000 })
}

async function createProjectViaDialog(page: Page, title: string): Promise<string> {
  await page.goto("/dashboard/projects")
  await page
    .getByRole("button", { name: /new project/i })
    .first()
    .click()
  await page.getByLabel(/title/i).fill(title)
  await page.getByRole("button", { name: "Create Project", exact: true }).click()

  // Creating a project drops the writer straight into the editor
  await page.waitForURL("**/projects/*/write", { timeout: 15_000 })
  const projectId = /\/projects\/([^/]+)\/write/.exec(page.url())?.[1] ?? ""
  expect(projectId).not.toBe("")
  return projectId
}

async function openEditorWithFirstChapter(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/write`)
  // Chapter 1 is created automatically on first visit
  await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 15_000 })
  // The first visit opens the guided tour; dismiss it
  await expect(page.getByText("Your manuscript")).toBeVisible({ timeout: 10_000 })
  await page.getByRole("button", { name: "Skip" }).click()
  await expect(page.getByText("Your manuscript")).not.toBeVisible()
}

test("writer journey: sign up, create a project, write with autosave", async ({ page }) => {
  await signUp(page, "journey")
  const projectId = await createProjectViaDialog(page, `E2E Novel ${Date.now()}`)
  await openEditorWithFirstChapter(page, projectId)

  // Write prose and wait for the debounced autosave to confirm
  await page.locator(".ProseMirror").click()
  await page.keyboard.type("The rain hammered the cobblestones as Mira slipped through the gate.")
  await expect(page.getByText(/Saved at/)).toBeVisible({ timeout: 15_000 })

  // Content survives a reload
  await page.reload()
  await expect(page.locator(".ProseMirror")).toContainText("rain hammered the cobblestones", {
    timeout: 15_000,
  })

  // Toolbar formatting applies to the document
  await page.locator(".ProseMirror").click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.getByTitle("Bold").click()
  await expect(page.locator(".ProseMirror strong")).toContainText("rain hammered")

  // Chapter sidebar shows the chapter with its word count
  await expect(page.getByText("Chapter 1").first()).toBeVisible()
})

test("canvas: premise capture seeds the story map", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop-only flow")

  await signUp(page, "canvas")
  const projectId = await createProjectViaDialog(page, `E2E Canvas ${Date.now()}`)

  await page.goto(`/projects/${projectId}/canvas`)
  await expect(page.getByText("Start your story map")).toBeVisible({ timeout: 15_000 })

  // First canvas visit opens the guided tour; dismiss it
  await expect(page.getByText("Start with a premise")).toBeVisible({ timeout: 10_000 })
  await page.getByRole("button", { name: "Skip" }).click()

  await page
    .getByPlaceholder(/lighthouse keeper/i)
    .fill("A cartographer maps a city that rearranges itself at night.")
  await page.getByRole("button", { name: /create premise/i }).click()

  // The premise lands on the canvas as a node and the capture card goes away
  await expect(page.getByText("Premise").first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText("Start your story map")).not.toBeVisible()
})

test("mobile: toolbar stays on a single scrollable row above the editor", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile-only regression test")

  await signUp(page, "mobile")
  const projectId = await createProjectViaDialog(page, `E2E Mobile ${Date.now()}`)
  await openEditorWithFirstChapter(page, projectId)

  const toolbar = page.getByTestId("editor-toolbar")
  await expect(toolbar).toBeVisible()

  // Regression: the toolbar must not wrap into a second row that
  // overlaps the editor content (it scrolls horizontally instead)
  const box = await toolbar.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.height ?? 0).toBeLessThan(56)

  const overflows = await toolbar.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(overflows).toBe(true)

  // Controls remain usable: type, bold via toolbar
  await page.locator(".ProseMirror").click()
  await page.keyboard.type("Mobile words")
  await page.keyboard.press("ControlOrMeta+a")
  await page.getByTitle("Bold").click()
  await expect(page.locator(".ProseMirror strong")).toContainText("Mobile words")
})
