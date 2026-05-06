# Web e2e suite (Playwright)

Install browsers (one-time):

```
pnpm dlx playwright install chromium
pnpm --filter @comics-platform/web exec playwright test
```

The Playwright config auto-starts `pnpm dev` on port 3000 and reuses any
existing server. Override with `PLAYWRIGHT_BASE_URL` to point at a deployed
preview.

## Files

- `smoke.spec.ts` — homepage renders, dropzone is present.
- `library.spec.ts` — imports `public/sample.cbz`, opens the reader,
  advances a page with `ArrowRight`.
- `settings.spec.ts` — toggles dark mode and verifies persistence.
  Auto-skips if `/settings` is not shipped.
