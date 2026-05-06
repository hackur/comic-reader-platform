import { describe, it, expect } from "vitest";
import {
  BlobReader,
  BlobWriter,
  ZipWriter,
  Uint8ArrayReader,
} from "@zip.js/zip.js";
import { ZipComicExtractor } from "../src/ZipComicExtractor.js";

// Minimal valid 1x1 red PNG.
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

async function buildCbz(pageCount: number): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter("application/zip"));
  for (let i = 1; i <= pageCount; i++) {
    const name = `pages/page-${String(i).padStart(2, "0")}.png`;
    await writer.add(name, new Uint8ArrayReader(RED_PNG_1X1));
  }
  await writer.add(
    "ComicInfo.xml",
    new BlobReader(
      new Blob([
        `<?xml version="1.0" encoding="utf-8"?>` +
          `<ComicInfo><Title>Test</Title><Series>Test</Series>` +
          `<Number>1</Number><PageCount>${pageCount}</PageCount></ComicInfo>`,
      ]),
    ),
  );
  return await writer.close();
}

describe.skipIf(typeof Blob === "undefined")("ZipComicExtractor", () => {
  it("opens a synthetic CBZ and reports the page count", async () => {
    const blob = await buildCbz(3);
    const extractor = new ZipComicExtractor();
    const canOpen = await extractor.canOpen({
      kind: "blob",
      blob,
      name: "test.cbz",
    });
    expect(canOpen).toBe(true);

    const book = await extractor.open({
      kind: "blob",
      blob,
      name: "test.cbz",
    });
    expect(book.pageCount).toBe(3);
    expect(book.format).toBe("cbz");
    expect(book.pages).toHaveLength(3);
  });

  it("getBlob returns the original PNG bytes", async () => {
    const blob = await buildCbz(2);
    const extractor = new ZipComicExtractor();
    const book = await extractor.open({ kind: "blob", blob, name: "test.cbz" });
    const page = book.pages[0]!;
    const out = await page.getBlob();
    const bytes = new Uint8Array(await out.arrayBuffer());
    expect(bytes.length).toBe(RED_PNG_1X1.length);
    // PNG signature
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });

  it("reads ComicInfo.xml metadata", async () => {
    const blob = await buildCbz(4);
    const extractor = new ZipComicExtractor();
    const book = await extractor.open({ kind: "blob", blob, name: "test.cbz" });
    expect(book.metadata?.series).toBe("Test");
    expect(book.metadata?.number).toBe("1");
  });
});
