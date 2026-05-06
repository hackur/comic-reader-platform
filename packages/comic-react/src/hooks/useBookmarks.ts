'use client'

import { useCallback, useEffect, useState } from 'react'
import { useComicLibrary, type Bookmark } from '../state/LibraryContext'

export interface UseBookmarksResult {
  bookmarks: Bookmark[]
  loading: boolean
  add: (page: number, label?: string) => Promise<Bookmark>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useBookmarks(comicId: string): UseBookmarksResult {
  const { addBookmark, listBookmarks, removeBookmark } = useComicLibrary()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listBookmarks(comicId)
      list.sort((a, b) => a.page - b.page)
      setBookmarks(list)
    } finally {
      setLoading(false)
    }
  }, [comicId, listBookmarks])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const add = useCallback(
    async (page: number, label?: string) => {
      const bm: Bookmark = {
        id: newId(),
        comicId,
        page,
        label,
        createdAt: new Date().toISOString(),
      }
      await addBookmark(bm)
      await refresh()
      return bm
    },
    [addBookmark, comicId, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await removeBookmark(id)
      await refresh()
    },
    [removeBookmark, refresh],
  )

  return { bookmarks, loading, add, remove, refresh }
}
