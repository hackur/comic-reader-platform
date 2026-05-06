export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "jxl",
  "bmp",
]);

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  jxl: "image/jxl",
  bmp: "image/bmp",
};

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function isImageFilename(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extOf(name));
}

export function imageMimeFromExt(name: string): string | undefined {
  const ext = extOf(name);
  return MIME_BY_EXT[ext];
}

/**
 * Sniff image mime type from leading magic bytes. Returns undefined when
 * nothing matches.
 */
export function imageMimeFromMagic(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  // RIFF????WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // AVIF: ....ftypavif / ftypavis at offset 4
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  ) {
    return "image/avif";
  }
  // JXL codestream FF 0A
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0x0a) {
    return "image/jxl";
  }
  // JXL ISOBMFF container 00 00 00 0C 4A 58 4C 20
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x0c &&
    bytes[4] === 0x4a &&
    bytes[5] === 0x58 &&
    bytes[6] === 0x4c &&
    bytes[7] === 0x20
  ) {
    return "image/jxl";
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }
  return undefined;
}
