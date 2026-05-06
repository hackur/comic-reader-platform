// Playwright config for the comics web app e2e suite.
//
// Setup (one-time):
//   pnpm dlx playwright install chromium
//
// Run:
//   pnpm --filter @comics-platform/web exec playwright test
//
// The webServer block below auto-starts `pnpm dev` if nothing is listening on
// port 3000. Set PLAYWRIGHT_BASE_URL to point at a different origin.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
