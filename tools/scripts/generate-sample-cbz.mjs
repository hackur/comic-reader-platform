#!/usr/bin/env node
// generate-sample-cbz.mjs
// ---------------------------------------------------------------------------
// Builds a tiny demo CBZ at apps/web/public/sample.cbz using only Node 22+
// built-in APIs (no third-party deps). The CBZ contains 8 PNG pages plus a
// ComicInfo.xml. Each PNG is 1200x1800, rendered with:
//   - a vertical color gradient unique per page
//   - a centered hand-drawn bitmap-font label "SAMPLE READER DEMO"
//   - a centered page number (e.g. "PAGE 3 / 8")
//
// Implementation notes:
//   * PNG: hand-rolled minimal encoder. We build an RGB raster, prepend a
//     filter byte (0 = None) to each scanline, deflate via node:zlib, and
//     wrap in IHDR/IDAT/IEND chunks with proper CRC32s.
//   * Bitmap font: pre-baked 8x16 glyphs for digits 0-9, '/', space, and the
//     letters used in the labels (S A M P L E R D O P G). Glyphs are scaled
//     up at draw time so text is readable on a 1200x1800 page.
//   * CBZ: store-only (compression method 0) ZIP. We emit local file headers,
//     then a central directory, then the EOCD record. CRC32 over uncompressed
//     data is required by the spec; we compute it ourselves.
//   * Self-test: after writing the file we re-read it, check the PK\x03\x04
//     magic, walk the central directory, and assert the expected entry names.
// ---------------------------------------------------------------------------

import { deflateSync } from "node:zlib";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = resolve(REPO_ROOT, "apps", "web", "public");
const OUT_CBZ = resolve(OUT_DIR, "sample.cbz");
const OUT_TXT = resolve(OUT_DIR, "sample.cbz.txt");

const PAGE_W = 1200;
const PAGE_H = 1800;
const PAGE_COUNT = 8;
const TITLE = "SAMPLE READER DEMO";

