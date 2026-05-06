# @comics-platform/comic-extractor-tar

CBT / TAR extractor for the comics platform. Implements the
`ComicExtractor` contract from `@comics-platform/comic-core`.

## Install

```bash
pnpm add @comics-platform/comic-extractor-tar @comics-platform/comic-core
```

## Usage

```ts
import { defaultRegistry } from "@comics-platform/comic-core";
import { TarComicExtractor } from "@comics-platform/comic-extractor-tar";

defaultRegistry.register(new TarComicExtractor());

const extractor = new TarComicExtractor();
if (await extractor.canOpen({ kind: "file", file })) {
  const book = await extractor.open(
    { kind: "file", file },
    { signal: ac.signal, onProgress: (e) => console.log(e.phase) },
  );
  const url = await book.pages[0].getObjectUrl();
}
```

## API

| Export | Description |
| --- | --- |
| `TarComicExtractor` | Class implementing `ComicExtractor`. Default export of the package. |
| `parseTar(bytes)` | Pure-TS USTAR/GNU/PAX parser. Takes a `Uint8Array` and returns `TarEntry[]` with offsets into the input buffer. |
| `TarEntry` (type) | `{ name, size, offset, typeflag }` produced by `parseTar`. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).

No third-party runtime dependencies — the TAR parser is in-package.

## Scope

- Opens uncompressed `.cbt` and `.tar` archives via filename or the
  `ustar` magic at offset 257.
- Lazily produces page blobs as `new Blob([uint8.slice(...)], { type })`.
- Sorts pages naturally (`p2.jpg < p10.jpg`).
- Detects and parses an embedded `ComicInfo.xml`.
- Honors `AbortSignal` (throws `ComicError("CANCELLED")`).
- Emits progress for the open / list / ready phases.

## Underlying library

Intentionally **none**. `js-untar` is broken in modern bundlers, so the
package ships its own small pure-TypeScript TAR parser
(`src/tar-parse.ts`) that:

- walks 512-byte header blocks,
- reads the name (offset 0..100), size (offset 124..136 octal), and
  typeflag (offset 156),
- supports the USTAR `prefix` field, GNU long names (`L` typeflag), and
  pax `path=` extended headers (`x` typeflag),
- supports the high-bit base-256 size encoding for huge entries,
- skips directories, symlinks, and other non-file types.

The parser returns offsets into the original buffer, so page payloads
are not copied until `getBlob()` is called.

## Out of scope

- `.tar.gz` / `.tar.bz2` / `.tar.xz` — compressed tarballs are not
  supported. Decompress upstream and pass an uncompressed Blob.
- Writing or modifying archives.

## Related

- [`@comics-platform/comic-core`](../comic-core) — extractor contract and registry.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) — CBZ sibling.
- [`@comics-platform/comic-extractor-rar`](../comic-extractor-rar) — optional CBR sibling.
- [`@comics-platform/comic-worker`](../comic-worker) — register inside the worker for off-thread extraction.
