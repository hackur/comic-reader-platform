# @comics-platform/comic-storage

Browser persistence for the comics platform. Metadata lives in IndexedDB
(via Dexie); large binary blobs (archives, thumbnails) prefer OPFS with
graceful fallback to Dexie when OPFS is unavailable.

## Install

```bash
pnpm add @comics-platform/comic-storage @comics-platform/comic-core
```

## Usage

```ts
import { createComicStorage, newComicId } from "@comics-platform/comic-storage";

const storage = await createComicStorage();

await storage.addComic({
  id: newComicId(),
  title: "Untitled",
  format: "cbz",
  sourceName: "untitled.cbz",
  addedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

## Adapters

- `DexieComicStorage` — Dexie-backed primary adapter with optional OPFS blob store.
- `OpfsBlobStore` — `/comics/<id>/{archive,thumb}.bin` layout under
  `navigator.storage.getDirectory()`.
- `MemoryComicStorage` — for tests and storybook.

The factory `createComicStorage({ memory: true })` forces the in-memory
adapter; `disableOpfs: true` keeps blobs in Dexie even if OPFS exists.

## API

| Export | Description |
| --- | --- |
| `createComicStorage(opts?)` | Async factory returning a `ComicStorage`. Picks Dexie+OPFS, or memory if IndexedDB is missing or `opts.memory` is set. |
| `newComicId()` | Stable id generator (`crypto.randomUUID` with fallback). |
| `DexieComicStorage` | Dexie-backed primary adapter class. |
| `createDexieStorage(opts?)` | Async constructor for `DexieComicStorage` that probes OPFS. |
| `MemoryComicStorage` | In-memory adapter for tests and Storybook. |
| `OpfsBlobStore` | OPFS-backed binary blob store at `/comics/<id>/{archive,thumb}.bin`. |
| `OpfsUnavailableError` | Thrown when OPFS access is requested but unsupported. |
| `isOpfsAvailable()` | Runtime probe for `navigator.storage.getDirectory()`. |
| `ComicStorage`, `CreateComicStorageOptions` (types) | The storage contract and factory options. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).
- `dexie` `^4.4.2`.

Browser-only. Requires IndexedDB (always available on modern browsers)
and optionally `navigator.storage.getDirectory()` (OPFS) for blob
storage.

## Related

- [`@comics-platform/comic-core`](../comic-core) — `ComicLibraryItem` and shared types.
- [`@comics-platform/comic-react`](../comic-react) — `LibraryProvider` accepts a `ComicStorage`.
- [`@comics-platform/comic-worker`](../comic-worker) — pairs nicely for off-thread extraction + persistent caching.
