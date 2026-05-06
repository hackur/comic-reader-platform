import type {
  ComicStorage,
  LibraryRecord,
} from '@comics-platform/comic-storage'

const EXPORT_VERSION = 1

export interface LibraryExportPayload {
  version: number
  exportedAt: string
  comics: LibraryRecord[]
}

/**
 * Serialize all library records (metadata only) to a JSON Blob.
 * Archives, thumbnails, and bookmarks are intentionally omitted to keep the
 * export portable and small. Use a separate flow for full backups.
 */
export async function exportLibrary(storage: ComicStorage): Promise<Blob> {
  const comics = await storage.listComics()
  const payload: LibraryExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    comics,
  }
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
}

export interface ImportResult {
  added: number
  skipped: number
}

/**
 * Parse and import a previously exported library JSON file. Existing comics
 * (matched by id) are skipped rather than overwritten.
 */
export async function importLibrary(
  storage: ComicStorage,
  file: File | Blob,
): Promise<ImportResult> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid library file: not valid JSON')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('version' in parsed) ||
    !('comics' in parsed)
  ) {
    throw new Error('Invalid library file: missing required fields')
  }
  const payload = parsed as Partial<LibraryExportPayload>
  if (payload.version !== EXPORT_VERSION) {
    throw new Error(
      `Unsupported library export version: ${String(payload.version)}`,
    )
  }
  const comics = Array.isArray(payload.comics) ? payload.comics : []

  let added = 0
  let skipped = 0
  for (const record of comics) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
      skipped++
      continue
    }
    const existing = await storage.getComic(record.id)
    if (existing) {
      skipped++
      continue
    }
    await storage.addComic(record as LibraryRecord)
    added++
  }
  return { added, skipped }
}
