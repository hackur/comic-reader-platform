/// <reference lib="WebWorker" />
import * as Comlink from "comlink";
import type {
  ComicBook,
  ComicExtractor,
  ComicPage,
  ComicSource,
} from "@comics-platform/comic-core";
import { generateThumbnail as generateThumbnailImpl } from "./thumbnail.js";

/**
 * Minimal extractor registry contract. Callers configure the worker by
 * importing this module and assigning a registry via {@link configureWorker}
 * before exposing it. We avoid importing concrete extractor implementations
 * here so the worker stays format-agnostic.
 */
export interface WorkerExtractorRegistry {
  resolve(source: ComicSource): Promise<ComicExtractor>;
}

/**
 * Cross-thread page handle. Closures (getBlob/getObjectUrl) cannot survive
 * structured-clone, so the worker returns this serialized shape and resolves
 * blobs by id+index on demand via {@link ComicWorkerApi.getPageBlob}.
 */
export interface SerializedPage {
  id: string;
  index: number;
  name: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface SerializedComicBook {
  id: string;
  title: string;
  format: ComicBook["format"];
  pageCount: number;
  pages: SerializedPage[];
  cover?: SerializedPage;
  metadata?: ComicBook["metadata"];
}

export interface ComicWorkerApi {
  openComic(source: ComicSource): Promise<SerializedComicBook>;
  getPageBlob(bookId: string, index: number): Promise<Blob>;
  generateThumbnail(blob: Blob, maxWidth?: number): Promise<Blob>;
  closeComic(bookId: string): Promise<void>;
}

let registry: WorkerExtractorRegistry | null = null;

/**
 * Wire the worker up to a concrete extractor registry. Call this from the
 * worker entry script (the file that imports this module) before
 * `Comlink.expose(api)` runs in user code, or before the first RPC.
 */
export function configureWorker(reg: WorkerExtractorRegistry): void {
  registry = reg;
}

const openBooks = new Map<string, ComicBook>();

async function serializePage(page: ComicPage): Promise<SerializedPage> {
  // Probe mime type lazily; keep the call cheap since a full blob fetch
  // would defeat the point of a serialized handle.
  return {
    id: page.id,
    index: page.index,
    name: page.name,
    width: page.width,
    height: page.height,
  };
}

export const api: ComicWorkerApi = {
  async openComic(source: ComicSource): Promise<SerializedComicBook> {
    if (!registry) {
      throw new Error(
        "comic-worker: no ExtractorRegistry configured. Call configureWorker() first.",
      );
    }
    const extractor = await registry.resolve(source);
    const book = await extractor.open(source);
    openBooks.set(book.id, book);
    const pages = await Promise.all(book.pages.map(serializePage));
    const cover = book.cover ? await serializePage(book.cover) : undefined;
    return {
      id: book.id,
      title: book.title,
      format: book.format,
      pageCount: book.pageCount,
      pages,
      cover,
      metadata: book.metadata,
    };
  },

  async getPageBlob(bookId: string, index: number): Promise<Blob> {
    const book = openBooks.get(bookId);
    if (!book) throw new Error(`comic-worker: book ${bookId} is not open`);
    const page = book.pages[index];
    if (!page) throw new Error(`comic-worker: page index ${index} out of range`);
    return await page.getBlob();
  },

  async generateThumbnail(blob: Blob, maxWidth = 256): Promise<Blob> {
    return await generateThumbnailImpl(blob, maxWidth);
  },

  async closeComic(bookId: string): Promise<void> {
    openBooks.delete(bookId);
  },
};

/**
 * Default exposure helper. A user-authored worker entry can simply do:
 *
 * ```ts
 * import { configureWorker, exposeWorker } from "@comics-platform/comic-worker/worker";
 * import { myRegistry } from "./my-registry.js";
 * configureWorker(myRegistry);
 * exposeWorker();
 * ```
 */
export function exposeWorker(target?: Comlink.Endpoint): void {
  Comlink.expose(api, target ?? (self as unknown as Comlink.Endpoint));
}