// ---------------------------------------------------------------------------
// CRC32 (used by both PNG chunks and ZIP entries).
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf, init = 0) {
  let c = (init ^ 0xffffffff) >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// 8x16 bitmap font. Each glyph is 16 rows of 8 bits (MSB = leftmost pixel).
// Hand-drawn for legibility — not pretty. Only the chars we need are defined.
// ---------------------------------------------------------------------------
const FONT = {
  " ": [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  "/": [0x01,0x01,0x02,0x02, 0x04,0x04,0x08,0x08, 0x10,0x10,0x20,0x20, 0x40,0x40,0x80,0x80],
  "0": [0x3C,0x66,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C],
  "1": [0x18,0x38,0x78,0x18, 0x18,0x18,0x18,0x18, 0x18,0x18,0x18,0x18, 0x18,0x18,0x18,0x7E],
  "2": [0x3C,0x66,0xC3,0xC3, 0x03,0x03,0x06,0x0C, 0x18,0x30,0x60,0xC0, 0xC0,0xC0,0xFF,0xFF],
  "3": [0x3C,0x66,0xC3,0x03, 0x03,0x03,0x06,0x1C, 0x1C,0x06,0x03,0x03, 0xC3,0xC3,0x66,0x3C],
  "4": [0x06,0x0E,0x1E,0x36, 0x36,0x66,0x66,0xC6, 0xC6,0xFF,0xFF,0x06, 0x06,0x06,0x06,0x06],
  "5": [0xFF,0xFF,0xC0,0xC0, 0xC0,0xC0,0xFC,0xFE, 0xC7,0x03,0x03,0x03, 0xC3,0xC3,0x66,0x3C],
  "6": [0x3C,0x66,0xC3,0xC0, 0xC0,0xC0,0xFC,0xFE, 0xC7,0xC3,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C],
  "7": [0xFF,0xFF,0x03,0x03, 0x06,0x06,0x0C,0x0C, 0x18,0x18,0x30,0x30, 0x60,0x60,0xC0,0xC0],
  "8": [0x3C,0x66,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C, 0x3C,0x66,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C],
  "9": [0x3C,0x66,0xC3,0xC3, 0xC3,0xC3,0xC3,0x67, 0x3F,0x03,0x03,0x03, 0xC3,0xC3,0x66,0x3C],
  "A": [0x18,0x18,0x3C,0x3C, 0x66,0x66,0xC3,0xC3, 0xC3,0xFF,0xFF,0xC3, 0xC3,0xC3,0xC3,0xC3],
  "D": [0xFC,0xFE,0xC7,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC7,0xFE,0xFC],
  "E": [0xFF,0xFF,0xC0,0xC0, 0xC0,0xC0,0xC0,0xFE, 0xFE,0xC0,0xC0,0xC0, 0xC0,0xC0,0xFF,0xFF],
  "G": [0x3C,0x66,0xC3,0xC0, 0xC0,0xC0,0xC0,0xC0, 0xC7,0xC7,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C],
  "L": [0xC0,0xC0,0xC0,0xC0, 0xC0,0xC0,0xC0,0xC0, 0xC0,0xC0,0xC0,0xC0, 0xC0,0xC0,0xFF,0xFF],
  "M": [0xC3,0xE7,0xFF,0xFF, 0xDB,0xDB,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3],
  "O": [0x3C,0x66,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0xC3,0xC3, 0xC3,0xC3,0x66,0x3C],
  "P": [0xFC,0xFE,0xC7,0xC3, 0xC3,0xC3,0xC7,0xFE, 0xFC,0xC0,0xC0,0xC0, 0xC0,0xC0,0xC0,0xC0],
  "R": [0xFC,0xFE,0xC7,0xC3, 0xC3,0xC3,0xC7,0xFE, 0xFC,0xD8,0xCC,0xC6, 0xC3,0xC3,0xC3,0xC3],
  "S": [0x3C,0x66,0xC3,0xC0, 0xC0,0xE0,0x7C,0x3E, 0x07,0x03,0x03,0x03, 0xC3,0xC3,0x66,0x3C],
};

function glyph(ch) {
  return FONT[ch] || FONT[" "];
}

function measureText(text, scale) {
  return text.length * 8 * scale;
}

// Stamp `text` onto raster at pixel (x, y) with `scale` integer pixel size.
// raster is RGB, row-major. color = [r,g,b].
function stampText(raster, w, h, text, x, y, scale, color) {
  for (let i = 0; i < text.length; i++) {
    const g = glyph(text[i]);
    for (let row = 0; row < 16; row++) {
      const bits = g[row];
      for (let col = 0; col < 8; col++) {
        if ((bits >> (7 - col)) & 1) {
          // Fill the scaled block.
          const px0 = x + i * 8 * scale + col * scale;
          const py0 = y + row * scale;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = px0 + dx;
              const py = py0 + dy;
              if (px < 0 || px >= w || py < 0 || py >= h) continue;
              const o = (py * w + px) * 3;
              raster[o] = color[0];
              raster[o + 1] = color[1];
              raster[o + 2] = color[2];
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoder. RGB (color type 2), 8-bit depth, filter type 0 (None) per row.
// ---------------------------------------------------------------------------
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  // Build raw scanlines: each row prefixed with filter byte 0.
  const rowSize = width * 3;
  const raw = Buffer.alloc((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0;
    rgb.copy(raw, y * (rowSize + 1) + 1, y * rowSize, y * rowSize + rowSize);
  }
  const idat = deflateSync(raw, { level: 6 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Build one page's PNG.
// ---------------------------------------------------------------------------
function makePage(pageNum) {
  const w = PAGE_W;
  const h = PAGE_H;
  const rgb = Buffer.alloc(w * h * 3);

  // Per-page color theme — vertical gradient between two colors.
  const themes = [
    [[245, 230, 200], [220, 130, 80]],   // peach
    [[230, 245, 220], [70, 150, 90]],    // mint
    [[220, 230, 250], [70, 100, 200]],   // sky
    [[245, 220, 230], [200, 70, 130]],   // rose
    [[245, 240, 200], [180, 150, 60]],   // gold
    [[230, 220, 245], [120, 70, 180]],   // violet
    [[210, 240, 240], [40, 140, 150]],   // teal
    [[245, 225, 215], [180, 90, 70]],    // terracotta
  ];
  const [top, bot] = themes[(pageNum - 1) % themes.length];

  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = Math.round(top[0] * (1 - t) + bot[0] * t);
    const g = Math.round(top[1] * (1 - t) + bot[1] * t);
    const b = Math.round(top[2] * (1 - t) + bot[2] * t);
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  }

  // Title near the top.
  const titleScale = 6; // 8*6 = 48px wide per glyph, 16*6 = 96px tall.
  const titleW = measureText(TITLE, titleScale);
  const titleX = Math.round((w - titleW) / 2);
  const titleY = 220;
  stampText(rgb, w, h, TITLE, titleX, titleY, titleScale, [25, 25, 35]);

  // Page label near the center.
  const label = `PAGE ${pageNum} / ${PAGE_COUNT}`;
  const labelScale = 10;
  const labelW = measureText(label, labelScale);
  const labelX = Math.round((w - labelW) / 2);
  const labelY = Math.round((h - 16 * labelScale) / 2);
  stampText(rgb, w, h, label, labelX, labelY, labelScale, [255, 255, 255]);
  // Drop shadow for contrast.
  stampText(rgb, w, h, label, labelX + 3, labelY + 3, labelScale, [0, 0, 0]);
  stampText(rgb, w, h, label, labelX, labelY, labelScale, [255, 255, 255]);

  return encodePng(w, h, rgb);
}

// ---------------------------------------------------------------------------
// ComicInfo.xml
// ---------------------------------------------------------------------------
function makeComicInfoXml() {
  return Buffer.from(
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <Title>Sample Reader Demo</Title>\n` +
    `  <Series>Sample</Series>\n` +
    `  <Number>1</Number>\n` +
    `  <PageCount>${PAGE_COUNT}</PageCount>\n` +
    `  <Summary>Auto-generated demo comic for the open-source comic reader.</Summary>\n` +
    `  <Notes>Generated by tools/scripts/generate-sample-cbz.mjs</Notes>\n` +
    `</ComicInfo>\n`,
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// Store-only ZIP writer.
//
// Layout per entry:
//   - Local file header (LFH, signature 0x04034b50)
//   - File data (uncompressed, compression method 0)
// Then once for the whole archive:
//   - Central directory (one record per entry, signature 0x02014b50)
//   - End of central directory record (EOCD, signature 0x06054b50)
//
// We use compression method 0 (store), so compressedSize == uncompressedSize.
// CRC32 is computed over the raw file data.
// ---------------------------------------------------------------------------
function dosDateTime(date) {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function buildZip(entries) {
  const { dosTime, dosDate } = dosDateTime(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf-8");
    const crc = crc32(data);
    const size = data.length;

    // Local file header (30 bytes + name + extra).
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // signature
    lfh.writeUInt16LE(20, 4);         // version needed (2.0)
    lfh.writeUInt16LE(0x0800, 6);     // general purpose flags: bit 11 = utf8 names
    lfh.writeUInt16LE(0, 8);          // method 0 = stored
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(size, 18);      // compressed size
    lfh.writeUInt32LE(size, 22);      // uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);         // extra field length

    localParts.push(lfh, nameBuf, data);

    // Central directory file header (46 bytes + name + extra + comment).
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // signature
    cdh.writeUInt16LE(20, 4);         // version made by
    cdh.writeUInt16LE(20, 6);         // version needed
    cdh.writeUInt16LE(0x0800, 8);     // gp flags
    cdh.writeUInt16LE(0, 10);         // method
    cdh.writeUInt16LE(dosTime, 12);
    cdh.writeUInt16LE(dosDate, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(size, 20);      // compressed size
    cdh.writeUInt32LE(size, 24);      // uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);         // extra
    cdh.writeUInt16LE(0, 32);         // comment
    cdh.writeUInt16LE(0, 34);         // disk number start
    cdh.writeUInt16LE(0, 36);         // internal attrs
    cdh.writeUInt32LE(0, 38);         // external attrs
    cdh.writeUInt32LE(offset, 42);    // local header offset
    centralParts.push(cdh, nameBuf);

    offset += lfh.length + nameBuf.length + size;
  }

  const localBuf = Buffer.concat(localParts);
  const centralBuf = Buffer.concat(centralParts);

  // EOCD (22 bytes, no comment).
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                      // disk number
  eocd.writeUInt16LE(0, 6);                      // disk where CD starts
  eocd.writeUInt16LE(entries.length, 8);         // CD entries on this disk
  eocd.writeUInt16LE(entries.length, 10);        // total CD entries
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);       // CD offset = end of locals
  eocd.writeUInt16LE(0, 20);                     // comment length

  return Buffer.concat([localBuf, centralBuf, eocd]);
}

// ---------------------------------------------------------------------------
// Self-test: walk the EOCD and central directory and assert entry names.
// ---------------------------------------------------------------------------
function selfTest(zipBytes, expectedNames) {
  if (zipBytes.length < 22) throw new Error("zip too small");
  if (
    zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b ||
    zipBytes[2] !== 0x03 || zipBytes[3] !== 0x04
  ) {
    throw new Error("missing PK\\x03\\x04 magic at offset 0");
  }

  // Locate EOCD by scanning backwards.
  let eocdOff = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i--) {
    if (zipBytes.readUInt32LE(i) === 0x06054b50) { eocdOff = i; break; }
  }
  if (eocdOff < 0) throw new Error("EOCD not found");

  const totalEntries = zipBytes.readUInt16LE(eocdOff + 10);
  const cdOffset = zipBytes.readUInt32LE(eocdOff + 16);

  const seen = [];
  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (zipBytes.readUInt32LE(p) !== 0x02014b50) {
      throw new Error(`bad CD signature at entry ${i}`);
    }
    const nameLen = zipBytes.readUInt16LE(p + 28);
    const extraLen = zipBytes.readUInt16LE(p + 30);
    const commentLen = zipBytes.readUInt16LE(p + 32);
    const name = zipBytes.subarray(p + 46, p + 46 + nameLen).toString("utf-8");
    seen.push(name);
    p += 46 + nameLen + extraLen + commentLen;
  }

  for (const expected of expectedNames) {
    if (!seen.includes(expected)) {
      throw new Error(`expected entry "${expected}" not found in CBZ; saw: ${seen.join(", ")}`);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`[generate-sample-cbz] rendering ${PAGE_COUNT} pages at ${PAGE_W}x${PAGE_H}…`);
  const entries = [];
  for (let i = 1; i <= PAGE_COUNT; i++) {
    const png = makePage(i);
    const name = `pages/page-${String(i).padStart(2, "0")}.png`;
    entries.push({ name, data: png });
    console.log(`  page ${i}: ${png.length.toLocaleString()} bytes`);
  }
  entries.push({ name: "ComicInfo.xml", data: makeComicInfoXml() });

  const zip = buildZip(entries);
  writeFileSync(OUT_CBZ, zip);
  console.log(`[generate-sample-cbz] wrote ${OUT_CBZ} (${zip.length.toLocaleString()} bytes)`);

  // Self-test by reading what we just wrote from disk.
  const onDisk = readFileSync(OUT_CBZ);
  const expected = entries.map((e) => e.name);
  const seen = selfTest(onDisk, expected);
  console.log(`[generate-sample-cbz] self-test OK — entries: ${seen.join(", ")}`);

  const explainer =
    `sample.cbz\n` +
    `==========\n\n` +
    `Auto-generated demo comic for the open-source comic reader.\n` +
    `Created by tools/scripts/generate-sample-cbz.mjs.\n\n` +
    `Contents:\n` +
    `  - ${PAGE_COUNT} PNG pages at ${PAGE_W}x${PAGE_H} (gradient + bitmap-font label)\n` +
    `  - ComicInfo.xml with Series=Sample, Number=1, PageCount=${PAGE_COUNT},\n` +
    `    Title="Sample Reader Demo"\n\n` +
    `Format: store-only ZIP (compression method 0). Hand-rolled PNG encoder\n` +
    `and ZIP writer using only Node 22+ built-ins (node:zlib for deflate).\n\n` +
    `Regenerate with:\n` +
    `  node tools/scripts/generate-sample-cbz.mjs\n`;
  writeFileSync(OUT_TXT, explainer, "utf-8");
  console.log(`[generate-sample-cbz] wrote ${OUT_TXT}`);
}

main();
