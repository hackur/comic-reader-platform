import { test, expect } from "@playwright/test";

// Smoke test: the homepage renders and the comic dropzone is visible.
//
// Run prerequisites (see apps/web/playwright.config.ts):
//   pnpm add -D -w @playwright/test
//   pnpm exec playwright install --with-deps chromium
//   pnpm dev:web         # in another terminal
//   pnpm -F @comics-platform/web exec playwright test
test.describe("homepage", () => {
  test("loads and shows the dropzone", async ({ page }) => {
    await page.goto("/");

    // Heading is present.
    await expect(
      page.getByRole("heading", {
        name: /local-first comic library/i,
      }),
    ).toBeVisible();

    // The dropzone is the primary import surface. ComicDropzone exposes a
    // file input plus visible affordances; we look for any of:
    //   - a file <input type="file">
    //   - text along the lines of "Drop" / "Drag" / "Choose"
    const fileInput = page.locator('input[type="file"]');
    const dropHint = page.getByText(/drop|drag|choose|browse|select/i).first();

    await expect(fileInput.or(dropHint)).toBeVisible();
  });
});
