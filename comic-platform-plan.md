# Comic Reader Platform - Updated 2026 Build Plan

## 1. What The Product Actually Is

The original conversation was directionally correct on one important point: the project should not be framed as a pure open-standard “universal CBR” library because CBR is just RAR, and RAR compression remains proprietary.

The correct target is:

- a local-first comic archive platform,
- built in TypeScript,
- with a React component layer for the web app,
- with CBZ as the first-class open format,
- and CBR support isolated as an optional read-only plugin.

That keeps the product technically honest, legally safer, and easier to adopt.

## 2. Verified Current Stack

This section was revalidated online on 2026-05-05 before the repo was updated.

### Official framework versions

- Next.js 16.2.4
- React 19.2.x docs current, npm stable currently 19.2.5
- TypeScript 6.0.3
- Tailwind CSS 4.2.4

### Toolchain versions

- pnpm 10.33.3
- Turbo 2.9.9
- Wrangler 4.88.0

### Current supporting library shortlist

- Dexie 4.4.2
- @zip.js/zip.js 2.8.26
- pdfjs-dist 5.7.284
- bitjs 0.2.3 as a placeholder candidate for browser-side RAR extraction review

## 3. Why The Stack Changed

The previous scaffold was stale in four meaningful ways:

1. It used Next.js 14 and React 18 even though Next.js 16 and React 19.2 are current.
2. It used Tailwind 3 conventions even though Tailwind 4 has a different PostCSS integration and a simpler import model.
3. It treated Cloudflare Pages as the universal Next.js deployment story, while current Cloudflare guidance distinguishes static Next.js on Pages from full SSR Next.js on Workers.
4. It described the project too generically and did not preserve the original CBR-versus-CBZ architectural reasoning.

## 4. Product Constraints From The Original Conversation

These are the non-negotiable design constraints that should stay visible in all future implementation work:

- CBR is not a clean open web standard.
- RAR creation is not part of the open-stack goal.
- Browser storage should use IndexedDB and OPFS, not localStorage for binary comic data.
- The UI layer must be format-agnostic.
- Uploaded files are user-local content, not server-side content.

## 5. Recommended 2026 Architecture

### App model

- Framework: Next.js 16 App Router.
- Deployment shape: static export.
- Reader behavior: client-side SPA inside the exported shell.
- Hosting target: Cloudflare Pages for the current scope.

This is still a good fit because the website itself is static, while the comic reading workflow is intentionally client-local.

### Storage model

- IndexedDB for library records, reading progress, preferences, search index metadata, and thumbnail references.
- OPFS for large binary blobs and optional extracted-page cache files.
- localStorage only for tiny preference fallbacks if ever needed.

### Extraction model

- Archive opening happens in browser workers.
- Each format implements a `ComicExtractor` contract.
- The UI receives a normalized `ComicBook` plus `ComicPage[]` contract.
- Page rendering consumes blobs or object URLs, not archive-specific details.

## 6. Cloudflare Strategy In 2026

### What Cloudflare currently recommends

Cloudflare’s docs now make a sharper distinction:

- use Pages for static Next.js export,
- use Workers for full-stack SSR Next.js.

For this repo, Pages is still correct because the app is deliberately static and local-first.

### Why not Workers yet

Do not move this project to Workers until at least one of these becomes real:

- authenticated cloud sync,
- remote comic catalogs,
- collaborative features,
- server-side metadata enrichment,
- server-side search or recommendations,
- protected file import or paid accounts.

Until then, Workers would add deployment complexity without solving a real product problem.

### Relevant current Pages limits for the app shell

- 500 builds per month on Free
- 20,000 files per site on Free
- 25 MiB per deployed static asset on Free

Important distinction: those limits apply to the deployed application bundle, not the user’s comic library stored in-browser.

## 7. Monorepo Shape

```text
apps/
   web/
packages/
   comic-core/
   comic-react/
   comic-storage/
   comic-extractor-zip/
   comic-extractor-rar/
   comic-extractor-tar/
   comic-worker/
tools/
   scripts/
```

## 8. Package Responsibilities

### @comics-platform/comic-core

Purpose:

- the source-of-truth type system,
- format-agnostic book/page contracts,
- reading-state primitives,
- metadata interfaces,
- feature flags shared across packages.

Owns:

- `ComicSource`
- `ComicFormat`
- `ComicPage`
- `ComicBook`
- `ComicExtractor`
- `ReadingState`

Must not depend on React, storage, or archive implementations.

### @comics-platform/comic-react

Purpose:

- React hooks,
- viewer components,
- upload UI,
- reading-state providers,
- library and thumbnail components.

