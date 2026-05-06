import { Dexie, type EntityTable } from "dexie";
import type { ReadingState } from "@comics-platform/comic-core";
import type {
  BlobKind,
  BlobStore,
  Bookmark,
  ComicStorage,
  LibraryRecord,
  ListComicsOptions,
  Preferences,
  ReadingStateRecord,
} from "./types.js";
import { OpfsBlobStore, OpfsUnavailableError, isOpfsAvailable } from "./opfs-store.js";

interface BlobRow {
  /** Composite key `${id}:${kind}` */
  key: string;
  id: string;
  kind: BlobKind;
  blob: Blob;
}

interface MetaRow {
  key: string;
  value: unknown;
}

/**
 * Dexie subclass holding the library, reading-state, blob fallback, and meta tables.
 * The schema version is intentionally 1; bump when adding indexed fields.
 */
export class DexieComicStorage extends Dexie implements ComicStorage {
  library!: EntityTable<LibraryRecord, "id">;
  readingStates!: EntityTable<ReadingStateRecord, "id">;
  blobs!: EntityTable<BlobRow, "key">;
  meta!: EntityTable<MetaRow, "key">;
  bookmarks!: EntityTable<Bookmark, "id">;

  private readonly opfs: BlobStore | null;

  constructor(name = "comics-platform", opts: { opfs?: BlobStore | null } = {}) {
    super(name);
    this.version(1).stores({
      library:
        "id, title, format, sourceName, addedAt, updatedAt, lastReadPage, pageCount, coverCacheKey",
      readingStates: "id, updatedAt",
      blobs: "key, id, kind",
      meta: "key",
    });
    this.version(2).stores({
      library:
        "id, title, format, sourceName, addedAt, updatedAt, lastReadPage, pageCount, coverCacheKey",
      readingStates: "id, updatedAt",
      blobs: "key, id, kind",
      meta: "key",
      bookmarks: "id, comicId, createdAt",
    });
    this.opfs = opts.opfs ?? null;
  }

  async addComic(record: LibraryRecord): Promise<void> {
    await this.library.put(record);
  }

  async getComic(id: string): Promise<LibraryRecord | undefined> {
    return await this.library.get(id);
  }

  async listComics(opts: ListComicsOptions = {}): Promise<LibraryRecord[]> {
    const sortBy = opts.sortBy ?? "updatedAt";
    const direction =
      opts.direction ?? (sortBy === "title" ? "asc" : "desc");
    let coll = this.library.orderBy(sortBy);
    if (direction === "desc") coll = coll.reverse();
    if (opts.offset) coll = coll.offset(opts.offset);
    if (opts.limit !== undefined) coll = coll.limit(opts.limit);
    return await coll.toArray();
  }

  async deleteComic(id: string): Promise<void> {
    await this.transaction(
      "rw",
      this.library,
      this.readingStates,
      this.blobs,
      this.bookmarks,
      async () => {
        await this.library.delete(id);
        await this.readingStates.delete(id);
        await this.blobs.where("id").equals(id).delete();
        await this.bookmarks.where("comicId").equals(id).delete();
      },
    );
    if (this.opfs) {
      await this.opfs.delete(id).catch(() => {});
    }
  }

  async setReadingState(id: string, state: ReadingState): Promise<void> {
    await this.readingStates.put({
      id,
      state,
      updatedAt: new Date().toISOString(),
    });
  }

  async getReadingState(id: string): Promise<ReadingState | undefined> {
    const row = await this.readingStates.get(id);
    return row?.state;
  }

  async setThumbnail(id: string, blob: Blob): Promise<void> {
    await this.putBlob(id, "thumb", blob);
  }

  async getThumbnail(id: string): Promise<Blob | undefined> {
    return await this.getBlob(id, "thumb");
  }

  async setArchiveBlob(id: string, blob: Blob): Promise<void> {
    await this.putBlob(id, "archive", blob);
  }

  async getArchiveBlob(id: string): Promise<Blob | undefined> {
    return await this.getBlob(id, "archive");
  }

  async getPreferences(): Promise<Preferences | undefined> {
    const row = await this.meta.get("preferences");
    return row?.value as Preferences | undefined;
  }

  async setPreferences(p: Preferences): Promise<void> {
    await this.meta.put({ key: "preferences", value: p });
  }

  async addBookmark(bm: Bookmark): Promise<void> {
    await this.bookmarks.put(bm);
  }

  async listBookmarks(comicId: string): Promise<Bookmark[]> {
    return await this.bookmarks.where("comicId").equals(comicId).toArray();
  }

  async removeBookmark(id: string): Promise<void> {
    await this.bookmarks.delete(id);
  }

  async clear(): Promise<void> {
    await this.transaction(
      "rw",
      [this.library, this.readingStates, this.blobs, this.meta, this.bookmarks],
      async () => {
        await this.library.clear();
        await this.readingStates.clear();
        await this.blobs.clear();
        await this.meta.clear();
        await this.bookmarks.clear();
      },
    );
    if (this.opfs) {
      await this.opfs.clear().catch(() => {});
    }
  }

  private async putBlob(id: string, kind: BlobKind, blob: Blob): Promise<void> {
    if (this.opfs) {
      try {
        await this.opfs.put(id, kind, blob);
        return;
      } catch (err) {
        if (!(err instanceof OpfsUnavailableError)) throw err;
        // fall through to Dexie
      }
    }
    await this.blobs.put({ key: `${id}:${kind}`, id, kind, blob });
  }

  private async getBlob(id: string, kind: BlobKind): Promise<Blob | undefined> {
    if (this.opfs) {
      try {
        const found = await this.opfs.get(id, kind);
        if (found) return found;
      } catch (err) {
        if (!(err instanceof OpfsUnavailableError)) throw err;
      }
    }
    const row = await this.blobs.get(`${id}:${kind}`);
    return row?.blob;
  }
}

/**
 * Factory: returns a ComicStorage configured with Dexie + OPFS by default.
 * Falls back to memory when requested or when IndexedDB is unavailable.
 */
export async function createDexieStorage(opts: {
  databaseName?: string;
  disableOpfs?: boolean;
} = {}): Promise<DexieComicStorage> {
  let opfs: BlobStore | null = null;
  if (!opts.disableOpfs && (await isOpfsAvailable())) {
    opfs = new OpfsBlobStore();
  }
  return new DexieComicStorage(opts.databaseName, { opfs });
}
