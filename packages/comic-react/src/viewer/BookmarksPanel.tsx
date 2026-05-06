'use client'

import { Bookmark as BookmarkIcon, Plus, Trash2, X } from 'lucide-react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useReadingState } from '../state/ReadingStateContext'

export interface BookmarksPanelProps {
  comicId: string
  onClose?: () => void
  className?: string
}

export function BookmarksPanel({
  comicId,
  onClose,
  className = '',
}: BookmarksPanelProps) {
  const { bookmarks, loading, add, remove } = useBookmarks(comicId)
  const { currentPage, goToPage } = useReadingState()

  return (
    <aside
      aria-label="Bookmarks"
      className={`flex h-full w-72 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur ${className}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-950">
          <BookmarkIcon size={16} />
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Bookmarks</h2>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookmarks"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-400 hover:text-slate-950"
          >
            <X size={14} />
          </button>
        ) : null}
      </header>

      <button
        type="button"
        onClick={() => {
          void add(currentPage)
        }}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-500 bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700"
      >
        <Plus size={14} />
        Add bookmark for page {currentPage + 1}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-1 py-2 text-xs text-slate-500">Loading…</p>
        ) : bookmarks.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-500">No bookmarks yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {bookmarks.map((bm) => (
              <li
                key={bm.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => goToPage(bm.page)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="text-xs font-medium text-slate-950">
                    Page {bm.page + 1}
                  </span>
                  {bm.label ? (
                    <span className="truncate text-[11px] text-slate-500">
                      {bm.label}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void remove(bm.id)
                  }}
                  aria-label={`Remove bookmark for page ${bm.page + 1}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
