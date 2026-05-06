# FAQ

Realistic questions, short answers. For longer discussions, follow the links into the rest of the docs.

## Format support

### Does it support CBR?

Yes, read-only, via the optional `@comics-platform/comic-extractor-rar` plugin. The plugin uses `libarchive.js` (a WebAssembly build of libarchive) to decode RAR archives. It does not — and will not — write RAR. See [legal.md](./legal.md).

### Does it support CBZ?

Yes. CBZ is the first-class format. The CBZ extractor (`@comics-platform/comic-extractor-zip`) uses `@zip.js/zip.js` and is what we recommend you tell your users to use.

### Does it support PDF?

Yes. The PDF extractor uses `pdfjs-dist` and renders each page to PNG at 2× scale. Password-protected PDFs throw `PASSWORD_REQUIRED`.

### Does it support CBT?

Yes, for uncompressed tar archives. Compressed `.tar.gz` and `.tar.xz` are not supported in v1.

### Does it support 7z / CB7?

Not yet. It's on the [roadmap](./roadmap.md). The blocker is bundle size, not licensing.

### Does it support image folders?

Yes. Drag a folder onto the dropzone (Chromium) or multi-select images (any browser). The image extractor sorts by filename using `naturalCompare`.

### Does it support encrypted / password-protected archives?

Not in v1. Detected encryption raises `PASSWORD_REQUIRED`, but there is no UI to type a password yet.

### Does it support EPUB / MOBI?

No. Flowable EPUB is not really a comic format; fixed-layout EPUB is on the long-term roadmap.

## Privacy and storage

### Does it upload my comics?

No. Nothing leaves the browser. The `comic-storage` package has no `fetch`, `XMLHttpRequest`, or `WebSocket` calls. The CBZ, PDF, and CBR extractors only fetch when the user explicitly opens a `kind: "url"` source.

### Where are my comics stored?

In your browser's same-origin storage:

- Library metadata and reading state in IndexedDB (database name `comics-platform`).
- Archive blobs and thumbnails in OPFS (`/comics/<id>/archive.bin` and `/thumb.bin`), or as a fallback in IndexedDB's `blobs` table.

See [storage.md](./storage.md).

### How do I export my library?

The Settings page (`/settings`) has Export and Import buttons that round-trip your library metadata as JSON. Archives and thumbnails are not included — the export is portable text suitable for syncing across devices, but on a fresh device you'll re-import the source files yourself. For a forensic dump, IndexedDB and OPFS are also accessible via browser DevTools.

### How do I delete my library?

Use the **Clear local library** button on the Settings page (it deletes every comic, archive, thumbnail, bookmark, and reading state in one go), or remove individual comics from the library grid. As a last resort, clear site data for the origin in your browser settings — that wipes IndexedDB and OPFS atomically.

### Is anything tracked or logged?

No telemetry, no analytics, no error reporting beacon. The Cloudflare Pages host serves static HTML/JS/CSS; it does not see what's in your browser storage.

## Browser support

### Does it work in Safari?

Yes, on Safari 17.4+. Older Safari versions had partial OPFS support; the platform falls back to IndexedDB for blob storage when OPFS is unavailable.

### Does it work in Firefox?

Yes, on Firefox 124+. Firefox enabled OPFS in early 2024.

### Does it work on mobile?

Yes, in mobile Safari and mobile Chrome. iOS Safari has the same OPFS gating as desktop Safari. The viewer uses Pointer Events for swipe gestures.

### Does it work offline?

Yes, after the initial page load. The static shell caches via the browser's normal HTTP cache; once your comics are imported, no network is needed to read them. A Service Worker for explicit offline support is on the roadmap.

### Does it work in private / incognito mode?

Mostly. Most browsers disable OPFS in private mode, so the platform falls back to storing blobs in IndexedDB. Comics work, but very large archives may exceed the per-origin quota.

## Architecture and self-hosting

### Why static export?

Because the reader does its work in the browser and the library lives in the browser. There is nothing for a server to do. Static export means the host can be any CDN, the cost is essentially zero, and migrations between hosts are trivial.

### Can I self-host?

Yes. `pnpm build:web` produces a fully static `apps/web/out/` directory. Serve it from any web server (nginx, Caddy, S3 + CloudFront, GitHub Pages, your own Cloudflare Pages project, etc.).

### Why Cloudflare Pages and not Workers?

Workers makes sense once there is server-side work — sync, auth, remote catalogs, paid accounts. Until then, it adds deployment complexity without solving a real product problem. The `comic-platform-plan.md` has the full reasoning.

### What's the max comic size?

There is no hard cap, but practical limits:

- IndexedDB has a per-origin quota (varies by browser, typically a few GiB to several tens of GiB on desktop, smaller on mobile).
- OPFS shares the same overall origin quota.
- Cloudflare Pages caps individual *deployed* assets at 25 MiB on the free plan, but that does not apply to user content.

For PDFs, the rendering memory cost scales with page resolution × 4 bytes; very large PDFs may run the tab out of memory before they run the storage out of quota.

### Is there a mobile app?

Not yet. A Tauri / Capacitor wrapper is on the long-term roadmap. The web app works well in mobile browsers in the meantime.

### Is there a desktop app?

Same answer — not yet, but the web app installed as a PWA covers most desktop use cases today.

## Embedding and customization

### Can I embed the reader in my own app?

Yes. `@comics-platform/comic-react` is published as an ES module. Wire `LibraryProvider`, `ExtractorProvider`, and `ComicReaderShell` into your app. See [reader-ui.md](./reader-ui.md).

### Can I use a different storage backend?

Yes. Implement the `ComicStorage` interface and pass it to `LibraryProvider`. The React layer talks to storage through a structural type and never imports `comic-storage` directly. See [storage.md](./storage.md).

### Can I add a new format?

Yes. Implement the `ComicExtractor` interface and register it on `defaultRegistry`. See [extractor-authoring.md](./extractor-authoring.md).

### Can I disable CBR support?

Yes. Just don't import or register `@comics-platform/comic-extractor-rar`. The CBR plugin is optional by design.

### Can I customize keybindings?

Yes. Pass `enabled: false` to `useKeyboardNav()` to disable the default bindings, then attach your own `keydown` handler. The reading-state actions (`nextPage`, `setZoom`, etc.) are all exposed via `useReadingState()`.

## Project policy

### Is it open source?

Yes, MIT licensed. See [legal.md](./legal.md) and the [LICENSE](../LICENSE) file.

### How do I report a bug?

Open a GitHub issue. Include browser, OS, the format and approximate size of the archive, and the console output if there is an error.

### How do I report a security issue?

Email the maintainers privately rather than opening a public issue. See [security.md](./security.md).

### Will you host my comics for me?

No, and we never will. The project is a local-first reader. If you want hosted sync, that is a future opt-in feature you would run on your own infrastructure.
