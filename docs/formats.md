# Format Support

The platform's design separates "what file did the user give us" from "how do we display it". Each format is implemented in its own extractor package and registered against a `ComicFormat` key in `comic-core`.

## Detection

`detectFormat(source)` decides the format by combining filename extension and magic-byte sniffing. Magic-byte detection wins when the two disagree, which means a CBZ renamed to `.cbr` still opens correctly.

| Magic | First bytes | Maps to |
| --- | --- | --- |
| ZIP local file header | `50 4B 03 04` | `cbz` |
| ZIP empty / spanned | `50 4B 05 06` / `50 4B 07 08` | `cbz` |
| RAR (4.x and 5.x share six-byte prefix) | `52 61 72 21 1A 07` | `cbr` |
| PDF | `25 50 44 46` (`%PDF`) | `pdf` |
| TAR `ustar` | `75 73 74 61 72` at offset 257 | `cbt` |
| Image (JPEG / PNG / GIF / WebP / etc.) | various | `images` |

A `kind: "directory"` or `kind: "images"` `ComicSource` always resolves to `images` regardless of extension.

## Per-format support

| Format | Extensions | Package | Library | License posture | Limitations |
| --- | --- | --- | --- | --- | --- |
| **CBZ** | `.cbz`, `.zip` | `@comics-platform/comic-extractor-zip` | `@zip.js/zip.js` | BSD-3-Clause; fully open. Bundles cleanly into static builds. | None significant. Encrypted ZIPs are reported as corrupt; password-protected ZIPs are not supported in v1. |
| **PDF** | `.pdf` | `@comics-platform/comic-extractor-pdf` | `pdfjs-dist` | Apache-2.0. Mozilla-maintained. | Pages are rendered to PNG via `OffscreenCanvas` at 2× scale; large PDFs use real memory. PDF.js worker URL must be configured at startup. Password-protected PDFs throw `PASSWORD_REQUIRED`. |
| **CBR** | `.cbr`, `.rar` | `@comics-platform/comic-extractor-rar` | `libarchive.js` (libarchive WASM build) | libarchive is BSD-2; libarchive.js has its own LICENSE. RAR's compression is proprietary, so this is **read-only**. See [legal.md](./legal.md). | Optional plugin. Worker + `.wasm` must be self-hosted. RAR5 archives with BLAKE2 checksums work; RAR with encrypted headers throws `PASSWORD_REQUIRED`. Solid archives are slower than CBZ. |
| **CBT** | `.cbt`, `.tar` | `@comics-platform/comic-extractor-tar` | In-tree pure-JS tar parser. | None — uncompressed tar has no compression to license. | Compressed `.tar.gz` / `.tar.xz` not supported in v1. Long-link extensions (PAX) are partially supported. |
| **Image folders** | (drag a folder, or multi-select images) | `@comics-platform/comic-extractor-images` | None. | N/A. | Sorting is purely by filename via `naturalCompare`; nested folder structure is flattened. `FileSystemDirectoryHandle` requires Chromium (Safari/Firefox fall back to multi-select). |

## Future formats

These are tracked in [roadmap.md](./roadmap.md) but not implemented in v1.

| Format | Notes |
| --- | --- |
| **7z / CB7** | LZMA SDK is public domain, but a browser-side decoder needs a wasm build. Candidates: `7z-wasm`, a custom `libarchive.js` build with 7z support. The blocker is bundle size, not licensing. |
| **RSS / web-comic feeds** | Subscribe to a remote feed, materialize each strip as a one-page `ComicBook`. Requires a small fetch + cache layer; would not need server-side state. |
| **MOBI / EPUB-comic** | Fixed-layout EPUB (rendition spread) is the realistic target — flowable EPUB is not a comic format. EPUB-comic implies a CSS layout pass per page. |
| **Avif-only archives** | Already supported via the image extractor; explicit `.avif` archives are a non-goal until tooling appears. |

## Adding a format

See [extractor-authoring.md](./extractor-authoring.md). The short version:

1. Create `packages/comic-extractor-<format>/` with the `ComicExtractor` interface implemented.
2. Add the new key to `ComicFormat` in `comic-core/src/index.ts`.
3. Add the magic-byte branch and extension mapping to `detectFormat`.
4. Register with `defaultRegistry.register('<format>', new MyExtractor())`.
5. Document license posture in your package README and update this table.
