# Authoring a Comic Extractor

This guide walks through building a new `ComicExtractor` plugin. Every supported archive format (CBZ, CBR, CBT, PDF, image folders, ...) is implemented as one of these. The viewer never branches on archive type; it just consumes the normalized `ComicBook` your extractor returns.

## The contract

`comic-core` exports the interface every extractor must satisfy:

```ts
export type ComicSource =
  | { kind: "file"; file: File }
  | { kind: "blob"; blob: Blob; name: string }
  | { kind: "url"; url: string; name?: string }
  | { kind: "directory"; handle: FileSystemDirectoryHandle }
  | { kind: "images"; files: File[]; name?: string };

export interface ComicExtractorProgress {
  loaded: number;
  total?: number;
  phase: string;
}

export interface ComicExtractorOpenOptions {
  signal?: AbortSignal;
  onProgress?: (e: ComicExtractorProgress) => void;
}

export interface ComicExtractor {
  canOpen(source: ComicSource): Promise<boolean>;
  open(source: ComicSource, opts?: ComicExtractorOpenOptions): Promise<ComicBook>;
}
```

Two methods, both async. `canOpen` should be cheap (extension check, optionally read magic bytes). `open` does the real work and returns a `ComicBook` containing lazy `ComicPage` handles.

## A complete annotated example

Here is a skeleton `SevenZipComicExtractor` for a hypothetical `comic-extractor-7z` package. The structure mirrors the production `ZipComicExtractor`.

```ts
import {
  ComicError,
  isImageFilename,
  imageMimeFromExt,
  naturalSortBy,
  type ComicBook,
  type ComicExtractor,
  type ComicExtractorOpenOptions,
  type ComicPage,
  type ComicSource,
} from "@comics-platform/comic-core";
// Hypothetical wasm-backed 7z reader.
import { open7z } from "some-7z-wasm";

// "7z\xBC\xAF\x27\x1C"
const SEVENZ_MAGIC = [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] as const;

function nameOf(source: ComicSource): string | undefined {
  switch (source.kind) {
    case "file":      return source.file.name;
    case "blob":      return source.name;
    case "url":       return source.name ?? source.url;
    case "directory": return source.handle.name;
    case "images":    return source.name;
  }
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new ComicError("CANCELLED", "Operation aborted");
  }
}

export class SevenZipComicExtractor implements ComicExtractor {
  // 1. canOpen: cheap, side-effect-free, must not throw.
  async canOpen(source: ComicSource): Promise<boolean> {
    if (source.kind === "directory" || source.kind === "images") return false;
    const name = nameOf(source)?.toLowerCase() ?? "";
    if (name.endsWith(".cb7") || name.endsWith(".7z")) return true;

    // Magic-byte sniff for renamed files.
    const head = await readFirstBytes(source, 6);
    return head ? hasMagic(head, SEVENZ_MAGIC) : false;
  }

  // 2. open: the real work.
  async open(
    source: ComicSource,
    opts: ComicExtractorOpenOptions = {},
  ): Promise<ComicBook> {
    const { signal, onProgress } = opts;
    checkAborted(signal);
    onProgress?.({ loaded: 0, phase: "open" });

    const blob = await sourceToBlob(source);
    checkAborted(signal);

    let archive: Awaited<ReturnType<typeof open7z>>;
    try {
      archive = await open7z(blob);
    } catch (cause) {
      // Distinguish password vs. corruption — the UI shows different recovery paths.
      const msg = String((cause as Error)?.message ?? cause);
      if (/password|encrypt/i.test(msg)) {
        throw new ComicError("PASSWORD_REQUIRED", "7z is encrypted", { cause });
      }
      throw new ComicError("CORRUPT_ARCHIVE", "Failed to open 7z", { cause });
    }

    onProgress?.({ loaded: 0, phase: "list" });

    // 3. Filter to images, then natural-sort by filename.
    const imageEntries = archive.entries.filter((e) => isImageFilename(e.name));
    if (imageEntries.length === 0) {
      throw new ComicError("NO_PAGES", "7z archive has no image pages");
    }
    const sorted = naturalSortBy(imageEntries, (e) => e.name);

    // 4. Build lazy page handles. Do NOT eagerly extract.
    const blobCache = new Map<number, Blob>();
    const urlCache = new Map<number, string>();

    const pages: ComicPage[] = sorted.map((entry, index) => {
      const mime = imageMimeFromExt(entry.name) ?? "application/octet-stream";

      const getBlob = async (): Promise<Blob> => {
        const cached = blobCache.get(index);
        if (cached) return cached;
        try {
          const out = await entry.toBlob(mime);
          blobCache.set(index, out);
          return out;
        } catch (cause) {
          throw new ComicError(
            "LOAD_FAILED",
            `Failed to extract ${entry.name}`,
            { cause },
          );
        }
      };

      return {
        id: `${index}:${entry.name}`,
        index,
        name: entry.name,
        mimeType: mime,
        getBlob,
        async getObjectUrl(): Promise<string> {
          const existing = urlCache.get(index);
          if (existing) return existing;
          const url = URL.createObjectURL(await getBlob());
          urlCache.set(index, url);
          return url;
        },
        dispose() {
          const url = urlCache.get(index);
          if (url) {
            URL.revokeObjectURL(url);
            urlCache.delete(index);
          }
          blobCache.delete(index);
        },
      };
    });

    onProgress?.({ loaded: pages.length, total: pages.length, phase: "ready" });

    const sourceName = nameOf(source);
    const title = (sourceName ?? "Untitled").replace(/\.(cb7|7z)$/i, "");

    return {
      id: `7z:${title}:${pages.length}`,
      title,
      format: "unknown", // see "Adding a new format" below.
      pageCount: pages.length,
      pages,
      cover: pages[0],
      ...(sourceName ? { archiveName: sourceName.split(/[\\/]/).pop() } : {}),
    };
  }
}
```

