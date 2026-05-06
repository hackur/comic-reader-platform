# Storage

`@comics-platform/comic-storage` is the persistence layer. It owns the IndexedDB schema, the OPFS blob layout, and the fallback chain that keeps everything working when one of those is unavailable.

The defining constraint: nothing leaves the browser. There is no upload, no telemetry, no analytics, no remote sync. A user's library lives entirely on their device.

## Public surface

```ts
import {
  createDexieStorage,
  type ComicStorage,
} from "@comics-platform/comic-storage";

const storage = await createDexieStorage();
// or for tests:
const storage = await createDexieStorage({ memory: true });
```

The `ComicStorage` interface:

```ts
interface ComicStorage {
  addComic(record: LibraryRecord): Promise<void>;
  getComic(id: string): Promise<LibraryRecord | undefined>;
  listComics(opts?: ListComicsOptions): Promise<LibraryRecord[]>;
  deleteComic(id: string): Promise<void>;

  setReadingState(id: string, state: ReadingState): Promise<void>;
  getReadingState(id: string): Promise<ReadingState | undefined>;

  setThumbnail(id: string, blob: Blob): Promise<void>;
  getThumbnail(id: string): Promise<Blob | undefined>;

  setArchiveBlob(id: string, blob: Blob): Promise<void>;
  getArchiveBlob(id: string): Promise<Blob | undefined>;

  clear(): Promise<void>;
}
```

All methods are async and safe to call from either the main thread or a Web Worker.

## IndexedDB schema

The Dexie database is named `comics-platform` (overrideable via `databaseName`). Schema version 1 declares four tables:

### `library`

| Column | Type | Indexed | Notes |
| --- | --- | --- | --- |
| `id` | string | primary key | Stable per-comic ID. Format-extractor decides the scheme (`zip:<title>:<pageCount>`, `pdf:<uuid>`, etc.). |
| `title` | string | yes | Display title. ComicInfo.xml `Title`/`Series` wins over filename. |
| `format` | `ComicFormat` | yes | `cbz` / `cbr` / `cbt` / `pdf` / `images` / `unknown`. |
| `sourceName` | string | yes | Original filename (without path), when known. |
| `addedAt` | ISO string | yes | When `addComic` was first called. |
| `updatedAt` | ISO string | yes | Updated on every `addComic` or reading-state write. |
| `lastReadPage` | number | yes | Most recent page index read. |
| `pageCount` | number | yes | Total page count, when extracted. |
| `coverCacheKey` | string | yes | Reference into the `blobs` table or OPFS. |
| `fileSize` | number | no | Original archive size in bytes. |
| `readingDirection` | `"ltr"` / `"rtl"` | no | Persisted preference for this comic. |
| `viewMode` | `"single"` / `"spread"` / `"strip"` | no | Persisted preference. |
| `metadata` | object | no | Free-form `ComicInfo`-derived metadata. |

### `readingStates`

| Column | Type | Indexed | Notes |
| --- | --- | --- | --- |
| `id` | string | primary key | Same as `library.id`. |
| `state` | `ReadingState` | no | Full reading state (page, zoom, fit, rotation, view mode). |
| `updatedAt` | ISO string | yes | Last write time. |

### `blobs`

Used as a fallback when OPFS is unavailable.

| Column | Type | Indexed | Notes |
| --- | --- | --- | --- |
| `key` | string | primary key | `"<id>:<kind>"` where `kind` is `"archive"` or `"thumb"`. |
| `id` | string | yes | Library ID. Used for `where('id').equals(id).delete()`. |
| `kind` | `"archive"` / `"thumb"` | yes | What kind of blob this is. |
| `blob` | Blob | no | The bytes. |

### `meta`

Free-form key/value store for installation-wide settings. Currently unused by the platform, available for app-level extensions.

## OPFS layout

When OPFS is available (`navigator.storage.getDirectory()` resolves), the storage adapter writes blobs to OPFS instead of the `blobs` IndexedDB table.

```text
<OPFS root>/
└── comics/
    ├── <comic-id-1>/
    │   ├── archive.bin   # original archive bytes
    │   └── thumb.bin     # cover thumbnail
    ├── <comic-id-2>/
    │   └── archive.bin
    └── ...
```

The `comics/` root directory is created on first write. Per-comic subdirectories are created lazily. `deleteComic(id)` removes the corresponding subdirectory recursively. `clear()` removes the whole `comics/` tree.

OPFS is preferred for blobs because it has fewer quota surprises than IndexedDB on the same-origin sandbox and because individual writes don't pay the structured-clone tax.