Should depend only on:

- React,
- `comic-core`,
- storage hooks or adapters exposed through stable interfaces.

### @comics-platform/comic-storage

Purpose:

- browser persistence adapters,
- IndexedDB schema management,
- OPFS blob access,
- reading progress writes,
- thumbnail cache lifecycle.

Recommended implementation path:

- start with Dexie for IndexedDB,
- add OPFS adapter after the metadata flow is stable,
- keep a memory adapter for tests and storybook-style environments.

### @comics-platform/comic-extractor-zip

Purpose:

- fully open default path,
- first real shipping extractor,
- reference architecture for all later extractors.

Recommended library:

- `@zip.js/zip.js`

### @comics-platform/comic-extractor-rar

Purpose:

- optional read-only CBR opening path.

Rules:

- no RAR creation,
- explicit licensing caveat in docs,
- pluggable and removable,
- never required for core viewer operation.

### @comics-platform/comic-extractor-tar

Purpose:

- CBT support,
- simpler archive shape than CBR,
- useful as the second extractor once CBZ is stable.

### @comics-platform/comic-worker

Purpose:

- archive extraction off the main thread,
- cover generation,
- dimension probing,
- image decode support,
- sorting and indexing.

## 9. Next.js 16 Specific Guidance

### Good fits for this repo

- App Router
- static export
- client components for the reader shell
- Turbopack default dev and build behavior

### Things to consciously avoid for now

- server actions for core reader behavior
- cacheComponents and server caching patterns for user library data
- SSR-specific complexity
- premature React Compiler enablement until the app grows enough to justify measuring it

### Important version implications

- Node.js 20.9+ is now the minimum supported version for Next.js 16.
- `next lint` has been removed from the recommended flow; lint should run through ESLint directly.
- Tailwind 4 integration should use `@tailwindcss/postcss` and `@import "tailwindcss"`.

## 10. Browser Data Model

### Library record

Suggested IndexedDB record shape:

```ts
interface LibraryRecord {
   id: string
   title: string
   format: 'cbz' | 'cbr' | 'cbt' | 'pdf' | 'images' | 'unknown'
   sourceName: string
   coverCacheKey?: string
   pageCount?: number
   lastReadPage?: number
   readingDirection?: 'ltr' | 'rtl'
   viewMode?: 'single' | 'spread' | 'strip'
   addedAt: string
   updatedAt: string
}
```

### Blob storage split

- small metadata stays in IndexedDB,
- large original archives or extracted pages move to OPFS,
- only lightweight references are persisted in the library index.

## 11. UI Plan

The UI should communicate what makes this app different:

- local-first,
- no upload-to-server requirement,
- open-first format strategy,
- serious reading UX.

### Required v1 reader modes

- single page
- spread mode
- vertical strip mode
- fit width
- fit height
- best fit
- zoom
- rotation
- RTL toggle
- keyboard navigation
- pointer and touch navigation

### Required v1 library features

- drag-and-drop import
- browse-file import
- local persistence
- last-read resume
- cover thumbnails
- sort by last opened and recently added

## 12. Delivery Phases

### Phase 1: honest foundation

- stabilize `comic-core`
- modernize web shell to current stack
- make the homepage messaging technically accurate
- keep static Pages deployment working

### Phase 2: local library

- implement `comic-storage`
- Dexie schema
- resume state
- local cover caching

### Phase 3: first real extractor

- ship `comic-extractor-zip`
- stream pages to the reader
- add worker-based cover extraction

### Phase 4: serious reader UX

- single, spread, and strip modes
- zoom pipeline
- keyboard and touch controls
- thumbnail rail

### Phase 5: optional CBR path

- pick final RAR strategy only after separate licensing and compatibility review
- ship as optional plugin
- document limitations clearly

### Phase 6: future expansion

- CBT
- PDF
- ComicInfo.xml parsing
- optional cloud sync
- Workers migration only when product needs justify it

## 13. What To Say Publicly

Recommended positioning:

- “Universal comic archive platform for the web”
- “CBZ-first, browser-local, optional CBR support”
- “Static app shell on Cloudflare, library stored in your browser”

Do not say:

- “Open CBR standard implementation”
- “RAR creation support”
- “Everything here is W3C-native”

## 14. Immediate Next Implementation Tasks

1. Add `comic-storage` with Dexie-backed metadata persistence.
2. Implement `comic-extractor-zip` with `@zip.js/zip.js`.
3. Move archive opening and cover extraction into `comic-worker`.
4. Build `ComicViewer`, `ComicGridLibrary`, and `useReadingState` in `comic-react`.
5. Keep the deployment target static until server-side needs become real.