A few things to notice:

- `naturalSortBy` keeps `page2.jpg` before `page10.jpg`. Always use it for archive entry ordering.
- `isImageFilename` filters out `Thumbs.db`, `ComicInfo.xml`, `.DS_Store`, `__MACOSX/`, etc.
- Pages return `Blob`s, never archive-specific handles. The viewer turns blobs into object URLs on demand.
- Caches live in extractor closures so `dispose()` can drop them.

## Registering

```ts
import { defaultRegistry } from "@comics-platform/comic-core";
import { SevenZipComicExtractor } from "./SevenZipComicExtractor.js";

defaultRegistry.register("cb7", new SevenZipComicExtractor());
```

The registry is keyed by `ComicFormat`, and `detectFormat()` is what maps a `ComicSource` to a format string. To add a brand new format identifier, extend `ComicFormat` in `comic-core/src/index.ts` and teach `detectFormat` to recognize it (extension table + magic-byte branch).

`defaultRegistry.resolve(source)` is what the worker calls; it returns the registered extractor or throws `ComicError("UNSUPPORTED_FORMAT", ...)`.

## Lazy loading optional / large extractors

CBR support pulls in `libarchive.js` plus a WebAssembly file (~1 MiB). Don't ship that to users who only read CBZ. Use a dynamic import gated on user action:

```ts
async function ensureRarExtractor() {
  if (defaultRegistry.has("cbr")) return;
  const { RarComicExtractor } = await import(
    "@comics-platform/comic-extractor-rar"
  );
  defaultRegistry.register("cbr", new RarComicExtractor());
}
```

Trigger this when the dropzone first sees a `.cbr`, or behind a "Enable CBR support" toggle in settings.

## Error handling

Throw `ComicError` with one of these codes. The UI matches on `code`, not on message text.

| Code | When to throw |
| --- | --- |
| `UNSUPPORTED_FORMAT` | The source is structurally wrong for this extractor (e.g. `directory` source passed to `ZipComicExtractor`). |
| `CORRUPT_ARCHIVE` | The container is malformed, truncated, or fails its own integrity checks. |
| `NO_PAGES` | The archive parsed cleanly but contained zero image entries. |
| `LOAD_FAILED` | A network fetch or per-entry decode failed. Prefer this for partial / recoverable failures. |
| `CANCELLED` | An `AbortSignal` fired during open. |
| `PASSWORD_REQUIRED` | The archive (or an entry) is encrypted. |

