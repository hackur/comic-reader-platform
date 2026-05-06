import type {
  ComicBook,
  ComicExtractor,
  ComicPage,
  ComicSource,
} from "@comics-platform/comic-core";
import { ComicError, naturalCompare } from "@comics-platform/comic-core";
// libarchive.js has loose types; we wrap in a narrow interface below.
import * as libarchive from "libarchive.js";

type ProgressEvent = { loaded: number; total?: number; phase: string };

export interface OpenOpts {
  signal?: AbortSignal;
  onProgress?: (e: ProgressEvent) => void;
}

// Magic: "Rar!\x1a\x07" (5.x adds a trailing 0x01, 4.x ends with 0x00).
const RAR_MAGIC = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);

const IMAGE_RE = /\.(jpe?g|png|gif|webp|bmp|avif|jxl|tiff?)$/i;

interface LibArchiveFileLike {
  file?: Blob | File;
  extract?: () => Promise<Blob | File>;
  // some library variants
  size?: number;
  name?: string;
}

interface LibArchiveModule {
  Archive: {
    init?: (opts?: { workerUrl?: string }) => void;
    open: (file: Blob | File) => Promise<{
      hasEncryptedData?: () => Promise<boolean> | boolean;
      getFilesArray: () => Promise<
        Array<{ file: LibArchiveFileLike; path: string }>
      >;
    }>;
  };
}

function getLib(): LibArchiveModule {
  // libarchive.js exports differ between bundler interop modes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = libarchive;
  const Archive = mod.Archive ?? mod.default?.Archive ?? mod.default;
  if (!Archive || typeof Archive.open !== "function") {
    throw new ComicError(
      "UNSUPPORTED_FORMAT",
      "libarchive.js Archive API is not available in this environment",
    );
  }
  return { Archive } as LibArchiveModule;
}

function getName(source: ComicSource): string {
  switch (source.kind) {
    case "file":
      return source.file.name;
    case "blob":
      return source.name;
    case "url":
      return source.name ?? source.url.split("/").pop() ?? "archive.cbr";
    case "directory":
      return source.handle.name;
    case "images":
      return source.name ?? "images";
    default:
      return "archive.cbr";
  }
}

