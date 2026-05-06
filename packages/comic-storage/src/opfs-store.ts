import type { BlobKind, BlobStore } from "./types.js";

/**
 * Returns true if the current environment exposes an OPFS root we can write to.
 * Feature-detected and never throws.
 */
export async function isOpfsAvailable(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;
    const storage = (navigator as Navigator & {
      storage?: { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
    }).storage;
    if (!storage || typeof storage.getDirectory !== "function") return false;
    const root = await storage.getDirectory();
    return !!root;
  } catch {
    return false;
  }
}

const ROOT_DIR = "comics";

function fileNameFor(kind: BlobKind): string {
  return kind === "archive" ? "archive.bin" : "thumb.bin";
}

/**
 * OPFS-backed binary store. Layout: /comics/<id>/{archive.bin|thumb.bin}.
 * All methods catch errors and translate to undefined / no-op so callers
 * can fall back gracefully when OPFS is unavailable mid-flight.
 */
export class OpfsBlobStore implements BlobStore {
  private rootPromise: Promise<FileSystemDirectoryHandle> | null = null;

  private async root(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootPromise) {
      this.rootPromise = (async () => {
        const storage = (navigator as Navigator & {
          storage: { getDirectory: () => Promise<FileSystemDirectoryHandle> };
        }).storage;
        const root = await storage.getDirectory();
        return await root.getDirectoryHandle(ROOT_DIR, { create: true });
      })();
    }
    return this.rootPromise;
  }

  private async dirFor(id: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    const root = await this.root();
    return await root.getDirectoryHandle(id, { create });
  }

  async put(id: string, kind: BlobKind, blob: Blob): Promise<void> {
    try {
      const dir = await this.dirFor(id, true);
      const file = await dir.getFileHandle(fileNameFor(kind), { create: true });
      // createWritable is not available in all browsers (Safari fallback may need
      // FileSystemSyncAccessHandle, but we keep this path simple and main-thread).
      const writable = await (file as FileSystemFileHandle & {
        createWritable: () => Promise<FileSystemWritableFileStream>;
      }).createWritable();
      try {
        await writable.write(blob);
      } finally {
        await writable.close();
      }
    } catch (err) {
      throw new OpfsUnavailableError("OPFS write failed", { cause: err });
    }
  }

  async get(id: string, kind: BlobKind): Promise<Blob | undefined> {
    try {
      const dir = await this.dirFor(id, false);
      const file = await dir.getFileHandle(fileNameFor(kind), { create: false });
      const f = await file.getFile();
      return f;
    } catch (err) {
      // Missing file is expected; only treat true unavailability as a thrown error.
      if (isNotFound(err)) return undefined;
      throw new OpfsUnavailableError("OPFS read failed", { cause: err });
    }
  }

  async delete(id: string, kind?: BlobKind): Promise<void> {
    try {
      if (kind) {
        const dir = await this.dirFor(id, false);
        await dir.removeEntry(fileNameFor(kind)).catch(() => {});
        return;
      }
      const root = await this.root();
      await root.removeEntry(id, { recursive: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const storage = (navigator as Navigator & {
        storage: { getDirectory: () => Promise<FileSystemDirectoryHandle> };
      }).storage;
      const root = await storage.getDirectory();
      await root.removeEntry(ROOT_DIR, { recursive: true }).catch(() => {});
      this.rootPromise = null;
    } catch {
      // ignore
    }
  }
}

export class OpfsUnavailableError extends Error {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = "OpfsUnavailableError";
    if (opts?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "NotFoundError";
}