Always pass the original error via `{ cause }` so devtools can show the underlying stack.

## Cancellation

`open()` accepts `signal?: AbortSignal`. Honor it:

- Check `signal?.aborted` before each long step (network fetch, archive open, getEntries, per-page decode).
- When you hand control to a third-party loader (e.g. `pdfjs.getDocument`), wire its native cancellation: `signal.addEventListener("abort", () => loadingTask.destroy?.())`.
- Throw `ComicError("CANCELLED", "Operation aborted")` when you abort.

## Progress events

Emit progress through `onProgress`. Standard phases used across the project:

| `phase` | Meaning |
| --- | --- |
| `open` | Initial container open (often instantaneous). |
| `loading` | Downloading bytes (URL sources) or reading the source blob. |
| `list` / `indexing` | Walking the archive index / counting entries. |
| `ready` | All page handles created. `loaded` should equal `total`. |

`loaded` and `total` are in whatever unit makes sense for the phase: bytes during `loading`, entries during `indexing`. The UI just displays a determinate bar when `total` is known and a spinner otherwise.

## Filename sorting

Always use `naturalCompare` (or `naturalSortBy`) from `comic-core`. `Array.prototype.sort()` puts `page10.jpg` before `page2.jpg`, which is the wrong order for human-readable page numbering.

## Image filtering

Always use `isImageFilename` from `comic-core`. It knows about the extensions the project considers images (`jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp`, `avif`, `jxl`, `tiff`, `tif`) and rejects common archive cruft: `Thumbs.db`, `desktop.ini`, `.DS_Store`, anything inside `__MACOSX/`.

## ComicInfo.xml

If the archive contains a `ComicInfo.xml` (case-insensitive, anywhere in the tree), read it as text and pass it through `parseComicInfoXml`:

```ts
import { parseComicInfoXml } from "@comics-platform/comic-core";

const metadata = parseComicInfoXml(xmlString);
// metadata.pages?.find(p => p.type === 'FrontCover')?.image
//   gives you a cover override.
book.metadata = metadata;
book.title = metadata?.title ?? metadata?.series ?? defaultTitle;
```

`ComicInfo.title` and `ComicInfo.series` are optional; fall back to the filename. The viewer shows whatever you put on `book.title`.

## Testing

Each extractor package should include:

- A tiny fixture archive in `test/fixtures/` (a few solid-colour PNGs is enough). Keep it under 50 KiB.
- A happy-path Vitest case asserting:
  - `pageCount` matches the fixture,
  - pages are returned in natural order,
  - one decoded page has the expected MIME type and is non-empty.
- Negative cases:
  - Truncated archive should throw `ComicError("CORRUPT_ARCHIVE")`.
  - Archive with no images should throw `ComicError("NO_PAGES")`.
  - Mixed-case extension (`.CBZ`) should still be detected.
- A cancellation case: pass an already-aborted `AbortSignal` and assert `code === "CANCELLED"`.

A minimal example:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SevenZipComicExtractor } from "../src/SevenZipComicExtractor.js";

const fixture = (name: string): File => {
  const buf = readFileSync(resolve(__dirname, "fixtures", name));
  return new File([buf], name);
};

describe("SevenZipComicExtractor", () => {
  it("opens a valid CB7 with three pages in natural order", async () => {
    const ex = new SevenZipComicExtractor();
    const book = await ex.open({ kind: "file", file: fixture("three-pages.cb7") });
    expect(book.pageCount).toBe(3);
    expect(book.pages.map((p) => p.name)).toEqual(["1.png", "2.png", "10.png"]);
    const blob = await book.pages[0]!.getBlob();
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("throws NO_PAGES when archive has no images", async () => {
    const ex = new SevenZipComicExtractor();
    await expect(
      ex.open({ kind: "file", file: fixture("text-only.cb7") }),
    ).rejects.toMatchObject({ code: "NO_PAGES" });
  });
});
```

Use the `happy-dom` Vitest environment for browser-API code (`URL.createObjectURL`, `Blob`); see any existing extractor's `vitest.config.ts` for the pattern.
