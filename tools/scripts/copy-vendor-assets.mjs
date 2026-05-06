#!/usr/bin/env node
/**
 * Copies runtime worker / wasm assets from node_modules into
 * apps/web/public/vendor so that the Next.js static export can serve
 * them at stable URLs:
 *
 *   /vendor/libarchive/worker-bundle.js
 *   /vendor/libarchive/libarchive.wasm
 *   /vendor/pdfjs/pdf.worker.min.mjs
 *   /vendor/pdfjs/cmaps/...
 *   /vendor/pdfjs/standard_fonts/...
 *
 * Idempotent: copies only when source size or mtime differs from dest.
 */
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const publicVendor = path.join(repoRoot, "apps", "web", "public", "vendor");

function resolvePackageDir(pkgName) {
  // Try resolving from this script first; fall back to a few well-known
  // workspace package node_modules so the script works even when the
  // dependency is hoisted under a workspace package rather than the root.
  const searchPaths = [
    __dirname,
    path.join(repoRoot, "apps", "web"),
    path.join(repoRoot, "packages", "comic-extractor-rar"),
    path.join(repoRoot, "packages", "comic-extractor-pdf"),
    repoRoot,
  ];
  for (const from of searchPaths) {
    try {
      const pkgJson = require.resolve(`${pkgName}/package.json`, {
        paths: [from],
      });
      return path.dirname(pkgJson);
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `Could not resolve ${pkgName}/package.json from any known workspace location`,
  );
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyIfChanged(src, dest) {
  const srcStat = await fs.stat(src);
  let needsCopy = true;
  try {
    const destStat = await fs.stat(dest);
    if (
      destStat.size === srcStat.size &&
      Math.abs(destStat.mtimeMs - srcStat.mtimeMs) < 2000
    ) {
      needsCopy = false;
    }
  } catch {
    needsCopy = true;
  }
  if (!needsCopy) return false;
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
  // Preserve mtime so subsequent runs are no-ops.
  await fs.utimes(dest, srcStat.atime, srcStat.mtime);
  return true;
}

async function copyDirIfChanged(srcDir, destDir) {
  if (!(await pathExists(srcDir))) return { copied: 0, skipped: 0, missing: true };
  let copied = 0;
  let skipped = 0;
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      const sub = await copyDirIfChanged(s, d);
      copied += sub.copied;
      skipped += sub.skipped;
    } else if (entry.isFile()) {
      const did = await copyIfChanged(s, d);
      if (did) copied += 1;
      else skipped += 1;
    }
  }
  return { copied, skipped, missing: false };
}

async function writeGitignore() {
  const gi = path.join(publicVendor, ".gitignore");
  const content = "*\n!.gitignore\n";
  try {
    const existing = await fs.readFile(gi, "utf8");
    if (existing === content) return false;
  } catch {
    /* fall through */
  }
  await ensureDir(publicVendor);
  await fs.writeFile(gi, content, "utf8");
  return true;
}

async function main() {
  await ensureDir(publicVendor);

  const libarchiveDir = path.join(resolvePackageDir("libarchive.js"), "dist");
  const pdfjsDir = resolvePackageDir("pdfjs-dist");

  const tasks = [
    {
      label: "libarchive worker-bundle.js",
      src: path.join(libarchiveDir, "worker-bundle.js"),
      dest: path.join(publicVendor, "libarchive", "worker-bundle.js"),
    },
    {
      label: "libarchive libarchive.wasm",
      src: path.join(libarchiveDir, "libarchive.wasm"),
      dest: path.join(publicVendor, "libarchive", "libarchive.wasm"),
    },
    {
      label: "pdfjs pdf.worker.min.mjs",
      src: path.join(pdfjsDir, "build", "pdf.worker.min.mjs"),
      dest: path.join(publicVendor, "pdfjs", "pdf.worker.min.mjs"),
    },
  ];

  let copied = 0;
  let skipped = 0;
  for (const t of tasks) {
    if (!(await pathExists(t.src))) {
      console.warn(`[vendor:copy] missing source: ${t.src}`);
      continue;
    }
    const did = await copyIfChanged(t.src, t.dest);
    if (did) {
      copied += 1;
      console.log(`[vendor:copy] copied ${t.label} -> ${path.relative(repoRoot, t.dest)}`);
    } else {
      skipped += 1;
    }
  }

  // Optional: cmaps & standard_fonts directories.
  const optional = [
    {
      label: "pdfjs cmaps",
      src: path.join(pdfjsDir, "cmaps"),
      dest: path.join(publicVendor, "pdfjs", "cmaps"),
    },
    {
      label: "pdfjs standard_fonts",
      src: path.join(pdfjsDir, "standard_fonts"),
      dest: path.join(publicVendor, "pdfjs", "standard_fonts"),
    },
  ];
  for (const o of optional) {
    const result = await copyDirIfChanged(o.src, o.dest);
    if (result.missing) {
      console.log(`[vendor:copy] optional dir not present, skipping: ${o.label}`);
      continue;
    }
    copied += result.copied;
    skipped += result.skipped;
    if (result.copied > 0) {
      console.log(
        `[vendor:copy] ${o.label}: copied ${result.copied} file(s), ${result.skipped} unchanged`,
      );
    }
  }

  const wroteGi = await writeGitignore();
  if (wroteGi) console.log(`[vendor:copy] wrote ${path.relative(repoRoot, path.join(publicVendor, ".gitignore"))}`);

  console.log(`[vendor:copy] done. copied=${copied} unchanged=${skipped}`);
}

main().catch((err) => {
  console.error("[vendor:copy] failed:", err);
  process.exit(1);
});
