// Playwright config for the comics web app smoke tests.
//
// IMPORTANT: @playwright/test is not installed by default. Install with:
//   pnpm add -D -w @playwright/test
//   pnpm exec playwright install --with-deps chromium
//
// Then run:
//   pnpm -F @comics-platform/web exec playwright test
//
// This config assumes the dev server is already running on port 3000.
// To have Playwright start it for you, uncomment the `webServer` block below.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
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
  // webServer: {
  //   command: "pnpm dev:web",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
