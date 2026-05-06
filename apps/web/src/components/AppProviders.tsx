'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ExtractorProvider,
  LibraryProvider,
  type LibraryImporter,
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

  useEffect(() => {
    let cancelled = false
    void getStorage().then((s) => {
      if (!cancelled) setStorage(s)
    })
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
      const record: LibraryRecord = {
        id,
        title: book.title,
        format,
        sourceName,
        addedAt: now,
        updatedAt: now,
        pageCount: book.pageCount,
        metadata: book.metadata,
      }
      await storage.addComic(record)
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

  return (
    <ExtractorProvider registry={registry}>
      <LibraryProvider storage={storage} importer={importer}>
        {children}
      </LibraryProvider>
    </ExtractorProvider>
  )
}
