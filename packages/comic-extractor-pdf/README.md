# @comics-platform/comic-extractor-pdf

PDF extractor plugin for the comic-platform reader. Wraps
[`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist) to render PDF pages
into PNG blobs that conform to the `ComicPage` contract from
`@comics-platform/comic-core`.

## Install

```sh
pnpm add @comics-platform/comic-extractor-pdf pdfjs-dist
```

## Usage

```ts
import {
  PdfComicExtractor,
  configurePdfWorker,
} from "@comics-platform/comic-extractor-pdf";

// Required for static-export apps. Point this at a URL where
// pdf.worker.min.mjs is reachable from the browser.
configurePdfWorker("/pdfjs/pdf.worker.min.mjs");

const extractor = new PdfComicExtractor();
const book = await extractor.open(
  { kind: "file", file: someFile },
  {
    signal: ac.signal,
    onProgress: (e) => console.log(e.phase, e.loaded, e.total),
  },
);

const blob = await book.pages[0].getBlob();
```

## Behavior

- `canOpen`: matches files whose name ends in `.pdf`, or whose first four
  bytes are `%PDF`.
- `open`: opens the PDF eagerly and returns a `ComicBook` with lazy pages.
- Each page renders on demand to an `OffscreenCanvas` at scale `2`, then
  produces a PNG blob. Rendered blobs are cached per page on the page
  instance.
- Throws `ComicError("PASSWORD_REQUIRED", ...)` when pdf.js indicates the
  document is encrypted.

## Worker configuration

The package attempts to set `GlobalWorkerOptions.workerSrc` automatically
using `import.meta.url`, which works in modern bundlers. For static export
builds (Next.js export, Cloudflare Pages, etc.) you should call
`configurePdfWorker(url)` explicitly with a URL you control.

## API

| Export | Description |
| --- | --- |
| `PdfComicExtractor` | Class implementing `ComicExtractor` for PDF files. |
| `configurePdfWorker(url)` | Set `pdfjs-dist`'s `GlobalWorkerOptions.workerSrc` to a URL you control. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).
- `pdfjs-dist` `^5.7.284`.

Browser-only. Expects `OffscreenCanvas` (modern browsers) or, as a
fallback, a DOM `document` for the render canvas.

## Notes

- Rendering at scale 2 trades memory for legibility. Adjust by forking if
  you need a different default.
- The extractor is environment-agnostic but expects either `OffscreenCanvas`
  or `document` to be available at render time.

## Related

- [`@comics-platform/comic-core`](../comic-core) — extractor contract and registry.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) — CBZ sibling.
- [`@comics-platform/comic-worker`](../comic-worker) — register inside the worker for off-thread PDF rendering.
