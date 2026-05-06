# Architecture

The Comic Reader Platform is a layered TypeScript monorepo. Each layer has a narrow, explicit job, and dependency direction is strictly one-way. The point of the layering is to keep the React UI ignorant of which archive format produced a page, and to keep the format extractors ignorant of how (or whether) anything is being persisted.

## Top-level shape

```text
apps/web (Next.js 16 static-export shell)
   |
   +-- comic-react       (UI: viewer, library grid, reading-state hooks)
   +-- comic-storage     (Dexie + OPFS adapters)
   +-- comic-worker      (Comlink-exposed Web Worker for off-main-thread work)
   +-- comic-extractor-* (zip / rar / tar / pdf / images)  --+
                                                             |
                                                             v
                                                       comic-core
                                              (types, contracts, registry,
                                               pure utilities only)
```

Read the diagram strictly top-down: every arrow points to a dependency, never back up. `comic-core` has no runtime dependencies of its own, which is what lets it be imported from workers, server tools, and tests without dragging in React or the DOM.

## Package responsibilities

| Package | Role | Allowed deps | Forbidden deps |
| --- | --- | --- | --- |
| `comic-core` | Source-of-truth types, the `ExtractorRegistry`, and pure helpers (`naturalCompare`, `isImageFilename`, `parseComicInfoXml`, `detectFormat`). | None (pure TS). | React, DOM-only APIs, Node built-ins, archive libraries. |
| `comic-extractor-zip` | CBZ via `@zip.js/zip.js`. Reference implementation. | `comic-core`, `@zip.js/zip.js`. | React, storage, other extractors. |
| `comic-extractor-rar` | Optional read-only CBR via `libarchive.js`. | `comic-core`, `libarchive.js`. | RAR creation libraries. |
| `comic-extractor-tar` | CBT (uncompressed tar). | `comic-core` only. | Anything else. |
| `comic-extractor-pdf` | PDF rendering via `pdfjs-dist`. | `comic-core`, `pdfjs-dist`. | Other extractors. |
| `comic-extractor-images` | Image folders / `kind: "images"` sources. | `comic-core` only. | Other extractors. |
| `comic-storage` | `ComicStorage` interface plus Dexie + OPFS implementations and an in-memory adapter for tests. | `comic-core`, Dexie. | React, extractors, viewer code. |
| `comic-react` | React hooks, viewer components, reading-state context, library grid, dropzone. | React, `comic-core`. | Storage internals, extractors directly (uses core types). |
| `comic-worker` | Comlink-exposed Web Worker that opens archives and serves page blobs by `(bookId, index)`. | `comic-core`, extractor packages. | React, storage, the web app. |
| `apps/web` | Composer. Wires packages together, configures deployment. | All of the above. | Nothing leaks back upward. |

## Why the layering matters

- **`comic-core` is the contract.** Every other package implements or consumes its types. Keeping it dependency-free means it can be imported anywhere.
- **Extractors are siblings, not a hierarchy.** Adding a new format adds a new package. Nothing else changes. The viewer never grows a `switch (format)`.
- **Storage is swappable.** `comic-react` talks to storage through a structural interface (`ComicStorage` mirrored in the React package as a type), so the same UI works against IndexedDB, OPFS, an in-memory adapter for tests, or a future remote sync adapter.
- **The web app is a composer.** It picks which extractors to register, where the PDF worker URL points, whether OPFS is enabled. No domain logic lives in `apps/web`.

## What NOT to import where

- Do not import a concrete extractor package from `comic-react`. The viewer should never know the difference between CBZ and PDF.
- Do not import `comic-storage` from `comic-react`. The React package types `ComicStorage` structurally so any matching adapter works; this also keeps Dexie out of the React bundle when consumers don't need it.
- Do not import `react` (or any DOM API) from `comic-core`. The package must remain runnable in a Web Worker and in Node test runners.
- Do not import another extractor from inside an extractor. They are siblings.
- Do not write to IndexedDB or OPFS from inside an extractor. Extractors return a `ComicBook`; persistence is a separate concern.

## The normalized book abstraction

Every extractor produces the same shape:

```ts
interface ComicBook {
  id: string;
  title: string;
  format: ComicFormat;
  pageCount: number;
  pages: ComicPage[];
  cover?: ComicPage;
  archiveName?: string;
  metadata?: ComicInfo;
}

interface ComicPage {
  id: string;
  index: number;
  name: string;
  width?: number;
  height?: number;
  mimeType?: string;
  getBlob(): Promise<Blob>;
  getObjectUrl(): Promise<string>;
  dispose?: () => void;
}
```

Two design choices are doing the heavy lifting here:

1. **`getBlob` / `getObjectUrl` are async closures, not eager fields.** This means an extractor can hand back 400 page handles without decoding, decompressing, or even reading any of them. Decoding only happens when the viewer scrolls a page into range.
2. **`dispose` is optional but always honored.** When the viewer unmounts a page or a different comic is opened, it calls `dispose()` so the extractor can `URL.revokeObjectURL` and drop its cached blob. Without this, long reading sessions would leak hundreds of MiB.

`ComicSource` is the input side of the same contract — `file`, `blob`, `url`, `directory`, or `images`. Every extractor accepts a `ComicSource` and decides via `canOpen()` whether it can handle it.

## Page lifecycle

```text
extractor opens archive
   -> returns ComicBook with N lazy ComicPage handles
   -> viewer mounts page i
   -> page.getObjectUrl() called
        -> getBlob() called
             -> archive.getData(BlobWriter)  [first time only]
             -> blob cached in extractor's closure
        -> URL.createObjectURL(blob) called
        -> object URL cached in extractor's closure
   -> <img src={url}/> renders
   -> viewer unmounts page i (scrolled away, comic closed)
   -> page.dispose()
        -> URL.revokeObjectURL(url)
        -> blob cache entry dropped
```

The cache is per-page and per-extractor. `ZipComicExtractor` and `PdfComicExtractor` both implement this pattern; `RarComicExtractor` follows it as well, with the extra detail that `libarchive.js` may have already materialized blobs at index time depending on its build.

## Cross-thread (`comic-worker`) variant

The worker layer adds one wrinkle. Closures cannot be structured-cloned, so the worker exposes a `SerializedComicBook` shape with plain page handles and resolves blobs by `(bookId, index)` via the Comlink RPC `getPageBlob`. The viewer doesn't see the difference; the React layer treats both shapes uniformly because it only ever calls into the storage / extractor / worker through interfaces.

## Data flow for opening a comic

```text
user drops file
   -> apps/web hands a ComicSource to comic-react
   -> comic-react calls into comic-worker via Comlink
   -> comic-worker asks ExtractorRegistry to resolve a plugin
        (ExtractorRegistry.resolve uses detectFormat, which combines
         filename extension and magic-byte sniffing)
   -> selected comic-extractor-* opens the archive, returns a ComicBook
   -> comic-storage persists metadata + the original archive blob
   -> comic-react renders pages by calling page.getObjectUrl()
```

No layer reaches across the diagram. That is the entire point.
