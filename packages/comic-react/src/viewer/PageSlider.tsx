'use client'

import type { ChangeEvent } from 'react'
import { useReadingState } from '../state/ReadingStateContext'

export interface PageSliderProps {
  className?: string
}

export function PageSlider({ className = '' }: PageSliderProps) {
  const { currentPage, pageCount, goToPage, readingDirection } = useReadingState()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    goToPage(Number(e.target.value))
  }

  if (pageCount <= 1) return null

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur ${className}`}
      dir={readingDirection}
    >
      <span className="text-xs font-medium text-slate-500">1</span>
      <input
        type="range"
        min={0}
        max={Math.max(0, pageCount - 1)}
        value={currentPage}
        onChange={handleChange}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600"
        aria-label="Jump to page"
      />
      <span className="text-xs font-medium text-slate-500">{pageCount}</span>
      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">
        {currentPage + 1}
      </span>
    </div>
  )
}
