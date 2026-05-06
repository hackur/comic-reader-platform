import type { ComicStorage, CreateComicStorageOptions } from "./types.js";
import { createDexieStorage } from "./dexie-storage.js";
import { MemoryComicStorage } from "./memory-storage.js";

export * from "./types.js";
export { DexieComicStorage, createDexieStorage } from "./dexie-storage.js";
export { MemoryComicStorage } from "./memory-storage.js";
export {
  OpfsBlobStore,
  OpfsUnavailableError,
  isOpfsAvailable,
} from "./opfs-store.js";

/**
 * Generate a stable id for a new library record.
 */
export function newComicId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Last-resort fallback for environments missing crypto.
  return `comic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Default factory. Returns a Dexie+OPFS-backed storage on the web,
 * or a memory store when explicitly requested or IndexedDB is missing.
 */
export async function createComicStorage(
  opts: CreateComicStorageOptions = {},
): Promise<ComicStorage> {
  if (opts.memory) return new MemoryComicStorage();
  if (typeof indexedDB === "undefined") return new MemoryComicStorage();
  try {
    return await createDexieStorage({
      databaseName: opts.databaseName,
      disableOpfs: opts.disableOpfs,
    });
  } catch {
    return new MemoryComicStorage();
  }
}
