<p align="center">
  <img src="apps/web/public/logo.svg" alt="Comic Reader Platform" width="96" height="96" />
</p>

<p align="center"><strong>Comic Reader Platform</strong> — a local-first, format-agnostic comic archive reader for the web.</p>

<p align="center">CBZ, CBT, PDF, and image folders are first-class. CBR ships as an optional plugin. See the <a href="./docs">/docs</a> for architecture and extractor authoring.</p>

# Comic Reader Platform

A local-first, format-agnostic comic archive reader for the web. CBZ-first, plugin-based, and built so your library never leaves your browser.

> The app is the website. Your library lives in IndexedDB and OPFS on your own machine. We do not upload your comics anywhere.

**Live demo:** https://comic-reader-platform.pages.dev

## Supported Formats

![CBZ](https://img.shields.io/badge/CBZ-first--class-2ea44f) ![CBT](https://img.shields.io/badge/CBT-supported-2ea44f) ![PDF](https://img.shields.io/badge/PDF-supported-2ea44f) ![Image folders](https://img.shields.io/badge/Image%20folders-supported-2ea44f) ![CBR](https://img.shields.io/badge/CBR-optional%20plugin-orange)

CBZ, CBT, PDF, and image folders are first-class. CBR ships as an optional, read-only plugin because RAR compression is proprietary; we deliberately do not implement RAR creation.

## Packages

| Package | Purpose |
| --- | --- |
| [`@comics-platform/comic-core`](./packages/comic-core) | Format-agnostic types, `ComicExtractor` contract, registry, pure utilities |
| [`@comics-platform/comic-react`](./packages/comic-react) | React hooks, viewer, library grid, search, panels, theme, providers |
| [`@comics-platform/comic-storage`](./packages/comic-storage) | IndexedDB (Dexie) + OPFS adapters, in-memory adapter, bookmarks, preferences |
| [`@comics-platform/comic-worker`](./packages/comic-worker) | Optional Comlink-exposed Web Worker harness for off-main-thread extraction |
| [`@comics-platform/comic-extractor-zip`](./packages/comic-extractor-zip) | CBZ extractor backed by `@zip.js/zip.js` |
| [`@comics-platform/comic-extractor-tar`](./packages/comic-extractor-tar) | CBT extractor (pure-TS USTAR parser) |
| [`@comics-platform/comic-extractor-pdf`](./packages/comic-extractor-pdf) | PDF extractor backed by `pdfjs-dist` |
| [`@comics-platform/comic-extractor-images`](./packages/comic-extractor-images) | Folders / loose images |
| [`@comics-platform/comic-extractor-rar`](./packages/comic-extractor-rar) | Optional read-only CBR via `libarchive.js` |
| [`apps/web`](./apps/web) | Static Next.js 16 SPA shell deployed to Cloudflare Pages |

## Quick Start

```bash
pnpm install
pnpm dev:web
```

Then open http://localhost:3000, drop a CBZ / CBT / PDF / image folder on the page, and read. A demo `sample.cbz` is bundled at `apps/web/public/sample.cbz`.

The first run of `pnpm dev:web` and `pnpm build:web` invokes `tools/scripts/copy-vendor-assets.mjs` automatically (via `predev`/`prebuild`) to populate `apps/web/public/vendor/{libarchive,pdfjs}` from `node_modules`. Run `pnpm vendor:copy` manually if you need to refresh those assets.

Requires Node.js 20.9+ (22 LTS recommended) and pnpm 10.

## Architecture

```text
+---------------------------------------------------------------+
|                     apps/web (Next.js 16)                     |
+---------------------------------------------------------------+
            |                |                  |
            v                v                  v
   +----------------+ +----------------+ +-------------------+
   |  comic-react   | | comic-storage  | | comic-extractor-* |
   +----------------+ +----------------+ +-------------------+
                \         |        /
                 v        v       v
             +-------------------------+
             |       comic-core        |
             +-------------------------+
```

`comic-core` has no runtime dependencies. Extractors and storage depend only on `comic-core`. The web app is a thin composer.

Full details in [`docs/architecture.md`](./docs/architecture.md).

## Authoring a New Extractor

Implement `ComicExtractor` from `comic-core`, register with `ExtractorRegistry.register()`, and ship as its own package. See [`docs/extractor-authoring.md`](./docs/extractor-authoring.md) for an annotated example.

## Verified Stack

Versions revalidated 2026-05-05:

| Tool | Version |
| --- | --- |
| Next.js | 16.2.4 |
| React | 19.2.5 |
| TypeScript | 6.0.3 |
| Tailwind CSS | 4.2.4 |
| pnpm | 10.33.3 |
| Turbo | 2.9.9 |
| Wrangler | 4.88.0 |

Supporting libraries: Dexie 4.4.2 (IndexedDB), `@zip.js/zip.js` 2.8.26 (CBZ), `pdfjs-dist` 5.7.284 (PDF), `libarchive.js` 2.0.2 (CBR), `lucide-react` (icons), Comlink (worker RPC).

## Cloudflare Deployment

The web app is a static Next.js export deployed to Cloudflare Pages.

```bash
pnpm deploy:pages
```

Cloudflare Pages settings for a monorepo:

- Production branch: `main`
- Root directory: repository root
- Build command: `pnpm install --frozen-lockfile && pnpm build:web`
- Build output directory: `apps/web/out`
- Framework preset: Next.js (Static HTML Export)

User libraries live in the browser, so Pages' file-count and asset-size limits apply only to the app shell, not your comics.

## Scope and Legal Note

- Reading CBR is feasible client-side and is a goal.
- Creating RAR / authoring "true CBR" is out of scope: RAR compression is proprietary.
- This is a universal comic archive reader with optional CBR support, not an open CBR standard.

## Test Fixtures

Real public-domain comic archives in CBZ, CBR, CBT, PDF, and image-folder shape live under [`tests/fixtures/`](./tests/fixtures/) and are imported in tests via the `@fixtures` alias. Provenance and licensing for every shipped binary is documented in [`tests/fixtures/PROVENANCE.md`](./tests/fixtures/PROVENANCE.md). Regenerate via `tools/scripts/regenerate-fixtures.sh`.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, branch convention, conventional commits, where to add new extractors, and testing guidelines.

## License

[MIT](./LICENSE) (c) 2026 Comic Reader Platform contributors.
