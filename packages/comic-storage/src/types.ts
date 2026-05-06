import type { ComicBook, ComicFormat, ReadingState } from "@comics-platform/comic-core";

/**
 * Persistent record for a comic in the local library. Mirrors
 * the LibraryRecord shape described in the platform plan but is
 * normalized for IndexedDB indexing.
 */
export interface LibraryRecord {
  id: string;
  title: string;
  format: ComicFormat;
  sourceName: string;
  addedAt: string;
  updatedAt: string;
  lastReadPage?: number;
  pageCount?: number;
  coverCacheKey?: string;
  fileSize?: number;
  readingDirection?: "ltr" | "rtl";
  viewMode?: "single" | "spread" | "strip";
  metadata?: ComicBook["metadata"];
}

export interface ListComicsOptions {
  /** Sort key. Default: updatedAt. */
  sortBy?: "addedAt" | "updatedAt" | "title" | "lastReadPage";
  /** Sort direction. Default: descending for dates, ascending for title. */
  direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ReadingStateRecord {
  id: string;
  state: ReadingState;
  updatedAt: string;
}

/**
 * Storage contract used by the rest of the platform.
 * All methods are async and safe to call from worker or main thread.
 */
export interface ComicStorage {
  addComic(record: LibraryRecord): Promise<void>;
  getComic(id: string): Promise<LibraryRecord | undefined>;
  listComics(opts?: ListComicsOptions): Promise<LibraryRecord[]>;
  deleteComic(id: string): Promise<void>;

  setReadingState(id: string, state: ReadingState): Promise<void>;
  getReadingState(id: string): Promise<ReadingState | undefined>;

  setThumbnail(id: string, blob: Blob): Promise<void>;
  getThumbnail(id: string): Promise<Blob | undefined>;

  setArchiveBlob(id: string, blob: Blob): Promise<void>;
  getArchiveBlob(id: string): Promise<Blob | undefined>;

  clear(): Promise<void>;
}

export interface BlobStore {
  put(id: string, kind: BlobKind, blob: Blob): Promise<void>;
  get(id: string, kind: BlobKind): Promise<Blob | undefined>;
  delete(id: string, kind?: BlobKind): Promise<void>;
  clear(): Promise<void>;
}

export type BlobKind = "archive" | "thumb";

export interface CreateComicStorageOptions {
  /** Force the in-memory adapter (useful for tests). */
  memory?: boolean;
  /** Override the Dexie database name. */
  databaseName?: string;
  /** Skip OPFS even if available; use Dexie blob fallback instead. */
  disableOpfs?: boolean;
}
