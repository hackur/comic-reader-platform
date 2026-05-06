'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComicBook } from '@comics-platform/comic-core'
import { useReadingState } from '../state/ReadingStateContext'
import { PageImage } from './PageImage'

export interface ThumbnailRailProps {
  book: ComicBook
  className?: string
  defaultOpen?: boolean
}

export function ThumbnailRail({
  book,
  className = '',
  defaultOpen = false,
}: ThumbnailRailProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { currentPage, goToPage } = useReadingState()

  return (
    <aside
      className={`flex h-full ${open ? 'w-44' : 'w-12'} flex-col rounded-2xl border border-slate-200/80 bg-white/70 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-200 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-center border-b border-slate-200/70 text-slate-600 hover:text-slate-950"
        aria-label={open ? 'Collapse thumbnails' : 'Expand thumbnails'}
      >
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      {open ? (
        <ul className="flex-1 space-y-2 overflow-y-auto p-2">
          {book.pages.map((page) => {
            const active = page.index === currentPage
            return (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => goToPage(page.index)}
                  className={`group block w-full overflow-hidden rounded-xl border transition-colors ${
                    active
                      ? 'border-sky-500 ring-2 ring-sky-500/30'
                      : 'border-slate-200/70 hover:border-slate-400'
                  }`}
                >
                  <PageImage
                    page={page}
                    className="h-28 w-full bg-slate-100 object-cover"
                  />
                  <span className="block px-2 py-1 text-left text-[11px] font-medium text-slate-600">
                    {page.index + 1}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </aside>
  )
}
