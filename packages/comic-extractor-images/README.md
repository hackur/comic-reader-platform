# @comics-platform/comic-extractor-images

Loose-image extractor for the comics platform. Implements the
`ComicExtractor` contract from `@comics-platform/comic-core`.

## Install

```bash
pnpm add @comics-platform/comic-extractor-images @comics-platform/comic-core
```

## Usage

```ts
import { defaultRegistry } from "@comics-platform/comic-core";
import { ImagesComicExtractor } from "@comics-platform/comic-extractor-images";

defaultRegistry.register(new ImagesComicExtractor());

// From a directory picker:
const handle = await window.showDirectoryPicker();
const extractor = new ImagesComicExtractor();
const book = await extractor.open(
  { kind: "directory", handle },
  { signal: ac.signal, onProgress: (e) => console.log(e.phase) },
);

// Or from an arbitrary File[]:
const fromFiles = await extractor.open({
  kind: "images",
  files: [file1, file2, file3],
  name: "My chapter",
});
```

## API

| Export | Description |
| --- | --- |
| `ImagesComicExtractor` | Class implementing `ComicExtractor`. Default export of the package. |

## Peer dependencies

Required runtime dependencies (declared in `package.json`):

- `@comics-platform/comic-core` (workspace).

No third-party runtime dependencies. Browser-only — uses the File System
Access API for `directory` sources.

## Scope

This extractor handles three "no-archive" shapes:

1. **`directory` source** — a `FileSystemDirectoryHandle` (from
   `showDirectoryPicker`). The directory is walked recursively, every
   image-extension file is collected, and the page list is sorted
   naturally by full relative path so `ch01/p10.jpg` lands after
   `ch01/p2.jpg`.
2. **`images` source** — a synthetic `{ kind: "images", files: File[] }`
   variant defined in `comic-core`. Useful when the caller already has
   a `File[]` (e.g. drag-and-drop of multiple files, or a flattened
   directory).
3. **`file` source** that is itself an image — treated as a one-page
   "comic" so the viewer's single-image case works without a special
   path in callers.

## Underlying library

None. This package depends only on `@comics-platform/comic-core` and the
File System Access API exposed by the browser.

## Notes

- `canOpen()` returns `true` optimistically for directories. Validation
  that at least one image exists happens during `open()`, which throws
  `ComicError("NO_PAGES")` if the tree is empty.
- Page blobs are zero-copy: when the underlying `File` already has the
  correct MIME, it is returned directly; otherwise it is wrapped in a
  new `Blob` with the corrected `type`.
- Honors `AbortSignal` (throws `ComicError("CANCELLED")`) and emits
  `onProgress` events during directory scanning.

## Related

- [`@comics-platform/comic-core`](../comic-core) — defines the `directory` and `images` source variants.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) — CBZ archive sibling.
- [`@comics-platform/comic-react`](../comic-react) — `ComicDropzone` accepts loose images and directories.
