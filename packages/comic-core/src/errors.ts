export type ComicErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "CORRUPT_ARCHIVE"
  | "NO_PAGES"
  | "LOAD_FAILED"
  | "CANCELLED"
  | "PASSWORD_REQUIRED";

export class ComicError extends Error {
  readonly code: ComicErrorCode;
  readonly cause?: unknown;

  constructor(code: ComicErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = "ComicError";
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    // Preserve prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isComicError(value: unknown): value is ComicError {
  return value instanceof ComicError;
}
