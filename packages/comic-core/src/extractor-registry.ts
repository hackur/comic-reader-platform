import type { ComicExtractor, ComicFormat, ComicSource } from "./index.js";
import { detectFormat } from "./format-detect.js";
import { ComicError } from "./errors.js";

export class ExtractorRegistry {
  private readonly extractors = new Map<ComicFormat, ComicExtractor>();

  register(format: ComicFormat, extractor: ComicExtractor): void {
    if (this.extractors.has(format)) {
      // Overwrite-with-warn rather than throwing so HMR re-evaluation does
      // not break the registry. Callers that want to assert single
      // registration should check `has()` first.
      console.warn(
        `[comic-core] ExtractorRegistry: re-registering extractor for format "${format}"; overwriting previous entry.`,
      );
    }
    this.extractors.set(format, extractor);
  }

  unregister(format: ComicFormat): void {
    this.extractors.delete(format);
  }

  has(format: ComicFormat): boolean {
    return this.extractors.has(format);
  }

  get(format: ComicFormat): ComicExtractor | undefined {
    return this.extractors.get(format);
  }

  list(): ComicFormat[] {
    return [...this.extractors.keys()];
  }

  async resolve(source: ComicSource): Promise<ComicExtractor> {
    const format = await detectFormat(source);
    const extractor = this.extractors.get(format);
    if (!extractor) {
      throw new ComicError(
        "UNSUPPORTED_FORMAT",
        `No extractor registered for format "${format}"`,
      );
    }
    return extractor;
  }
}

export const defaultRegistry: ExtractorRegistry = new ExtractorRegistry();
