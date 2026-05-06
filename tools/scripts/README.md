# tools/scripts

Maintenance and developer-experience scripts for the comics platform.
None of these scripts are required to build or run the app — they're for
contributors and CI.

## `deploy.sh`

Builds the static Next.js export from `apps/web` and deploys it to
Cloudflare Pages via `wrangler pages deploy`.

```bash
./tools/scripts/deploy.sh
```

Prereqs:

- `pnpm install` at the repo root.
- A Cloudflare account with Pages enabled, and `wrangler` configured
  (the script invokes `npx wrangler@4.88.0`, which will prompt for auth
  on first run).

## `generate-sample-cbz.mjs`

Generates `apps/web/public/sample.cbz`, a small demo comic that the web
app can fetch as a "try the reader" sample.

```bash
node tools/scripts/generate-sample-cbz.mjs
```

What it does:

- Renders 8 pages at 1200x1800 (vertical color gradient per page, with
  the title "SAMPLE READER DEMO" stamped near the top and a "PAGE n / 8"
  label centered).
- Encodes each page as PNG using a hand-rolled encoder (no third-party
  deps — uses only `node:zlib` for the IDAT deflate).
- Stamps text via a hand-drawn 8x16 bitmap font (only the glyphs we need
  are defined: digits, `/`, space, and the letters in the labels).
- Packs the 8 PNGs plus a `ComicInfo.xml` (Series=Sample, Number=1,
  PageCount=8, Title="Sample Reader Demo") into a store-only ZIP.
- Writes the result to `apps/web/public/sample.cbz` and a sibling
  `apps/web/public/sample.cbz.txt` explainer.
- Runs a self-test that re-reads the file from disk, checks the
  `PK\x03\x04` magic, and walks the central directory to assert the
  expected entry names.

No deps. Node 22+ is required (uses modern `node:zlib` and `node:fs`
ESM imports).

## Test fixtures (per-package)

Vitest tests live alongside their packages and are picked up by the
root `vitest.workspace.ts`:

- `packages/comic-extractor-zip/test/zip-extractor.test.ts` — builds a
  tiny in-memory CBZ via `@zip.js/zip.js`'s `ZipWriter` and verifies
  `ZipComicExtractor` returns the expected page count and blob bytes.
- `packages/comic-extractor-tar/test/tar-extractor.test.ts` — builds a
  USTAR buffer in memory (two image entries) and verifies
  `TarComicExtractor` returns the expected page count.

Both test files use `happy-dom` for `Blob` / `URL.createObjectURL`
support. After installing deps you can run them with:

```bash
pnpm -F @comics-platform/comic-extractor-zip test
pnpm -F @comics-platform/comic-extractor-tar test
```

## Playwright smoke tests

`apps/web/playwright.config.ts` and `apps/web/e2e/smoke.spec.ts` provide
a starter end-to-end smoke test that asserts the homepage dropzone
renders. Playwright is **not** installed by default — to enable:

```bash
pnpm add -D -w @playwright/test
pnpm exec playwright install --with-deps chromium
pnpm -F @comics-platform/web exec playwright test
```

The config assumes the web app is already serving on
`http://localhost:3000`; start it with `pnpm dev:web` in another
terminal, or wire up `webServer` in `playwright.config.ts`.
