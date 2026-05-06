import type { ComicSource, ComicFormat } from "./index.js";
import { isImageFilename, imageMimeFromMagic } from "./image-detect.js";

const EXT_FORMAT: Readonly<Record<string, ComicFormat>> = {
  cbz: "cbz",
  zip: "cbz",
  cbr: "cbr",
  rar: "cbr",
  cbt: "cbt",
  tar: "cbt",
  pdf: "pdf",
};

function nameOfSource(source: ComicSource): string | undefined {
  switch (source.kind) {
    case "file":
      return source.file.name;
    case "blob":
      return source.name;
    case "url":
      return source.name ?? source.url;
    case "directory":
      return source.handle.name;
    case "images":
      return source.name;
  }
}

function extensionOf(name: string | undefined): string | undefined {
  if (!name) return undefined;
  // Strip query/hash for URL inputs.
  const clean = name.split(/[?#]/)[0]!;
  const dot = clean.lastIndexOf(".");
  if (dot < 0 || dot === clean.length - 1) return undefined;
  return clean.slice(dot + 1).toLowerCase();
}

/**
 * Read the first `n` bytes of a source, when possible. Returns an empty
 * Uint8Array when the source cannot supply bytes synchronously (e.g. URLs
 * that the caller has not fetched, directory handles).
 */
export async function getMagicBytes(source: ComicSource, n = 512): Promise<Uint8Array> {
  switch (source.kind) {
    case "file": {
      const slice = source.file.slice(0, n);
      const buf = await slice.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "blob": {
      const slice = source.blob.slice(0, n);
      const buf = await slice.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "images": {
      const first = source.files[0];
      if (!first) return new Uint8Array(0);
      const slice = first.slice(0, n);
      const buf = await slice.arrayBuffer();
      return new Uint8Array(buf);
    }
    case "url":
    case "directory":
      return new Uint8Array(0);
  }
}

function sniffFormatFromBytes(bytes: Uint8Array): ComicFormat | undefined {
  if (bytes.length >= 4) {
    // PK\x03\x04 → zip
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return "cbz";
    }
    // PK\x05\x06 (empty zip) / PK\x07\x08 (spanned) — still zip family
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x05 || bytes[2] === 0x07)) {
      return "cbz";
    }
  }
  if (
    bytes.length >= 7 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x72 &&
    bytes[3] === 0x21 &&
    bytes[4] === 0x1a &&
    bytes[5] === 0x07
  ) {
    return "cbr";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  }
  // tar: "ustar" magic at offset 257
  if (
    bytes.length >= 263 &&
    bytes[257] === 0x75 &&
    bytes[258] === 0x73 &&
    bytes[259] === 0x74 &&
    bytes[260] === 0x61 &&
    bytes[261] === 0x72
  ) {
    return "cbt";
  }
  if (imageMimeFromMagic(bytes)) {
    return "images";
  }
  return undefined;
}

/**
 * Detect the comic format using filename extension AND magic-byte sniffing
 * where possible. Magic-byte detection wins when the two disagree.
 */
export async function detectFormat(source: ComicSource): Promise<ComicFormat> {
  if (source.kind === "directory" || source.kind === "images") {
    return "images";
  }

  const name = nameOfSource(source);
  const ext = extensionOf(name);
  const extFormat = ext ? EXT_FORMAT[ext] : undefined;
  const extIsImage = name ? isImageFilename(name) : false;

  let bytesFormat: ComicFormat | undefined;
  try {
    const bytes = await getMagicBytes(source, 512);
    if (bytes.length > 0) {
      bytesFormat = sniffFormatFromBytes(bytes);
    }
  } catch {
    bytesFormat = undefined;
  }

  if (bytesFormat) return bytesFormat;
  if (extFormat) return extFormat;
  if (extIsImage) return "images";
  return "unknown";
}
