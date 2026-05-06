# @comics-platform/comic-worker

Off-main-thread comic extraction harness, wired with [Comlink].

## Install

```bash
pnpm add @comics-platform/comic-worker @comics-platform/comic-core comlink
```

## Why a worker

Archive opening, image decode, and thumbnail generation are CPU-heavy.
Doing them on the main thread blocks the reader UI. This package exposes
an RPC surface so the host app can push that work to a `Worker`.

## Anatomy

- `comic-worker.ts` — the worker-side entry. Imports a caller-configured
  `ExtractorRegistry` and exposes `openComic`, `getPageBlob`,
  `generateThumbnail`, `closeComic` via Comlink. Returns
  `SerializedPage` handles instead of `ComicPage` because the latter
  carries closures that don't survive structured cloning.
- `client.ts` — `createComicWorkerClient(workerUrl)` for the main thread.
- `thumbnail.ts` — OffscreenCanvas + createImageBitmap, 256-wide JPEG by default.

## Usage

Author a worker entry in your app:

```ts
// app/comic-worker.ts
import { configureWorker, exposeWorker } from "@comics-platform/comic-worker/worker";
import { myRegistry } from "./my-registry.js";

configureWorker(myRegistry);
exposeWorker();
```

Then on the main thread:

```ts
import { createComicWorkerClient } from "@comics-platform/comic-worker";

const client = createComicWorkerClient(
  new URL("./comic-worker.ts", import.meta.url),
);
const book = await client.openComic({ kind: "file", file });
const blob = await client.getPageBlob(book.id, 0);
```

[Comlink]: https://github.com/GoogleChromeLabs/comlink

## API

Main-thread entry (`@comics-platform/comic-worker`):

| Export | Description |
| --- | --- |
| `createComicWorkerClient(url, opts?)` | Spawns the worker and returns a typed `ComicWorkerClient` (Comlink proxy). |
| `ComicWorkerClient` (type) | Proxy with `openComic`, `getPageBlob`, `generateThumbnail`, `closeComic`. |
| `CreateComicWorkerClientOptions` (type) | Worker options (e.g. `type: "module"`, `name`). |
| `generateThumbnail(blob, opts?)` | Standalone thumbnail helper (256px JPEG by default). |
| `ComicWorkerApi`, `SerializedComicBook`, `SerializedPage`, `ExtractorRegistry` (types) | RPC surface and DTOs. |

Worker-side entry (`@comics-platform/comic-worker/worker`):

| Export | Description |
| --- | --- |
| `configureWorker(registry)` | Inject the caller's `ExtractorRegistry` before exposing. |
| `exposeWorker(target?)` | Expose the API on a Comlink endpoint (defaults to `self`). |
| `WorkerExtractorRegistry` (type) | Minimal `{ resolve(source) }` contract the worker needs. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).
- `comlink` `^4.4.2`.

Browser-only. Requires `Worker`, `OffscreenCanvas`, and
`createImageBitmap` for thumbnail generation.

## Related

- [`@comics-platform/comic-core`](../comic-core) — `ComicSource`, `ComicBook`, registry types.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) and siblings — register inside the worker's `ExtractorRegistry`.
- [`@comics-platform/comic-storage`](../comic-storage) — persist generated thumbnails on the main thread.
