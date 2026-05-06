export type ComicSource =
  | { kind: "file"; file: File }
  | { kind: "blob"; blob: Blob; name: string }
  | { kind: "url"; url: string; name?: string }
  | { kind: "directory"; handle: FileSystemDirectoryHandle }
  | { kind: "images"; files: File[]; name?: string };

export type ComicFormat = "cbz" | "cbr" | "cbt" | "pdf" | "images" | "unknown";

export interface ComicPage {
  id: string;
  index: number;
  name: string;
  width?: number;
  height?: number;
  mimeType?: string;
  getBlob(): Promise<Blob>;
  getObjectUrl(): Promise<string>;
  /** Optional cleanup hook for revoking object URLs / freeing buffers. */
  dispose?: () => void;
}

export interface ComicBook {
  id: string;
  title: string;
  format: ComicFormat;
  pageCount: number;
  pages: ComicPage[];
  cover?: ComicPage;
  /** Original archive filename (without path), when known. */
  archiveName?: string;
  /** Parsed ComicInfo.xml metadata, when present. */
  metadata?: import("./comic-info.js").ComicInfo;
}

export interface ComicExtractorProgress {
  loaded: number;
  total?: number;
  phase: string;
}

export interface ComicExtractorOpenOptions {
  signal?: AbortSignal;
  onProgress?: (e: ComicExtractorProgress) => void;
}

export interface ComicExtractor {
  canOpen(source: ComicSource): Promise<boolean>;
  open(source: ComicSource, opts?: ComicExtractorOpenOptions): Promise<ComicBook>;
}

export interface ReadingState {
  currentPage: number;
  zoom: number;
  rotation: number;
  fitMode: "width" | "height" | "best" | "original";
  readingDirection: "ltr" | "rtl";
  viewMode: "single" | "spread" | "strip";
}

export interface ComicLibraryItem {
  id: string;
  title: string;
  format: ComicFormat;
  coverUrl?: string;
  lastRead?: Date;
  progress?: number;
  fileSize?: number;
  addedAt: Date;
}

export { naturalCompare, naturalSortBy } from "./natural-sort.js";
export { ComicError, isComicError } from "./errors.js";
export type { ComicErrorCode } from "./errors.js";
export {
  IMAGE_EXTENSIONS,
  isImageFilename,
  imageMimeFromExt,
  imageMimeFromMagic,
} from "./image-detect.js";
export { parseComicInfoXml } from "./comic-info.js";
export type { ComicInfo, ComicInfoPage } from "./comic-info.js";
export { detectFormat, getMagicBytes } from "./format-detect.js";
export { linkSignals } from "./cancellation.js";
export {
  TypedEventTarget,
  ComicEventEmitter,
} from "./events.js";
export type {
  ComicEventMap,
  ProgressEvent,
  PageReadyEvent,
} from "./events.js";
export { ExtractorRegistry, defaultRegistry } from "./extractor-registry.js";
