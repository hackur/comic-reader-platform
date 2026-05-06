import { ComicError } from "@comics-platform/comic-core";

const BLOCK = 512;

export interface TarEntry {
  name: string;
  size: number;
  /** Byte offset within the source buffer where the file payload starts. */
  offset: number;
  /** Tar type flag. '0' / '\0' = file, '5' = dir, 'L' = GNU long name, etc. */
  typeflag: string;
}

const decoder = new TextDecoder("utf-8", { fatal: false });

function readString(bytes: Uint8Array, off: number, len: number): string {
  let end = off + len;
  for (let i = off; i < off + len; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }
  return decoder.decode(bytes.subarray(off, end));
}

function readOctal(bytes: Uint8Array, off: number, len: number): number {
  // Tar size fields are octal ASCII, NUL- or space-terminated. Some
  // implementations use the high-bit "base-256" encoding for huge sizes;
  // we support that too.
  if (bytes[off] !== undefined && (bytes[off]! & 0x80) !== 0) {
    // First byte: clear the high bit, then big-endian base-256.
    let n = bytes[off]! & 0x7f;
    for (let i = 1; i < len; i++) {
      n = n * 256 + bytes[off + i]!;
    }
    return n;
  }
  const s = readString(bytes, off, len).trim();
  if (!s) return 0;
  const n = parseInt(s, 8);
  return Number.isFinite(n) ? n : 0;
}

function isAllZero(bytes: Uint8Array, off: number, len: number): boolean {
  for (let i = off; i < off + len; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

/**
 * Parse a TAR (USTAR / GNU) buffer into a flat list of file entries.
 * Skips directories and global/extended headers. Resolves GNU long-name
 * entries ('L' typeflag) and pax-style "path" extended headers ('x').
 */
export function parseTar(bytes: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = [];
  let pos = 0;
  let zeroBlocks = 0;
  let pendingLongName: string | undefined;
  let pendingPaxName: string | undefined;

  while (pos + BLOCK <= bytes.length) {
    if (isAllZero(bytes, pos, BLOCK)) {
      zeroBlocks++;
      pos += BLOCK;
      // Two consecutive zero blocks marks end of archive.
      if (zeroBlocks >= 2) break;
      continue;
    }
    zeroBlocks = 0;

    const name = readString(bytes, pos + 0, 100);
    const size = readOctal(bytes, pos + 124, 12);
    const typeflag = readString(bytes, pos + 156, 1) || "0";
    const prefix = readString(bytes, pos + 345, 155);
    const magic = readString(bytes, pos + 257, 6);

    let fullName = name;
    if (magic.startsWith("ustar") && prefix.length > 0) {
      fullName = `${prefix}/${name}`;
    }
    if (pendingLongName) {
      fullName = pendingLongName;
      pendingLongName = undefined;
    }
    if (pendingPaxName) {
      fullName = pendingPaxName;
      pendingPaxName = undefined;
    }

    const dataOffset = pos + BLOCK;
    const padded = Math.ceil(size / BLOCK) * BLOCK;

    if (typeflag === "L") {
      // GNU long name: payload IS the next entry's full path.
      const raw = bytes.subarray(dataOffset, dataOffset + size);
      pendingLongName = decoder.decode(raw).replace(/\0+$/, "");
      pos = dataOffset + padded;
      continue;
    }
    if (typeflag === "x" || typeflag === "g") {
      // pax extended header: parse "path=..." records.
      const raw = decoder.decode(bytes.subarray(dataOffset, dataOffset + size));
      // Records look like "<len> <key>=<value>\n".
      const pathMatch = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(raw);
      if (typeflag === "x" && pathMatch) {
        pendingPaxName = pathMatch[1];
      }
      pos = dataOffset + padded;
      continue;
    }
    if (typeflag === "5") {
      // Directory.
      pos = dataOffset + padded;
      continue;
    }
    if (typeflag !== "0" && typeflag !== "\0" && typeflag !== "") {
      // Unknown / unsupported (symlinks, char devices, etc.) — skip payload.
      pos = dataOffset + padded;
      continue;
    }

    if (dataOffset + size > bytes.length) {
      throw new ComicError("CORRUPT_ARCHIVE", `Tar entry "${fullName}" extends past EOF`);
    }

    entries.push({
      name: fullName,
      size,
      offset: dataOffset,
      typeflag,
    });
    pos = dataOffset + padded;
  }

  return entries;
}
