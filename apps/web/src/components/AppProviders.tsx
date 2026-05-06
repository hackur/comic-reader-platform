'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ExtractorProvider,
  LibraryProvider,
  ThemeProvider,
  type LibraryImporter,
  type ThemePreference,
} from '@comics-platform/comic-react'
import { detectFormat } from '@comics-platform/comic-core'
import {
  newComicId,
  type ComicStorage,
  type LibraryRecord,
} from '@comics-platform/comic-storage'
import { buildRegistry, ensurePdfSupport, ensureRarSupport } from '@/lib/extractors'
import { getStorage } from '@/lib/storage'

export function AppProviders({ children }: { children: ReactNode }) {
  const registry = useMemo(() => buildRegistry(), [])
  const [storage, setStorage] = useState<ComicStorage | null>(null)
  const [theme, setTheme] = useState<ThemePreference>('system')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await getStorage()
      if (cancelled) return
      setStorage(s)
      const prefs = await s.getPreferences()
      if (cancelled) return
      if (prefs?.theme) setTheme(prefs.theme)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const importer = useMemo<LibraryImporter | null>(() => {
    if (!storage) return null
    return async (source) => {
      const format = await detectFormat(source)
      if (format === 'pdf') await ensurePdfSupport(registry)
      if (format === 'cbr') await ensureRarSupport(registry)
      const extractor = await registry.resolve(source)
      const book = await extractor.open(source)
      const id = newComicId()
      const now = new Date().toISOString()
      const sourceName =
        source.kind === 'file'
          ? source.file.name
          : source.kind === 'blob'
            ? source.name
            : source.kind === 'url'
              ? (source.name ?? source.url)
              : source.kind === 'images'
                ? (source.name ?? `images-${id}`)
                : `directory-${id}`
      const fileSize =
        source.kind === 'file'
          ? source.file.size
          : source.kind === 'blob'
            ? source.blob.size
            : undefined
      const record: LibraryRecord = {
        id,
        title: book.title,
        format,
        sourceName,
        addedAt: now,
        updatedAt: now,
        pageCount: book.pageCount,
        fileSize,
        metadata: book.metadata,
      }
      await storage.addComic(record)

      // Persist the raw archive blob so the reader can reopen the comic
      // later without re-prompting. URL/directory/images sources skip this:
      // the reader can re-fetch URLs or re-pick directory/image inputs.
      const archiveBlob =
        source.kind === 'file'
          ? source.file
          : source.kind === 'blob'
            ? source.blob
            : null
      if (archiveBlob) {
        try {
          await storage.setArchiveBlob(id, archiveBlob)
        } catch (err) {
          console.warn('Failed to persist archive blob', err)
        }
      }

      if (book.cover) {
        try {
          const blob = await book.cover.getBlob()
          await storage.setThumbnail(id, blob)
        } catch {
          /* cover optional */
        }
      }
      return record
    }
  }, [registry, storage])

  if (!storage || !importer) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--page-muted)]">
        Loading library...
      </div>
    )
  }

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next)
    void storage
      .getPreferences()
      .then((p) =>
        storage.setPreferences({
          theme: next,
          defaultFitMode: p?.defaultFitMode ?? 'best',
          defaultReadingDirection: p?.defaultReadingDirection ?? 'ltr',
          defaultViewMode: p?.defaultViewMode ?? 'single',
        }),
      )
      .catch(() => undefined)
  }

  return (
    <ThemeProvider initialTheme={theme} onChange={handleThemeChange}>
      <ExtractorProvider registry={registry}>
        <LibraryProvider storage={storage} importer={importer}>
          {children}
        </LibraryProvider>
      </ExtractorProvider>
    </ThemeProvider>
  )
}