async function readFirstBytes(
  source: ComicSource,
  n: number,
): Promise<Uint8Array | null> {
  try {
    if (source.kind === "file") {
      return new Uint8Array(await source.file.slice(0, n).arrayBuffer());
    }
    if (source.kind === "blob") {
      return new Uint8Array(await source.blob.slice(0, n).arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}

function hasMagic(bytes: Uint8Array, magic: Uint8Array): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

async function sourceToBlob(source: ComicSource): Promise<Blob | File> {
  switch (source.kind) {
    case "file":
      return source.file;
    case "blob":
      return source.blob;
    case "url": {
      const res = await fetch(source.url);
      if (!res.ok) {
        throw new ComicError(
          "LOAD_FAILED",
          `Failed to fetch RAR: ${res.status} ${res.statusText}`,
        );
      }
      return await res.blob();
    }
    case "directory":
    case "images":
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        "RAR extractor does not support directory or image-list sources",
      );
    default:
      throw new ComicError("UNSUPPORTED_FORMAT", "Unknown source kind");
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ComicError("LOAD_FAILED", "Operation aborted");
  }
}

export class RarComicExtractor implements ComicExtractor {
  async canOpen(source: ComicSource): Promise<boolean> {
    const name = getName(source).toLowerCase();
    if (name.endsWith(".cbr") || name.endsWith(".rar")) return true;
    const head = await readFirstBytes(source, 8);
    if (head && hasMagic(head, RAR_MAGIC)) return true;
    return false;
  }

  async open(source: ComicSource, opts?: OpenOpts): Promise<ComicBook> {
    throwIfAborted(opts?.signal);
    opts?.onProgress?.({ loaded: 0, phase: "loading" });

    const { Archive } = getLib();
    const blob = await sourceToBlob(source);

    let archive: Awaited<ReturnType<typeof Archive.open>>;
    try {
      archive = await Archive.open(blob);
    } catch (cause) {
      const msg = String((cause as Error)?.message ?? cause);
      if (/password|encrypt/i.test(msg)) {
        throw new ComicError("PASSWORD_REQUIRED", "RAR is encrypted", {
          cause,
        });
      }
      throw new ComicError("CORRUPT_ARCHIVE", "Failed to open RAR archive", {
        cause,
      });
    }

    try {
      if (typeof archive.hasEncryptedData === "function") {
        const enc = await archive.hasEncryptedData();
        if (enc) {
          throw new ComicError(
            "PASSWORD_REQUIRED",
            "RAR archive contains encrypted entries",
          );
        }
      }
    } catch (e) {
      if (e instanceof ComicError) throw e;
      // hasEncryptedData failures are non-fatal; continue
    }

    throwIfAborted(opts?.signal);
    opts?.onProgress?.({ loaded: 0, phase: "indexing" });

    let files: Array<{ file: LibArchiveFileLike; path: string }>;
    try {
      files = await archive.getFilesArray();
    } catch (cause) {
      throw new ComicError(
        "CORRUPT_ARCHIVE",
        "Failed to list RAR archive entries",
        { cause },
      );
    }

    const imageEntries = files
      .filter((e) => IMAGE_RE.test(e.path))
      .sort((a, b) => naturalCompare(a.path, b.path));

    const title = getName(source).replace(/\.(cbr|rar)$/i, "");
    const total = imageEntries.length;
    const pages: ComicPage[] = imageEntries.map((entry, idx) => {
      const baseName = entry.path.split("/").pop() ?? entry.path;
      return createLazyRarPage(entry.file, baseName, idx, title, opts?.signal);
    });

    opts?.onProgress?.({ loaded: total, total, phase: "ready" });

    return {
      id: cryptoRandomId(),
      title,
      format: "cbr",
      pageCount: pages.length,
      pages,
      cover: pages[0],
      metadata: {},
    };
  }
}

function createLazyRarPage(
  entry: LibArchiveFileLike,
  name: string,
  index: number,
  title: string,
  signal?: AbortSignal,
): ComicPage {
  let cachedBlob: Promise<Blob> | null = null;
  let cachedUrl: Promise<string> | null = null;

  const extract = async (): Promise<Blob> => {
    if (signal?.aborted) {
      throw new ComicError("LOAD_FAILED", "Operation aborted");
    }
    try {
      // libarchive.js historically exposes `.extract()` returning a File,
      // and in some builds the entry already has a `.file` Blob.
      let out: Blob | File | undefined;
      if (typeof entry.extract === "function") {
        out = await entry.extract();
      } else if (entry.file instanceof Blob) {
        out = entry.file;
      }
      if (!out) {
        throw new ComicError(
          "CORRUPT_ARCHIVE",
          `RAR entry ${name} could not be extracted`,
        );
      }
      return out;
    } catch (cause) {
      if (cause instanceof ComicError) throw cause;
      const msg = String((cause as Error)?.message ?? cause);
      if (/password|encrypt/i.test(msg)) {
        throw new ComicError(
          "PASSWORD_REQUIRED",
          `RAR entry ${name} is encrypted`,
          { cause },
        );
      }
      throw new ComicError(
        "CORRUPT_ARCHIVE",
        `Failed to extract RAR entry ${name}`,
        { cause },
      );
    }
  };

  return {
    id: `${title}#${index}`,
    index,
    name,
    getBlob(): Promise<Blob> {
      if (!cachedBlob) cachedBlob = extract();
      return cachedBlob;
    },
    async getObjectUrl(): Promise<string> {
      if (!cachedUrl) {
        cachedUrl = (async () => URL.createObjectURL(await this.getBlob()))();
      }
      return cachedUrl;
    },
  };
}

function cryptoRandomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fallthrough */
  }
  return `rar-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
