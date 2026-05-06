'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { ComicFormat } from '@comics-platform/comic-core'
import {
  useComicLibrary,
  type LibraryFormatFilter,
  type LibrarySort,
} from '../state/LibraryContext'

const FORMAT_CHIPS: { label: string; value: LibraryFormatFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'CBZ', value: 'cbz' as ComicFormat },
  { label: 'CBR', value: 'cbr' as ComicFormat },
  { label: 'CBT', value: 'cbt' as ComicFormat },
  { label: 'PDF', value: 'pdf' as ComicFormat },
  { label: 'Images', value: 'images' as ComicFormat },
]

const SORT_OPTIONS: { label: string; value: LibrarySort }[] = [
  { label: 'Last read', value: 'lastRead' },
  { label: 'Recently added', value: 'addedAt' },
  { label: 'Title (A–Z)', value: 'title' },
]

export interface LibrarySearchBarProps {
  className?: string
}

export function LibrarySearchBar({ className = '' }: LibrarySearchBarProps) {
  const {
    query,
    setQuery,
    formatFilter,
    setFormatFilter,
    sort,
    setSort,
  } = useComicLibrary()

  // Debounced local input -> context query
  const [localQuery, setLocalQuery] = useState(query)

  useEffect(() => {
    // Keep local state in sync if external code resets the query.
    setLocalQuery(query)
  }, [query])

  useEffect(() => {
    if (localQuery === query) return
    const handle = setTimeout(() => {
      setQuery(localQuery)
    }, 150)
    return () => clearTimeout(handle)
  }, [localQuery, query, setQuery])

  return (
    <div
      className={`flex flex-col gap-3 rounded-[1.5rem] border border-[var(--page-line)] bg-white/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-1 items-center gap-2">
        <label
          htmlFor="library-search"
          className="flex flex-1 items-center gap-2 rounded-full border border-[var(--page-line)] bg-white/80 px-3 py-2 text-sm text-slate-700 focus-within:border-slate-400"
        >
          <Search size={16} className="text-slate-400" />
          <input
            id="library-search"
            type="search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search your library"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            aria-label="Search comics by title"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Filter by format"
          className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--page-line)] bg-white/70 p-1"
        >
          {FORMAT_CHIPS.map((chip) => {
            const active = formatFilter === chip.value
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setFormatFilter(chip.value)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 rounded-full border border-[var(--page-line)] bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700">
          <span className="uppercase tracking-[0.18em] text-slate-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as LibrarySort)}
            className="bg-transparent text-xs font-medium text-slate-800 outline-none"
            aria-label="Sort library"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
