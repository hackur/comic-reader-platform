'use client'

import type { ComicBook, ReadingState } from '@comics-platform/comic-core'
import { ReadingStateProvider } from '../state/ReadingStateContext'
import { ComicViewer } from './ComicViewer'
import { ViewerToolbar } from './ViewerToolbar'
import { PageSlider } from './PageSlider'
import { ThumbnailRail } from './ThumbnailRail'

export interface ComicReaderShellProps {
  book: ComicBook
  initialState?: Partial<ReadingState>
  showRail?: boolean
  onClose?: () => void
  className?: string
}

export function ComicReaderShell({
  book,
  initialState,
  showRail = true,
  onClose,
  className = '',
}: ComicReaderShellProps) {
  return (
    <ReadingStateProvider pageCount={book.pageCount} initial={initialState}>
      <div
        className={`flex h-full w-full flex-col gap-3 rounded-[2rem] border border-slate-200/80 bg-slate-100/40 p-3 ${className}`}
      >
        <ViewerToolbar title={book.title} onClose={onClose} />
        <div className="flex min-h-0 flex-1 gap-3">
          {showRail ? <ThumbnailRail book={book} /> : null}
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
            <ComicViewer book={book} />
          </div>
        </div>
        <PageSlider />
      </div>
    </ReadingStateProvider>
  )
}
