import { describe, it, expect } from "vitest";
import { TarComicExtractor } from "../src/TarComicExtractor.js";
import { parseTar } from "../src/tar-parse.js";

const RED_PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0xb6, 0xee,
  0x56, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

const BLOCK = 512;

function writeAscii(target: Uint8Array, off: number, s: string, len: number): void {
  for (let i = 0; i < len; i++) {
    target[off + i] = i < s.length ? s.charCodeAt(i) : 0;
  }
}

function writeOctal(target: Uint8Array, off: number, value: number, len: number): void {
  // Octal, NUL-terminated, zero-padded — classic USTAR encoding.
  const s = value.toString(8).padStart(len - 1, "0");
  writeAscii(target, off, s, len - 1);
  target[off + len - 1] = 0;
}

function ustarHeader(name: string, size: number): Uint8Array {
  const h = new Uint8Array(BLOCK);
  writeAscii(h, 0, name, 100);
  writeOctal(h, 100, 0o644, 8);     // mode
  writeOctal(h, 108, 0, 8);         // uid
  writeOctal(h, 116, 0, 8);         // gid
  writeOctal(h, 124, size, 12);     // size
  writeOctal(h, 136, 0, 12);        // mtime
  // checksum: spaces while computing
  for (let i = 148; i < 156; i++) h[i] = 0x20;
  h[156] = 0x30;                    // typeflag '0' = regular file
  writeAscii(h, 257, "ustar", 6);
  writeAscii(h, 263, "00", 2);
  // checksum = sum of all bytes (with spaces in checksum field)
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += h[i]!;
  writeOctal(h, 148, sum, 7);
  h[148 + 6] = 0;
  h[148 + 7] = 0x20;
  return h;
}

function buildTar(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  let total = 0;
  for (const { name, data } of entries) {
    const hdr = ustarHeader(name, data.length);
    parts.push(hdr);
    parts.push(data);
    const pad = (BLOCK - (data.length % BLOCK)) % BLOCK;
    if (pad > 0) parts.push(new Uint8Array(pad));
    total += BLOCK + data.length + pad;
  }
  // Two zero blocks = end of archive.
  parts.push(new Uint8Array(BLOCK));
  parts.push(new Uint8Array(BLOCK));
  total += BLOCK * 2;

  const out = new Uint8Array(total);
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}

describe("parseTar", () => {
  it("parses two image entries from a hand-built USTAR buffer", () => {
    const tar = buildTar([
      { name: "page-01.png", data: RED_PNG_1X1 },
      { name: "page-02.png", data: RED_PNG_1X1 },
    ]);
    const parsed = parseTar(tar);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.name).toBe("page-01.png");
    expect(parsed[1]!.name).toBe("page-02.png");
    expect(parsed[0]!.size).toBe(RED_PNG_1X1.length);
  });
});

describe.skipIf(typeof Blob === "undefined")("TarComicExtractor", () => {
  it("opens a synthetic CBT and reports the page count", async () => {
    const tar = buildTar([
      { name: "page-01.png", data: RED_PNG_1X1 },
      { name: "page-02.png", data: RED_PNG_1X1 },
    ]);
    const blob = new Blob([tar], { type: "application/x-tar" });
    const extractor = new TarComicExtractor();
    const canOpen = await extractor.canOpen({ kind: "blob", blob, name: "test.cbt" });
    expect(canOpen).toBe(true);

    const book = await extractor.open({ kind: "blob", blob, name: "test.cbt" });
    expect(book.pageCount).toBe(2);
    expect(book.format).toBe("cbt");
    expect(book.pages).toHaveLength(2);

    const out = await book.pages[0]!.getBlob();
    const bytes = new Uint8Array(await out.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });
});
