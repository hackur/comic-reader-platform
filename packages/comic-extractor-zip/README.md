# @comics-platform/comic-extractor-zip

CBZ / ZIP extractor for the comics platform. Implements the
`ComicExtractor` contract from `@comics-platform/comic-core`.

## Install

```bash
pnpm add @comics-platform/comic-extractor-zip @comics-platform/comic-core
```

## Usage

```ts
import { defaultRegistry } from "@comics-platform/comic-core";
import { ZipComicExtractor } from "@comics-platform/comic-extractor-zip";

defaultRegistry.register(new ZipComicExtractor());

const extractor = new ZipComicExtractor();
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

## API

| Export | Description |
| --- | --- |
| `ZipComicExtractor` | Class implementing `ComicExtractor`. Default export of the package. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).
- `@zip.js/zip.js` `^2.8.26`.

## Scope

- Opens `.cbz` and `.zip` files via filename or `PK\x03\x04` magic bytes.
- Lists archive entries lazily; page bytes are only extracted when
  `ComicPage.getBlob()` is called.
- Sorts pages naturally (`p2.jpg < p10.jpg`) using `naturalCompare`.
- Detects and parses an embedded `ComicInfo.xml` into
  `ComicBook.metadata`. If ComicInfo declares a `FrontCover` page, that
  page becomes `ComicBook.cover`; otherwise the first page is used.
- Honors `AbortSignal` (throws `ComicError("CANCELLED")`).
- Emits progress during entry listing through `onProgress`.

## Underlying library

Backed by [`@zip.js/zip.js`](https://github.com/gildas-lormeau/zip.js)
(`^2.8.26`). zip.js streams individual entries on demand, which fits the
lazy-page contract: the archive is opened once, entries are listed,
and per-page decompression happens only when the reader requests a
specific page.

## Out of scope

- Encrypted/password-protected archives.
- ZIP64 streaming over HTTP ranges (the source must already be a
  resolvable `Blob`/`File`/`url`).
- Writing or modifying archives.

## Related

- [`@comics-platform/comic-core`](../comic-core) — extractor contract and registry.
- [`@comics-platform/comic-extractor-rar`](../comic-extractor-rar) — optional CBR sibling.
- [`@comics-platform/comic-extractor-tar`](../comic-extractor-tar) — CBT sibling.
- [`@comics-platform/comic-worker`](../comic-worker) — register inside the worker for off-thread extraction.
