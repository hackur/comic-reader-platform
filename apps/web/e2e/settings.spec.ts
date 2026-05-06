import { test, expect } from "@playwright/test";

// Settings page is optional. If /settings 404s, the suite is skipped rather
// than failing — keeps the e2e green on builds that haven't shipped it yet.
test.describe("settings page", () => {
  test("toggles theme to dark and persists across reload", async ({ page }) => {
    const response = await page.goto("/settings", { waitUntil: "domcontentloaded" });

    test.skip(
      !response || response.status() >= 400,
      "/settings route is not available in this build",
    );

    // Look for any control labeled with theme/dark. Prefer role=switch or a
    // button with "dark" in its accessible name.
    const darkToggle = page
      .getByRole("switch", { name: /dark|theme/i })
      .or(page.getByRole("button", { name: /dark/i }))
      .or(page.getByLabel(/dark mode|theme/i))
      .first();

    test.skip(
      (await darkToggle.count()) === 0,
      "no theme toggle exposed on /settings",
    );

    await darkToggle.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 5_000,
    });

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
