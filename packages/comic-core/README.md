# @comics-platform/comic-core

Format-agnostic core types, interfaces, and the extractor registry that
underpin every other package in the Comics Platform monorepo. It contains
no DOM, React, or storage code — just the contracts (`ComicSource`,
`ComicBook`, `ComicPage`, `ComicExtractor`) plus a handful of shared
utilities (natural sort, error class, format detection, ComicInfo.xml
parser, image-MIME helpers, cancellation linking, typed event emitter).
Every extractor and UI package depends on it.

## Install

```bash
pnpm add @comics-platform/comic-core
```

## Usage

Compose a registry of extractors and open a comic:

```ts
import {
  defaultRegistry,
  detectFormat,
  type ComicSource,
} from "@comics-platform/comic-core";
import { ZipComicExtractor } from "@comics-platform/comic-extractor-zip";

defaultRegistry.register(new ZipComicExtractor());

const source: ComicSource = { kind: "file", file };
const format = await detectFormat(source); // "cbz" | "cbr" | ...
const extractor = await defaultRegistry.findFor(source);
const book = await extractor!.open(source, {
  signal: ac.signal,
  onProgress: (e) => console.log(e.phase, e.loaded, e.total),
});

const firstPageUrl = await book.pages[0].getObjectUrl();
```

Cancellation, error handling, and ComicInfo.xml metadata all flow
through the shared types:

```ts
import { ComicError, isComicError, parseComicInfoXml } from "@comics-platform/comic-core";

try {
  await extractor.open(source, { signal: ac.signal });
} catch (err) {
  if (isComicError(err) && err.code === "CANCELLED") return;
  throw err;
}
```

## API

| Export | Description |
| --- | --- |
| `ComicSource` (type) | Tagged union: `file`, `blob`, `url`, `directory`, `images`. |
| `ComicFormat` (type) | `"cbz" \| "cbr" \| "cbt" \| "pdf" \| "images" \| "unknown"`. |
| `ComicPage` (interface) | Lazy page handle: `getBlob()`, `getObjectUrl()`, optional `dispose()`. |
| `ComicBook` (interface) | Opened comic: id, title, format, pages, optional cover/metadata. |
| `ComicExtractor` (interface) | `canOpen(source)` + `open(source, opts)` contract every extractor implements. |
| `ComicExtractorOpenOptions` (type) | `{ signal?, onProgress? }` passed to `open()`. |
| `ComicExtractorProgress` (type) | `{ loaded, total?, phase }` progress payload. |
| `ReadingState` (interface) | Page index, zoom, rotation, fit mode, direction, view mode. |
| `ComicLibraryItem` (interface) | Library row shape used by storage and UI. |
| `ExtractorRegistry` (class) | Holds extractors and resolves the right one for a source. |
| `defaultRegistry` | Shared `ExtractorRegistry` instance for app-wide registration. |
| `ComicError`, `isComicError` | Typed error class with `ComicErrorCode` enum. |
| `detectFormat`, `getMagicBytes` | Detect a `ComicFormat` from filename and/or magic bytes. |
| `parseComicInfoXml` | Parse a `ComicInfo.xml` string into `ComicInfo`. |
| `ComicInfo`, `ComicInfoPage` (types) | ComicInfo.xml metadata shapes. |
| `naturalCompare`, `naturalSortBy` | Natural-order sort helpers (`p2.jpg < p10.jpg`). |
| `IMAGE_EXTENSIONS`, `isImageFilename`, `imageMimeFromExt`, `imageMimeFromMagic` | Image-detection utilities. |
| `linkSignals` | Combine multiple `AbortSignal`s into one. |
| `TypedEventTarget`, `ComicEventEmitter` | Typed event emitter primitives. |
| `ComicEventMap`, `ProgressEvent`, `PageReadyEvent` (types) | Event payload types. |

## Peer dependencies

None. `comic-core` is a pure-TypeScript package with no runtime
dependencies. It targets modern browsers and Node-equivalent runtimes
that expose `Blob`, `File`, `crypto`, and `AbortSignal`.

## Related

- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) — CBZ/ZIP extractor.
- [`@comics-platform/comic-extractor-tar`](../comic-extractor-tar) — CBT/TAR extractor.
- [`@comics-platform/comic-extractor-pdf`](../comic-extractor-pdf) — PDF extractor.
- [`@comics-platform/comic-extractor-rar`](../comic-extractor-rar) — optional CBR/RAR extractor.
- [`@comics-platform/comic-extractor-images`](../comic-extractor-images) — loose-image / directory extractor.
- [`@comics-platform/comic-storage`](../comic-storage) — IndexedDB + OPFS persistence.
- [`@comics-platform/comic-worker`](../comic-worker) — off-main-thread extraction host.
- [`@comics-platform/comic-react`](../comic-react) — React viewer components.
