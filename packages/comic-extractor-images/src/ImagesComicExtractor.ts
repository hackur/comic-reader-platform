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

interface CollectedFile {
  /** Full path inside the directory tree (e.g. "ch01/p001.jpg"). */
  path: string;
  file: File;
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new ComicError("CANCELLED", "Operation aborted");
  }
}

async function collectFromDirectory(
  handle: FileSystemDirectoryHandle,
  signal: AbortSignal | undefined,
  onProgress: ((e: { loaded: number; total?: number; phase: string }) => void) | undefined,
  prefix = "",
  out: CollectedFile[] = [],
): Promise<CollectedFile[]> {
  // FileSystemDirectoryHandle is async-iterable in modern browsers.
  const iter = (handle as unknown as AsyncIterable<[string, FileSystemHandle]>)[
    Symbol.asyncIterator
  ]();
  while (true) {
    checkAborted(signal);
    const next = await iter.next();
    if (next.done) break;
    const [name, child] = next.value;
    const path = prefix ? `${prefix}/${name}` : name;
    if (child.kind === "file") {
      if (!isImageFilename(name)) continue;
      const file = await (child as FileSystemFileHandle).getFile();
      out.push({ path, file });
      onProgress?.({ loaded: out.length, phase: "scan" });
    } else if (child.kind === "directory") {
      await collectFromDirectory(
        child as FileSystemDirectoryHandle,
        signal,
        onProgress,
        path,
        out,
      );
    }
  }
  return out;
}

function buildPages(items: CollectedFile[]): ComicPage[] {
  const sorted = naturalSortBy(items, (i) => i.path);

  const blobCache = new Map<number, Blob>();
  const urlCache = new Map<number, string>();

  return sorted.map((item, index) => {
    const mime = imageMimeFromExt(item.path) ?? item.file.type ?? "application/octet-stream";

    const getBlob = async (): Promise<Blob> => {
      const cached = blobCache.get(index);
      if (cached) return cached;
      // The File itself is a Blob; if the File has no/incorrect type, wrap
      // to ensure the consumer sees the right MIME.
      const blob =
        item.file.type === mime
          ? (item.file as Blob)
          : new Blob([item.file], { type: mime });
      blobCache.set(index, blob);
      return blob;
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
      id: `${index}:${item.path}`,
      index,
      name: item.path,
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
}

export class ImagesComicExtractor implements ComicExtractor {
  async canOpen(source: ComicSource): Promise<boolean> {
    switch (source.kind) {
      case "directory":
        // Optimistically true; we'll validate on open() that there is at
        // least one image inside.
        return true;
      case "images":
        return source.files.length > 0 && source.files.some((f) => isImageFilename(f.name));
      case "file":
        return isImageFilename(source.file.name);
      case "blob":
        return isImageFilename(source.name);
      case "url":
        return isImageFilename(source.name ?? source.url);
    }
  }

  async open(source: ComicSource, opts: ComicExtractorOpenOptions = {}): Promise<ComicBook> {
    const { signal, onProgress } = opts;
    checkAborted(signal);
    onProgress?.({ loaded: 0, phase: "open" });

    let collected: CollectedFile[] = [];
    let title = "Images";
    let archiveName: string | undefined;

    switch (source.kind) {
      case "directory": {
        title = source.handle.name || "Images";
        archiveName = source.handle.name;
        collected = await collectFromDirectory(source.handle, signal, onProgress);
        break;
      }
      case "images": {
        title = source.name ?? "Images";
        archiveName = source.name;
        collected = source.files
          .filter((f) => isImageFilename(f.name))
          .map((f) => ({ path: f.name, file: f }));
        onProgress?.({ loaded: collected.length, total: collected.length, phase: "scan" });
        break;
      }
      case "file": {
        if (!isImageFilename(source.file.name)) {
          throw new ComicError(
            "UNSUPPORTED_FORMAT",
            "ImagesComicExtractor: file is not an image",
          );
        }
        title = source.file.name;
        archiveName = source.file.name;
        collected = [{ path: source.file.name, file: source.file }];
        break;
      }
      case "blob":
      case "url":
        throw new ComicError(
          "UNSUPPORTED_FORMAT",
          "ImagesComicExtractor only supports file / directory / images sources",
        );
    }

    checkAborted(signal);

    if (collected.length === 0) {
      throw new ComicError("NO_PAGES", "No images found in source");
    }

    const pages = buildPages(collected);
    const cover = pages[0];

    onProgress?.({ loaded: pages.length, total: pages.length, phase: "ready" });

    const book: ComicBook = {
      id: `images:${title}:${pages.length}`,
      title,
      format: "images",
      pageCount: pages.length,
      pages,
      ...(cover ? { cover } : {}),
      ...(archiveName ? { archiveName } : {}),
    };
    return book;
  }
}
