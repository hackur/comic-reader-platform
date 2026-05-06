'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ComicBook, ReadingState } from '@comics-platform/comic-core'
import { ReadingStateProvider, useReadingState } from '../state/ReadingStateContext'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { useComicLibrary } from '../state/LibraryContext'
import { ComicViewer } from './ComicViewer'
import { ViewerToolbar } from './ViewerToolbar'
import { PageSlider } from './PageSlider'
import { ShortcutsModal } from './ShortcutsModal'
import { ThumbnailRail } from './ThumbnailRail'
import { MetadataPanel } from './MetadataPanel'
import { BookmarksPanel } from './BookmarksPanel'

export interface ComicReaderShellProps {
  book: ComicBook
  initialState?: Partial<ReadingState>
  showRail?: boolean
  onClose?: () => void
  className?: string
  /**
   * When provided, a bookmarks button is shown in the toolbar and the 'b'
   * key adds a bookmark for the current page. The bookmarks panel reads
   * from LibraryContext so a LibraryProvider must be in scope.
   */
  enableBookmarks?: boolean
  /**
   * Fires whenever the current page changes. Useful for persisting reading
   * progress to storage. Debounce in the host if needed.
   */
  onPageChange?: (page: number) => void
}

interface PageChangeBinderProps {
  onChange: (page: number) => void
}

function PageChangeBinder({ onChange }: PageChangeBinderProps) {
  const { currentPage } = useReadingState()
  useEffect(() => {
    onChange(currentPage)
  }, [currentPage, onChange])
  return null
}

interface BookmarkBinderProps {
  comicId: string
}

function BookmarkBinder({ comicId }: BookmarkBinderProps) {
  const { currentPage } = useReadingState()
  const { addBookmark } = useComicLibrary()

  const onBookmark = useCallback(() => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    void addBookmark({
      id,
      comicId,
      page: currentPage,
      createdAt: new Date().toISOString(),
    })
  }, [addBookmark, comicId, currentPage])

  useKeyboardNav({ onBookmark })
  return null
}

export function ComicReaderShell({
  book,
  initialState,
  showRail = true,
  onClose,
  className = '',
  enableBookmarks = false,
  onPageChange,
}: ComicReaderShellProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)

  // Listen for '?' globally so the modal can be opened from anywhere in the
  // shell, not just from within the ComicViewer focus area. We avoid wiring
  // through the existing useKeyboardNav hook (which depends on
  // ReadingStateContext) to keep this concern isolated.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setShowHelp((s) => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ReadingStateProvider pageCount={book.pageCount} initial={initialState}>
      <div
        className={`relative flex h-full w-full flex-col gap-3 rounded-[2rem] border border-slate-200/80 bg-slate-100/40 p-3 ${className}`}
      >
        <ViewerToolbar
          title={book.title}
          onClose={onClose}
          onInfo={() => setShowInfo((s) => !s)}
          onBookmarks={
            enableBookmarks ? () => setShowBookmarks((s) => !s) : undefined
          }
          bookmarksActive={showBookmarks}
        />
        <div className="flex min-h-0 flex-1 gap-3">
          {showRail ? <ThumbnailRail book={book} /> : null}
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
            <ComicViewer book={book} />
          </div>
          {enableBookmarks && showBookmarks ? (
            <BookmarksPanel
              comicId={book.id}
              onClose={() => setShowBookmarks(false)}
            />
          ) : null}
        </div>
        <PageSlider />
        <MetadataPanel
          book={book}
          open={showInfo}
          onClose={() => setShowInfo(false)}
        />
        <ShortcutsModal open={showHelp} onClose={() => setShowHelp(false)} />
        {enableBookmarks ? <BookmarkBinder comicId={book.id} /> : null}
        {onPageChange ? <PageChangeBinder onChange={onPageChange} /> : null}
      </div>
    </ReadingStateProvider>
  )
}