## Fallback chain

Order of preference for blob storage:

```
OPFS
  └─ if put/get throws OpfsUnavailableError:
       Dexie blobs table
         └─ if IndexedDB itself is unavailable:
              in-memory adapter (createDexieStorage({ memory: true }))
```

Each layer is feature-detected, not assumed:

- `isOpfsAvailable()` checks `navigator.storage.getDirectory` exists and resolves.
- Dexie throws synchronously at construction if IndexedDB is missing; callers fall back to `memory: true`.
- The in-memory adapter is intended for tests and ephemeral sessions; data is lost on reload.

When OPFS is partially available — for example, `getDirectory()` works but `createWritable()` throws on Safari — `OpfsBlobStore.put` raises `OpfsUnavailableError`, and the Dexie `putBlob` wrapper transparently falls through to the IndexedDB row.

## Privacy

No data leaves the browser. The full list:

- All `ComicStorage` writes target IndexedDB and OPFS, both same-origin sandboxes.
- The `comic-storage` package has no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `navigator.sendBeacon`.
- The PDF and ZIP extractors never speak to the network unless the user supplies a `kind: "url"` source themselves — and even then the request goes to the URL the user typed, not to a project-controlled server.
- The web app shell is a static export. The hosting layer (Cloudflare Pages, by default) serves HTML/JS/CSS only. It cannot read the user's IndexedDB.

If you fork the project and add network behaviour, document it in your fork's privacy notes. Do not add it to upstream without an explicit opt-in toggle.

## Writing a custom storage adapter

Any object that satisfies the `ComicStorage` interface is a valid adapter. Common reasons to write one:

- A remote sync layer (push to a CalDAV-style endpoint, encrypt at rest).
- A native-app wrapper (Tauri, Electron) that writes to the host filesystem instead of OPFS.
- A test double with deterministic ordering or fault injection.

Minimum implementation checklist:

1. Implement all twelve methods on `ComicStorage`. Methods that are not meaningful for your backend should still resolve, not throw — for example, an in-memory adapter implements `setThumbnail` by stashing the blob in a `Map`.
2. Pick a stable ID scheme. The platform expects `id` to be unique per logical comic, not per import event.
3. Make `listComics(opts)` honour the `sortBy`, `direction`, `limit`, `offset` options. The library grid relies on server-side (or store-side) sorting for performance; it does not re-sort in memory.
4. Wrap multi-statement writes in a transaction. `deleteComic(id)` must remove from `library`, `readingStates`, and any blob storage atomically (or as atomically as the backend allows).
5. Translate backend-specific errors into clear messages. Don't leak SQL/ORM stack traces to the UI.

A skeleton:

```ts
import type { ComicStorage, LibraryRecord, ReadingState } from "@comics-platform/comic-storage";

export class MyCustomStorage implements ComicStorage {
  async addComic(record: LibraryRecord): Promise<void> { /* ... */ }
  async getComic(id: string): Promise<LibraryRecord | undefined> { /* ... */ }
  async listComics(): Promise<LibraryRecord[]> { /* ... */ }
  async deleteComic(id: string): Promise<void> { /* ... */ }

  async setReadingState(id: string, state: ReadingState): Promise<void> { /* ... */ }
  async getReadingState(id: string): Promise<ReadingState | undefined> { /* ... */ }

  async setThumbnail(id: string, blob: Blob): Promise<void> { /* ... */ }
  async getThumbnail(id: string): Promise<Blob | undefined> { /* ... */ }

  async setArchiveBlob(id: string, blob: Blob): Promise<void> { /* ... */ }
  async getArchiveBlob(id: string): Promise<Blob | undefined> { /* ... */ }

  async clear(): Promise<void> { /* ... */ }
}
```

Pass an instance into `LibraryProvider` from `@comics-platform/comic-react`; the React layer talks to your adapter through a structural type and never imports `comic-storage` directly.

## Schema migrations

If you add an indexed field, bump the Dexie schema version:

```ts
this.version(1).stores({ /* old */ });
this.version(2).stores({
  library: "id, title, format, sourceName, addedAt, updatedAt, lastReadPage, pageCount, coverCacheKey, newField",
  // ...
}).upgrade(async (tx) => {
  await tx.table("library").toCollection().modify((row) => {
    row.newField = deriveFromOld(row);
  });
});
```

Never delete or rename columns from a previous version's `stores()` call — Dexie needs the cumulative history to migrate older clients. Add new versions; don't rewrite old ones.
