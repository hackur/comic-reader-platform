# Roadmap

The roadmap is structured around the delivery phases in [`comic-platform-plan.md`](../comic-platform-plan.md). This page restates them in user-facing language, with current status, and lists what we have intentionally deferred.

Status legend: `done`, `in progress`, `planned`, `future`.

## Phase 1 — Honest foundation `done`

The pitch: ship a working static shell on the current Next.js / React / Tailwind stack with the right messaging.

- Next.js 16 App Router with static export.
- React 19, Tailwind 4, TypeScript 6.
- Cloudflare Pages deployment that does not require server-side rendering.
- Marketing language that does not promise an "open CBR standard".
- `comic-core` types are stable: `ComicSource`, `ComicBook`, `ComicPage`, `ComicExtractor`, `ReadingState`.

## Phase 2 — Local library `done`

The pitch: a comic added to the library survives a reload.

- Dexie schema with `library`, `readingStates`, `blobs`, `meta` tables.
- OPFS adapter for archive blobs and thumbnails, with a transparent fallback to Dexie's `blobs` table.
- In-memory adapter for tests and ephemeral sessions.
- Last-read page and reading-state persistence.
- Cover thumbnail caching.

## Phase 3 — First real extractor `done`

The pitch: open a CBZ from disk and see its pages.

- `@comics-platform/comic-extractor-zip` using `@zip.js/zip.js`.
- Lazy page handles — pages are decoded only when the viewer needs them.
- ComicInfo.xml parsing for title, series, and `FrontCover` page hint.
- A Comlink-exposed Web Worker (`comic-worker`) that does archive opening off the main thread.
- Cancellation via `AbortSignal` and progress events.

## Phase 4 — Serious reader UX `in progress`

The pitch: a reader you would actually want to use.

- `done` Single-page mode with fit-width / fit-height / best-fit / original.
- `done` Spread mode (paired pages) with parity toggle.
- `done` Vertical strip mode.
- `done` Zoom (clamped to [0.25, 6]) and rotation.
- `done` RTL toggle.
- `done` Keyboard navigation (arrow keys, space, PgUp/PgDn, Home/End, +/-/0, R, F).
- `done` Touch / pointer gestures.
- `done` Thumbnail rail and page slider.
- `in progress` Page preloader heuristics (lookahead, prefetch on idle).
- `planned` Bookmarks and annotations (per-comic, local).

## Phase 5 — Optional CBR path `in progress`

The pitch: read your existing CBR collection without making CBR a first-class format.

- `done` `@comics-platform/comic-extractor-rar` using `libarchive.js`.
- `done` Read-only, plugin-shaped, registered explicitly.
- `done` Password / encrypted-archive detection mapped to `PASSWORD_REQUIRED`.
- `planned` Lazy registration so users who only read CBZ don't pay the WASM cost.
- `planned` UI affordance to enable / disable CBR support per-install.

## Phase 6 — More formats `in progress`

- `done` PDF via `pdfjs-dist`. Pages render to PNG at 2× scale.
- `done` Image folders (drag a directory or multi-select images).
- `done` CBT (uncompressed tar).
- `planned` 7z / CB7 once a workable WASM build exists.
- `future` Compressed tar variants (`.tar.gz`, `.tar.xz`).

## Phase 7 — Library quality `planned`

- Search across titles and ComicInfo metadata.
- ComicInfo enrichment from open metadata sources (ComicVine-compatible APIs), opt-in and rate-limited.
- Reading lists / collections (smart and manual).
- Sort and filter by series, tags, last-read, completion.
- Export library as a portable archive (zip of metadata + blobs).

## Phase 8 — Cloud sync `future`

The pitch: the same library on every device, still encrypted at rest, still optional.

- End-to-end encrypted sync to a user-controlled endpoint.
- A reference Workers-based sync server, opt-in only.
- No cloud-only features — everything must still work fully offline.

This phase is the trigger to migrate `apps/web` from Pages-static to Workers-SSR. Until then, Workers buys deployment complexity without solving a real product problem.

## Phase 9 — Web comics & feeds `future`

- Subscribe to RSS / Atom feeds for ongoing web comics.
- Materialize each strip as a single-page `ComicBook` and keep them in the library.
- Per-feed pacing rules (mark-as-read on view, nightly fetch, etc.).

## Phase 10 — Accessibility & search `future`

- OCR pass per page, stored as searchable text alongside the comic.
- Generated alt-text for screen readers (locally; no remote inference).
- Per-page chapter / panel hints from ComicInfo.xml exposed to assistive tech.
- High-contrast and motion-reduced reading modes.

## Phase 11 — Mobile shells `future`

- A Tauri or Capacitor wrapper that targets iOS and Android while reusing the React layer.
- Native filesystem access in place of OPFS.
- Background fetch for web-comic feeds.

## Explicit non-goals

These are off the roadmap on purpose. They aren't being deferred; they aren't planned at all.

- **RAR creation / writing CBR.** RAR's compression is proprietary. We will not bundle proprietary encoders.
- **DRM-bearing formats.** No Adobe ACSM, no Kindle KFX. The platform does not negotiate licenses.
- **Server-side library hosting on the canonical project deployment.** A user's library lives in their browser. A self-hosted sync layer is fine; the project's hosted instance will not store your comics.
- **Telemetry by default.** No analytics, no error reporting, no usage pings. Forks may add these; upstream will not.
