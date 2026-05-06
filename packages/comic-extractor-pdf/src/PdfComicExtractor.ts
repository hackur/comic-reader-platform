import type {
  ComicBook,
  ComicExtractor,
  ComicPage,
  ComicSource,
} from "@comics-platform/comic-core";
import { ComicError } from "@comics-platform/comic-core";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type ProgressEvent = { loaded: number; total?: number; phase: string };

export interface OpenOpts {
  signal?: AbortSignal;
  onProgress?: (e: ProgressEvent) => void;
}

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * Configure the pdf.js worker source. Consumers of static-export apps must
 * call this once at startup with a URL pointing to `pdf.worker.min.mjs`.
 */
export function configurePdfWorker(src: string): void {
  try {
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
      .GlobalWorkerOptions.workerSrc = src;
  } catch (cause) {
    throw new ComicError(
      "LOAD_FAILED",
      "Failed to configure pdf.js worker",
      { cause },
    );
  }
}

// Best-effort default worker URL for static-export browser deployments.
// If a workerSrc has already been set (e.g. by `configurePdfWorker`), we
// leave it alone. Otherwise we point at the path produced by
// tools/scripts/copy-vendor-assets.mjs.
function tryAutoConfigureWorker(): void {
  try {
    const g = (pdfjs as unknown as {
      GlobalWorkerOptions: { workerSrc: string };
    }).GlobalWorkerOptions;
    if (g.workerSrc) return;
    if (typeof window === "undefined") return;
    g.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  } catch {
    /* consumer must call configurePdfWorker */
  }
}

const PDF_CMAP_URL = "/vendor/pdfjs/cmaps/";
const PDF_STANDARD_FONTS_URL = "/vendor/pdfjs/standard_fonts/";

function getName(source: ComicSource): string {
  switch (source.kind) {
    case "file":
      return source.file.name;
    case "blob":
      return source.name;
    case "url":
      return source.name ?? source.url.split("/").pop() ?? "document.pdf";
    case "directory":
      return source.handle.name;
    case "images":
      return source.name ?? "images";
    default:
      return "document.pdf";
  }
}

async function readFirstBytes(
  source: ComicSource,
  n: number,
): Promise<Uint8Array | null> {
  try {
    if (source.kind === "file") {
      const buf = await source.file.slice(0, n).arrayBuffer();
      return new Uint8Array(buf);
    }
    if (source.kind === "blob") {
      const buf = await source.blob.slice(0, n).arrayBuffer();
      return new Uint8Array(buf);
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

async function sourceToData(source: ComicSource): Promise<ArrayBuffer | string> {
  switch (source.kind) {
    case "file":
      return await source.file.arrayBuffer();
    case "blob":
      return await source.blob.arrayBuffer();
    case "url":
      return source.url;
    case "directory":
    case "images":
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        "PDF extractor does not support directory or image-list sources",
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

export class PdfComicExtractor implements ComicExtractor {
  async canOpen(source: ComicSource): Promise<boolean> {
    const name = getName(source).toLowerCase();
    if (name.endsWith(".pdf")) return true;
    const head = await readFirstBytes(source, 4);
    if (head && hasMagic(head, PDF_MAGIC)) return true;
    return false;
  }

  async open(source: ComicSource, opts?: OpenOpts): Promise<ComicBook> {
    tryAutoConfigureWorker();
    throwIfAborted(opts?.signal);
    opts?.onProgress?.({ loaded: 0, phase: "loading" });

    const data = await sourceToData(source);
    let doc: PDFDocumentProxy;
    try {
      const commonOpts = {
        cMapUrl: PDF_CMAP_URL,
        cMapPacked: true,
        standardFontDataUrl: PDF_STANDARD_FONTS_URL,
      };
      const loadingTask =
        typeof data === "string"
          ? pdfjs.getDocument({ url: data, ...commonOpts })
          : pdfjs.getDocument({ data: new Uint8Array(data), ...commonOpts });
      // pdf.js exposes loading progress on the task
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (loadingTask as any).onProgress = (p: { loaded: number; total: number }) => {
        opts?.onProgress?.({
          loaded: p.loaded,
          total: p.total,
          phase: "loading",
        });
      };
      if (opts?.signal) {
        opts.signal.addEventListener("abort", () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void (loadingTask as any).destroy?.();
        });
      }
      doc = await loadingTask.promise;
    } catch (cause) {
      const msg = String((cause as Error)?.message ?? cause);
      if (/password/i.test(msg)) {
        throw new ComicError("PASSWORD_REQUIRED", "PDF is password-protected", {
          cause,
        });
      }
      throw new ComicError("CORRUPT_ARCHIVE", "Failed to open PDF", {
        cause,
      });
    }

    throwIfAborted(opts?.signal);
    const pageCount = doc.numPages;
    const title = getName(source).replace(/\.pdf$/i, "");
    const pages: ComicPage[] = [];

    for (let i = 1; i <= pageCount; i++) {
      pages.push(createLazyPdfPage(doc, i, title));
      opts?.onProgress?.({
        loaded: i,
        total: pageCount,
        phase: "indexing",
      });
    }

    return {
      id: cryptoRandomId(),
      title,
      format: "pdf",
      pageCount,
      pages,
      cover: pages[0],
      metadata: {},
    };
  }
}

function createLazyPdfPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  title: string,
): ComicPage {
  let cachedBlob: Promise<Blob> | null = null;
  let cachedUrl: Promise<string> | null = null;

  const renderBlob = async (): Promise<Blob> => {
    let page: PDFPageProxy;
    try {
      page = await doc.getPage(pageNumber);
    } catch (cause) {
      throw new ComicError(
        "CORRUPT_ARCHIVE",
        `Failed to load PDF page ${pageNumber}`,
        { cause },
      );
    }

    const scale = 2;
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);

    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext("2d");
    } else if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      canvas = c;
      ctx = c.getContext("2d");
    } else {
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        "No canvas implementation available to render PDF page",
      );
    }
    if (!ctx) {
      throw new ComicError("LOAD_FAILED", "Failed to acquire 2D canvas context");
    }

    try {
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).promise;
    } catch (cause) {
      throw new ComicError(
        "CORRUPT_ARCHIVE",
        `Failed to render PDF page ${pageNumber}`,
        { cause },
      );
    } finally {
      page.cleanup();
    }

    if ("convertToBlob" in canvas) {
      return await canvas.convertToBlob({ type: "image/png" });
    }
    const c = canvas as HTMLCanvasElement;
    return await new Promise<Blob>((resolve, reject) => {
      c.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(
                new ComicError(
                  "LOAD_FAILED",
                  `Failed to convert canvas to PNG for page ${pageNumber}`,
                ),
              ),
        "image/png",
      );
    });
  };

  return {
    id: `${title}#${pageNumber}`,
    index: pageNumber - 1,
    name: `${String(pageNumber).padStart(4, "0")}.png`,
    getBlob(): Promise<Blob> {
      if (!cachedBlob) cachedBlob = renderBlob();
      return cachedBlob;
    },
    async getObjectUrl(): Promise<string> {
      if (!cachedUrl) {
        cachedUrl = (async () => {
          const b = await this.getBlob();
          return URL.createObjectURL(b);
        })();
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
  return `pdf-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
