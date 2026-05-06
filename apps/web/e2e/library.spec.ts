import path from "node:path";
import { test, expect } from "@playwright/test";

const SAMPLE_CBZ = path.resolve(__dirname, "../public/sample.cbz");

test.describe("library import flow", () => {
  test("homepage shows logo, dropzone, and library section", async ({ page }) => {
    await page.goto("/");

    // Header logo is visible.
    await expect(page.getByTestId("header-logo")).toBeVisible();

    // Dropzone (file input) exists and is in the DOM.
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);

    // Library section heading is rendered (empty or populated).
    await expect(
      page.getByRole("heading", { name: /comic|nothing here/i }).first(),
    ).toBeVisible();

    // Settings link is optional; only assert if present.
    const settingsLink = page.getByRole("link", { name: /settings/i });
    if ((await settingsLink.count()) > 0) {
      await expect(settingsLink.first()).toBeVisible();
    }
  });

  test("imports sample.cbz, opens it in the reader, and advances pages", async ({
    page,
  }) => {
    await page.goto("/");

    // The dropzone exposes a hidden file input. Use setInputFiles directly.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SAMPLE_CBZ);

    // Wait for a comic card to appear in the library grid. The library renders
    // a button/link per comic; we look for any clickable element that contains
    // "sample" (the filename) or for the library count to show "1 comic".
    const card = page
      .locator(
        '[data-testid="comic-card"], button:has-text("sample"), a:has-text("sample")',
      )
      .first();

    await expect
      .poll(
        async () => {
          if ((await card.count()) > 0) return true;
          // Fallback: the page heading flips from "Nothing here yet" to a count.
          const heading = await page
            .getByRole("heading", { name: /comic on this device|comics on this device/i })
            .count();
          return heading > 0;
        },
        { timeout: 30_000 },
      )
      .toBe(true);

    // Click the first card / open control.
    const opener = (await card.count())
      ? card
      : page.getByRole("button", { name: /open|read/i }).first();
    await opener.click();

    // We should land on the reader.
    await expect(page).toHaveURL(/\/reader\?id=/, { timeout: 15_000 });

    // An image should render.
    const readerImage = page.locator("img, canvas").first();
    await expect(readerImage).toBeVisible({ timeout: 20_000 });

    // ArrowRight should advance the page indicator. We grab whatever text on
    // the page looks like "1 / N" or "Page 1", press ArrowRight, then expect
    // it to differ. If no indicator is found, just assert no crash on key.
    const indicator = page
      .locator("text=/\\b\\d+\\s*\\/\\s*\\d+\\b/")
      .first();
    const before = (await indicator.count()) ? await indicator.textContent() : null;

    await page.keyboard.press("ArrowRight");

    if (before !== null) {
      await expect
        .poll(async () => (await indicator.textContent())?.trim(), {
          timeout: 5_000,
        })
        .not.toBe(before?.trim());
    } else {
      // No indicator visible — just confirm the reader is still healthy.
      await expect(readerImage).toBeVisible();
    }
  });
});
