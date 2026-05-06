# @comics-platform/comic-extractor-rar

Optional, **read-only** RAR/CBR extractor plugin for the comic-platform
reader. Wraps [`libarchive.js`](https://www.npmjs.com/package/libarchive.js)
(a WebAssembly port of `libarchive`) to enumerate and extract image entries
from `.cbr` / `.rar` files.

This package is intentionally shipped as a **separate, optional plugin**.
The core viewer never depends on it. CBZ remains the first-class open
format for the project.

## Install

```sh
pnpm add @comics-platform/comic-extractor-rar libarchive.js
```

## Usage

```ts
import { RarComicExtractor } from "@comics-platform/comic-extractor-rar";

const extractor = new RarComicExtractor();
if (await extractor.canOpen({ kind: "file", file })) {
  const book = await extractor.open(
    { kind: "file", file },
    {
      signal: ac.signal,
      onProgress: (e) => console.log(e.phase, e.loaded, e.total),
    },
  );
  const blob = await book.pages[0].getBlob();
}
```

## Behavior

- `canOpen`: matches files whose name ends in `.cbr` / `.rar`, or whose
  first bytes are the RAR signature `Rar!\x1a\x07`.
- `open`: opens the archive, lists entries, filters to common image
  extensions, sorts naturally with `naturalCompare`, and returns a
  `ComicBook` whose pages extract their blobs lazily.
- Throws `ComicError("PASSWORD_REQUIRED", ...)` for encrypted archives or
  encrypted entries.

## Licensing & legal posture

> Read this section before depending on this package.

- This plugin is **read-only**. RAR creation is **not** supported and is
  out of scope for this project.
- RAR decompression in this plugin is provided through the upstream
  `libarchive.js` WebAssembly build of GNU `libarchive`. `libarchive`
  itself uses the `unrar` source for the proprietary RAR format. The RAR
  format and the `unrar` source carry their own license terms imposed by
  RARLAB, including (at minimum) restrictions against using the source to
  reimplement RAR compression.
- By installing and shipping this optional plugin, you accept the legal
  posture of `libarchive.js` and its bundled `unrar` code. You are
  responsible for reviewing that posture for your own jurisdiction and
  product.
- The wider `@comics-platform/*` project does not redistribute the
  `unrar` sources directly; they reach end users transitively through
  the `libarchive.js` package on npm.
- If you cannot accept those terms, **do not install this plugin**. CBZ
  via `@comics-platform/comic-extractor-zip` is the recommended default
  path and has no comparable legal caveats.

## Worker setup

`libarchive.js` runs its WebAssembly decoder inside a dedicated Web
Worker. The worker bundle (`worker-bundle.js`) and the WASM blob
(`libarchive.wasm`) ship inside the `libarchive.js` package on npm but
are **not** auto-resolved by most bundlers / static-export setups.

This package exposes `configureRarWorker(workerUrl)` which forwards to
`Archive.init({ workerUrl })`. Call it once at startup with a URL that
points to a copy of `worker-bundle.js` you have hosted; the matching
`libarchive.wasm` MUST sit next to it (same directory) so the worker
can load it via a sibling-relative URL.

```ts
import {
  RarComicExtractor,
  configureRarWorker,
} from "@comics-platform/comic-extractor-rar";

configureRarWorker("/vendor/libarchive/worker-bundle.js");
const extractor = new RarComicExtractor();
```

If you don't call `configureRarWorker`, the extractor defaults to
`/vendor/libarchive/worker-bundle.js`, which lines up with the
`tools/scripts/copy-vendor-assets.mjs` helper used by the reference
web app to stage these assets into `apps/web/public/vendor/`.

## API

| Export | Description |
| --- | --- |
| `RarComicExtractor` | Class implementing `ComicExtractor` for `.cbr` / `.rar`. |
| `configureRarWorker(url)` | Set the libarchive.js worker URL (calls `Archive.init`). |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).
- `libarchive.js` `^2.0.2` (WebAssembly build of `libarchive`).

Browser-only. `libarchive.js` spawns its own worker; in static-export
deployments you may need to host its worker assets at a custom URL.

## Notes

- This extractor is browser-oriented. `libarchive.js` initializes a
  worker; consult its docs if you need to host its worker assets at a
  custom URL for static-export deployments.
- Page sort order is determined by entry path using `naturalCompare`
  from `@comics-platform/comic-core`.

## Related

- [`@comics-platform/comic-core`](../comic-core) — extractor contract and registry.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) — recommended CBZ default with no licensing caveats.
- [`@comics-platform/comic-worker`](../comic-worker) — register inside the worker for off-thread CBR extraction.
