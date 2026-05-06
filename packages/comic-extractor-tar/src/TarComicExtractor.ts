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
import { parseTar, type TarEntry } from "./tar-parse.js";

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

function endsWithCbtOrTar(name: string | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().split(/[?#]/)[0]!;
  return lower.endsWith(".cbt") || lower.endsWith(".tar");
}

async function sourceToBytes(source: ComicSource): Promise<Uint8Array> {
  switch (source.kind) {
    case "file": {
      const buf = await source.file.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "blob": {
      const buf = await source.blob.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "url": {
      const res = await fetch(source.url);
      if (!res.ok) {
        throw new ComicError("LOAD_FAILED", `HTTP ${res.status} fetching ${source.url}`);
      }
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "directory":
    case "images":
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        "TarComicExtractor cannot open directory or images sources",
      );
  }
}

async function readMagic(source: ComicSource, n: number): Promise<Uint8Array | undefined> {
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
  return base.replace(/\.(cbt|tar)$/i, "");
}

export class TarComicExtractor implements ComicExtractor {
  async canOpen(source: ComicSource): Promise<boolean> {
    if (source.kind === "directory" || source.kind === "images") return false;
    if (endsWithCbtOrTar(nameOf(source))) return true;
    // ustar magic at offset 257.
    const magic = await readMagic(source, 263);
    if (!magic || magic.length < 263) return false;
    return (
      magic[257] === 0x75 && // u
      magic[258] === 0x73 && // s
      magic[259] === 0x74 && // t
      magic[260] === 0x61 && // a
      magic[261] === 0x72 //   r
    );
  }

  async open(source: ComicSource, opts: ComicExtractorOpenOptions = {}): Promise<ComicBook> {
    const { signal, onProgress } = opts;
    checkAborted(signal);

    onProgress?.({ loaded: 0, phase: "open" });
    const bytes = await sourceToBytes(source);
    checkAborted(signal);

    onProgress?.({ loaded: 0, total: bytes.length, phase: "list" });
    let parsed: TarEntry[];
    try {
      parsed = parseTar(bytes);
    } catch (err) {
      if (err instanceof ComicError) throw err;
      throw new ComicError("CORRUPT_ARCHIVE", "Failed to parse tar archive", { cause: err });
    }
    checkAborted(signal);

    const comicInfoEntry = parsed.find((e) => /(^|\/)ComicInfo\.xml$/i.test(e.name));
    let metadata: ComicInfo | undefined;
    if (comicInfoEntry) {
      try {
        const slice = bytes.subarray(
          comicInfoEntry.offset,
          comicInfoEntry.offset + comicInfoEntry.size,
        );
        const xml = new TextDecoder("utf-8").decode(slice);
        metadata = parseComicInfoXml(xml);
      } catch {
        metadata = undefined;
      }
    }

    const imageEntries = parsed.filter((e) => isImageFilename(e.name));
    if (imageEntries.length === 0) {
      throw new ComicError("NO_PAGES", "Tar archive has no image pages");
    }

    const sorted = naturalSortBy(imageEntries, (e) => e.name);

    const blobCache = new Map<number, Blob>();
    const urlCache = new Map<number, string>();

    const pages: ComicPage[] = sorted.map((entry, index) => {
      const mime = imageMimeFromExt(entry.name) ?? "application/octet-stream";

      const getBlob = async (): Promise<Blob> => {
        const cached = blobCache.get(index);
        if (cached) return cached;
        const slice = bytes.slice(entry.offset, entry.offset + entry.size);
        const out = new Blob([slice], { type: mime });
        blobCache.set(index, out);
        return out;
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
        id: `${index}:${entry.name}`,
        index,
        name: entry.name,
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
      id: `tar:${title}:${pages.length}`,
      title,
      format: "cbt",
      pageCount: pages.length,
      pages,
      ...(cover ? { cover } : {}),
      ...(sourceName ? { archiveName: sourceName.split(/[\\/]/).pop() } : {}),
      ...(metadata ? { metadata } : {}),
    };
    return book;
  }
}
