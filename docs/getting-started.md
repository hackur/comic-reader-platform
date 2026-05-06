# Getting Started

This guide gets a fresh checkout of the Comic Reader Platform running locally, walks through the development loop, builds the static export, and deploys it to Cloudflare Pages. The final section covers the common environment issues that trip up first-time contributors.

## Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20.9+ (22 LTS recommended) | Required floor for Next.js 16. |
| pnpm | 10.x | Workspace + lockfile format. |
| Git | any recent | Clone, branch, push. |
| A modern browser | Chromium 121+, Firefox 124+, Safari 17.4+ | OPFS, `FileSystemDirectoryHandle`, modern `URL.createObjectURL` semantics. |

Enable pnpm via Corepack rather than installing globally:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

## Install

```bash
git clone https://github.com/<your-org>/comics.git
cd comics
pnpm install
```

The first install builds TypeScript references for every package. Subsequent installs are cache-warm and finish in seconds.

## Development loop

Run the web app:

```bash
pnpm dev:web
```

The Next.js shell starts on `http://localhost:3000`. The reader is a client-side SPA — once the page loads, drag a `.cbz` (or supported archive) onto the dropzone to open it. Library data is persisted to your browser's IndexedDB and OPFS, scoped to `localhost:3000`.

Useful workspace scripts:

| Command | What it does |
| --- | --- |
| `pnpm dev:web` | Run the Next.js app in dev mode (Turbopack). |
| `pnpm build` | Build all packages and the web app (Turborepo). |
| `pnpm build:web` | Static export to `apps/web/out`. |
| `pnpm typecheck` | Run TypeScript across the workspace. |
| `pnpm lint` | Run ESLint via the flat config. |
| `pnpm test` | Run Vitest for every package that defines tests. |
| `pnpm --filter <pkg> test` | Run a single package's tests. |

## Screenshots

```text
[ screenshot: empty library with dropzone ]
[ screenshot: ComicReaderShell open with thumbnail rail visible ]
[ screenshot: spread mode at fit-width, RTL toggle on ]
```

(Add real screenshots under `docs/img/` when the UI stabilizes.)

## Building

The default build is a static export of the Next.js app:

```bash
pnpm build:web
```

The output lands in `apps/web/out/`. It is fully static — no Node runtime is required to serve it.

## Deploying

The web app is a static export and deploys to Cloudflare Pages.

```bash
pnpm deploy:pages
```

For a Git-connected Pages project on a monorepo:

- Production branch: `main`
- Root directory: repository root
- Build command: `pnpm install --frozen-lockfile && pnpm build:web`
- Build output directory: `apps/web/out`
- Framework preset: Next.js (Static HTML Export)

Pages free-plan limits relevant to the app shell (per current Cloudflare docs): 500 builds/month, 20,000 files per site, 25 MiB max per deployed asset. These do **not** apply to user-uploaded comics, which never leave the browser.

If you need a Workers / SSR target instead — for example, to add server-side sync, auth, or remote catalogs — see the migration notes in `comic-platform-plan.md`. None of that is required for the local-first reader to work.

## Troubleshooting

### PDF.js worker fails to load

Symptom: opening a PDF logs `Setting up fake worker failed` or `Failed to fetch dynamically imported module: pdf.worker.min.mjs`.

Cause: the PDF extractor (`@comics-platform/comic-extractor-pdf`) needs an absolute URL to `pdf.worker.min.mjs` at runtime. The package tries to derive one via `import.meta.url`, but that fails when the bundler emits the worker chunk under an unexpected path or when the page is served from `file://`.

Fix: call `configurePdfWorker(url)` once at startup, pointing at the worker asset emitted by your bundler. With Next.js, the simplest approach is to copy `pdfjs-dist/build/pdf.worker.min.mjs` into `apps/web/public/` and call `configurePdfWorker('/pdf.worker.min.mjs')` in a top-level client component.

### OPFS not available in private/incognito mode

Symptom: comics open but archive blobs are not persisted across reloads; deleting a comic appears to leak storage; `isOpfsAvailable()` returns `false`.

Cause: most browsers disable OPFS in private/incognito sessions, and Safari versions before 17.4 had partial support. The platform feature-detects OPFS and silently falls back to storing blobs in Dexie's `blobs` table when OPFS is missing. Functionality is preserved, but very large archives may exceed IndexedDB quota.

Fix: nothing to do — the fallback is automatic. For local development, reproduce the OPFS path by running in a normal (non-private) window. To force the fallback in tests, pass `{ disableOpfs: true }` to `createDexieStorage`.

### libarchive.js worker URL is wrong

Symptom: opening a `.cbr` throws `Failed to construct 'Worker': Script at 'http://...' cannot be accessed from origin 'null'.` or a 404 for `wasm-gen/libarchive.js`.

Cause: `libarchive.js` ships its decoding logic in a Web Worker plus a WebAssembly file. Both need to be reachable at the URL the library expects. Bundlers that copy assets to a hashed path will break the default loader.

Fix: when initializing the RAR extractor, set `Archive.init({ workerUrl: '/libarchive/worker.js' })` (or wherever you have the library's worker copied to in your `public/` directory). Self-host the worker and the `.wasm` file together; do not load them from a CDN unless you trust that origin and have CSP rules to match.

### IndexedDB is blocked or quota-exceeded

Symptom: `addComic` rejects with `QuotaExceededError`, or the library appears empty after a reload.

Cause: the browser's storage quota for the origin is full, or IndexedDB is disabled by enterprise policy / strict tracking protection.

Fix: check `navigator.storage.estimate()` and prompt the user to delete comics. For long-term resilience, request persistent storage via `navigator.storage.persist()` once the user has imported at least one comic.

### `pnpm dev:web` complains about a missing peer

Symptom: install succeeds but dev fails with `Cannot find module '@comics-platform/comic-core'`.

Cause: a workspace package was modified without rebuilding TypeScript declarations.

Fix: run `pnpm build` once at the repo root, or `pnpm --filter <pkg> build` for a specific package.
