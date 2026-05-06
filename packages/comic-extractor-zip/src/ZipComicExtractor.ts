import {
  BlobReader,
  BlobWriter,
  ZipReader,
  type Entry,
} from "@zip.js/zip.js";
import {
  ComicError,
  isImageFilename,
  imageMimeFromExt,
  naturalSortBy,
  parseComicInfoXml,
  type ComicBook,
  type ComicExtractor,
  type ComicExtractorOpenOptions,
  type ComicInfo,
  type ComicPage,
  type ComicSource,
} from "@comics-platform/comic-core";

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

function nameOf(source: ComicSource): string | undefined {
  switch (source.kind) {
    case "file":
      return source.file.name;
    case "blob":
      return source.name;
    case "url":
      return source.name ?? source.url;
    case "directory":
      return source.handle.name;
    case "images":
      return source.name;
  }
}

function endsWithCbzOrZip(name: string | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().split(/[?#]/)[0]!;
  return lower.endsWith(".cbz") || lower.endsWith(".zip");
}

async function sourceToBlob(source: ComicSource): Promise<Blob> {
  switch (source.kind) {
    case "file":
      return source.file;
    case "blob":
      return source.blob;
    case "url": {
      const res = await fetch(source.url);
      if (!res.ok) {
        throw new ComicError("LOAD_FAILED", `HTTP ${res.status} fetching ${source.url}`);
      }
      return await res.blob();
    }
    case "directory":
    case "images":
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        "ZipComicExtractor cannot open directory or images sources",
      );
  }
}

async function readMagic(source: ComicSource, n = 4): Promise<Uint8Array | undefined> {
  switch (source.kind) {
    case "file": {
      const buf = await source.file.slice(0, n).arrayBuffer();
      return new Uint8Array(buf);
    }
    case "blob": {
      const buf = await source.blob.slice(0, n).arrayBuffer();
      return new Uint8Array(buf);
    }
    default:
      return undefined;
  }
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new ComicError("CANCELLED", "Operation aborted");
  }
}

function titleFromName(name: string | undefined): string {
  if (!name) return "Untitled";
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/\.(cbz|zip)$/i, "");
}

export class ZipComicExtractor implements ComicExtractor {
  async canOpen(source: ComicSource): Promise<boolean> {
    if (source.kind === "directory" || source.kind === "images") return false;

    const name = nameOf(source);
    if (endsWithCbzOrZip(name)) return true;

    const magic = await readMagic(source, 4);
    if (!magic || magic.length < 4) return false;
    return (
      magic[0] === ZIP_MAGIC[0] &&
      magic[1] === ZIP_MAGIC[1] &&
      magic[2] === ZIP_MAGIC[2] &&
      magic[3] === ZIP_MAGIC[3]
    );
  }

  async open(source: ComicSource, opts: ComicExtractorOpenOptions = {}): Promise<ComicBook> {
    const { signal, onProgress } = opts;
    checkAborted(signal);

    const blob = await sourceToBlob(source);
    checkAborted(signal);

    onProgress?.({ loaded: 0, phase: "open" });

    const reader = new ZipReader(new BlobReader(blob));
    let entries: Entry[];
    try {
      entries = await reader.getEntries({
        onprogress: async (loaded: number, total: number) => {
          if (signal?.aborted) return;
          onProgress?.({ loaded, total, phase: "list" });
        },
      });
    } catch (err) {
      if (signal?.aborted) {
        throw new ComicError("CANCELLED", "Operation aborted", { cause: err });
      }
      throw new ComicError("CORRUPT_ARCHIVE", "Failed to read zip entries", { cause: err });
    }
    checkAborted(signal);

    // Locate ComicInfo.xml (case-insensitive, anywhere in archive).
    const comicInfoEntry = entries.find(
      (e) => !e.directory && /(^|\/)ComicInfo\.xml$/i.test(e.filename),
    );

    let metadata: ComicInfo | undefined;
    const comicInfoFile = comicInfoEntry as (Entry & { getData?: (writer: BlobWriter) => Promise<Blob> }) | undefined;
    if (comicInfoFile?.getData) {
      try {
        const xmlBlob: Blob = await comicInfoFile.getData(new BlobWriter("application/xml"));
        const xml = await xmlBlob.text();
        metadata = parseComicInfoXml(xml);
      } catch {
        metadata = undefined;
      }
    }

    const imageEntries = entries.filter(
      (e) => !e.directory && isImageFilename(e.filename),
    );
    if (imageEntries.length === 0) {
      await reader.close().catch(() => undefined);
      throw new ComicError("NO_PAGES", "Zip archive has no image pages");
    }

    const sorted = naturalSortBy(imageEntries, (e) => e.filename);

    const blobCache = new Map<number, Blob>();
    const urlCache = new Map<number, string>();

    const pages: ComicPage[] = sorted.map((entry, index) => {
      const filename = entry.filename;
      const mime = imageMimeFromExt(filename) ?? "application/octet-stream";

      const fileEntry = entry as Entry & { getData?: (writer: BlobWriter) => Promise<Blob> };
      const getBlob = async (): Promise<Blob> => {
        const cached = blobCache.get(index);
        if (cached) return cached;
        if (!fileEntry.getData) {
          throw new ComicError("CORRUPT_ARCHIVE", `Entry ${filename} has no data accessor`);
        }
        try {
          const out = (await fileEntry.getData(new BlobWriter(mime))) as Blob;
          blobCache.set(index, out);
          return out;
        } catch (err) {
          throw new ComicError("LOAD_FAILED", `Failed to extract ${filename}`, { cause: err });
        }
      };

      const getObjectUrl = async (): Promise<string> => {
        const existing = urlCache.get(index);
        if (existing) return existing;
        const b = await getBlob();
        const url = URL.createObjectURL(b);
        urlCache.set(index, url);
        return url;
      };

      return {
        id: `${index}:${filename}`,
        index,
        name: filename,
        mimeType: mime,
        getBlob,
        getObjectUrl,
        dispose: () => {
          const url = urlCache.get(index);
          if (url) {
            URL.revokeObjectURL(url);
            urlCache.delete(index);
          }
          blobCache.delete(index);
        },
      };
    });

    // Close the zip reader once we have entry handles. zip.js entries
    // retain a reference to the underlying reader for lazy decompression.
    // Closing now would invalidate later getData() calls, so we keep it open
    // for the lifetime of the ComicBook by not awaiting close() here.
    // (Callers that need to release resources should drop the ComicBook.)

    let cover: ComicPage | undefined = pages[0];
    const coverIndexFromMeta = metadata?.pages?.find((p) => p.type === "FrontCover")?.image;
    if (
      typeof coverIndexFromMeta === "number" &&
      coverIndexFromMeta >= 0 &&
      coverIndexFromMeta < pages.length
    ) {
      cover = pages[coverIndexFromMeta];
    }

    onProgress?.({ loaded: pages.length, total: pages.length, phase: "ready" });

    const sourceName = nameOf(source);
    const title = metadata?.title ?? metadata?.series ?? titleFromName(sourceName);

    const book: ComicBook = {
      id: `zip:${title}:${pages.length}`,
      title,
      format: "cbz",
      pageCount: pages.length,
      pages,
      ...(cover ? { cover } : {}),
      ...(sourceName ? { archiveName: sourceName.split(/[\\/]/).pop() } : {}),
      ...(metadata ? { metadata } : {}),
    };
    return book;
  }
}
