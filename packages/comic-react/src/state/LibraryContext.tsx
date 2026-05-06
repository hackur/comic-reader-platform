'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type {
  ComicFormat,
  ComicLibraryItem,
  ComicSource,
  ReadingState,
} from '@comics-platform/comic-core'

/**
 * Structural type matching @comics-platform/comic-storage's ComicStorage
 * contract. Mirrored here so this package does not directly depend on
 * comic-storage.
 */
export interface LibraryRecord {
  id: string
  title: string
  format: ComicFormat
  sourceName: string
  addedAt: string
  updatedAt: string
  lastReadPage?: number
  pageCount?: number
  coverCacheKey?: string
  fileSize?: number
  readingDirection?: 'ltr' | 'rtl'
  viewMode?: 'single' | 'spread' | 'strip'
  metadata?: unknown
}

export interface ComicStorage {
  addComic(record: LibraryRecord): Promise<void>
  getComic(id: string): Promise<LibraryRecord | undefined>
  listComics(opts?: unknown): Promise<LibraryRecord[]>
  deleteComic(id: string): Promise<void>
  setReadingState(id: string, state: ReadingState): Promise<void>
  getReadingState(id: string): Promise<ReadingState | undefined>
  setThumbnail(id: string, blob: Blob): Promise<void>
  getThumbnail(id: string): Promise<Blob | undefined>
  setArchiveBlob(id: string, blob: Blob): Promise<void>
  getArchiveBlob(id: string): Promise<Blob | undefined>
  clear(): Promise<void>
}

/**
 * Importer closure injected by the host app. Wires together the format
 * registry + extractor + storage to import a new comic and persist it.
 * Returns the persisted record so the library can refresh.
 */
export type LibraryImporter = (source: ComicSource) => Promise<LibraryRecord>

export type LibrarySort = 'lastRead' | 'addedAt' | 'title'

export interface LibraryContextValue {
  comics: ComicLibraryItem[]
  loading: boolean
  error: Error | null
  sort: LibrarySort
  setSort: (sort: LibrarySort) => void
  importSource: (source: ComicSource) => Promise<LibraryRecord>
  remove: (id: string) => Promise<void>
  setLastRead: (id: string, page: number) => Promise<void>
  refresh: () => Promise<void>
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export interface LibraryProviderProps {
  storage: ComicStorage
  importer: LibraryImporter
  initialSort?: LibrarySort
  children: ReactNode
}

function recordToItem(r: LibraryRecord): ComicLibraryItem {
  return {
    id: r.id,
    title: r.title,
    format: r.format,
    fileSize: r.fileSize,
    addedAt: new Date(r.addedAt),
    lastRead: r.updatedAt ? new Date(r.updatedAt) : undefined,
    progress:
      typeof r.lastReadPage === 'number' && r.pageCount
        ? r.lastReadPage / Math.max(1, r.pageCount)
        : undefined,
  }
}

function sortComics(items: ComicLibraryItem[], sort: LibrarySort): ComicLibraryItem[] {
  const copy = items.slice()
  switch (sort) {
    case 'lastRead':
      copy.sort((a, b) => {
        const ax = a.lastRead?.getTime() ?? 0
        const bx = b.lastRead?.getTime() ?? 0
        return bx - ax
      })
      break
    case 'addedAt':
      copy.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      break
    case 'title':
      copy.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return copy
}

export function LibraryProvider({
  storage,
  importer,
  initialSort = 'lastRead',
  children,
}: LibraryProviderProps) {
  const [comics, setComics] = useState<ComicLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [sort, setSort] = useState<LibrarySort>(initialSort)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const records = await storage.listComics()
      setComics(records.map(recordToItem))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [storage])

  useEffect(() => {
    void refresh()
  }, [storage, refresh])

  const importSource = useCallback(
    async (source: ComicSource) => {
      const record = await importer(source)
      await refresh()
      return record
    },
    [importer, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await storage.deleteComic(id)
      await refresh()
    },
    [storage, refresh],
  )

  const setLastRead = useCallback(
    async (id: string, page: number) => {
      const existing = await storage.getReadingState(id)
      const next: ReadingState = existing
        ? { ...existing, currentPage: page }
        : {
            currentPage: page,
            zoom: 1,
            rotation: 0,
            fitMode: 'best',
            readingDirection: 'ltr',
            viewMode: 'single',
          }
      await storage.setReadingState(id, next)
      await refresh()
    },
    [storage, refresh],
  )

  const sorted = useMemo(() => sortComics(comics, sort), [comics, sort])

  const value = useMemo<LibraryContextValue>(
    () => ({
      comics: sorted,
      loading,
      error,
      sort,
      setSort,
      importSource,
      remove,
      setLastRead,
      refresh,
    }),
    [sorted, loading, error, sort, importSource, remove, setLastRead, refresh],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useComicLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) {
    throw new Error('useComicLibrary must be used within a LibraryProvider')
  }
  return ctx
}
