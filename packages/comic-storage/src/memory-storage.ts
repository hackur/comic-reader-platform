import type { ReadingState } from "@comics-platform/comic-core";
import type {
  Bookmark,
  ComicStorage,
  LibraryRecord,
  ListComicsOptions,
  Preferences,
} from "./types.js";

/**
 * In-memory ComicStorage suitable for tests and storybook contexts.
 * Not persisted across reloads.
 */
export class MemoryComicStorage implements ComicStorage {
  private readonly library = new Map<string, LibraryRecord>();
  private readonly reading = new Map<string, ReadingState>();
  private readonly thumbs = new Map<string, Blob>();
  private readonly archives = new Map<string, Blob>();
  private prefs: Preferences | undefined;
  private readonly bookmarks = new Map<string, Bookmark>();

  async addComic(record: LibraryRecord): Promise<void> {
    this.library.set(record.id, { ...record });
  }

  async getComic(id: string): Promise<LibraryRecord | undefined> {
    const r = this.library.get(id);
    return r ? { ...r } : undefined;
  }

  async listComics(opts: ListComicsOptions = {}): Promise<LibraryRecord[]> {
    const sortBy = opts.sortBy ?? "updatedAt";
    const direction =
      opts.direction ?? (sortBy === "title" ? "asc" : "desc");
    const all = Array.from(this.library.values()).map((r) => ({ ...r }));
    all.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return av < bv ? -1 : 1;
    });
    if (direction === "desc") all.reverse();
    const offset = opts.offset ?? 0;
    const end = opts.limit !== undefined ? offset + opts.limit : undefined;
    return all.slice(offset, end);
  }

  async deleteComic(id: string): Promise<void> {
    this.library.delete(id);
    this.reading.delete(id);
    this.thumbs.delete(id);
    this.archives.delete(id);
    for (const [bmId, bm] of this.bookmarks) {
      if (bm.comicId === id) this.bookmarks.delete(bmId);
    }
  }

  async setReadingState(id: string, state: ReadingState): Promise<void> {
    this.reading.set(id, { ...state });
  }

  async getReadingState(id: string): Promise<ReadingState | undefined> {
    const s = this.reading.get(id);
    return s ? { ...s } : undefined;
  }

  async setThumbnail(id: string, blob: Blob): Promise<void> {
    this.thumbs.set(id, blob);
  }

  async getThumbnail(id: string): Promise<Blob | undefined> {
    return this.thumbs.get(id);
  }

  async setArchiveBlob(id: string, blob: Blob): Promise<void> {
    this.archives.set(id, blob);
  }

  async getArchiveBlob(id: string): Promise<Blob | undefined> {
    return this.archives.get(id);
  }

  async getPreferences(): Promise<Preferences | undefined> {
    return this.prefs ? { ...this.prefs } : undefined;
  }

  async setPreferences(p: Preferences): Promise<void> {
    this.prefs = { ...p };
  }

  async addBookmark(bm: Bookmark): Promise<void> {
    this.bookmarks.set(bm.id, { ...bm });
  }

  async listBookmarks(comicId: string): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values())
      .filter((bm) => bm.comicId === comicId)
      .map((bm) => ({ ...bm }));
  }

  async removeBookmark(id: string): Promise<void> {
    this.bookmarks.delete(id);
  }

  async clear(): Promise<void> {
    this.library.clear();
    this.reading.clear();
    this.thumbs.clear();
    this.archives.clear();
    this.bookmarks.clear();
    this.prefs = undefined;
  }
}
