'use client'

import type { ComicLibraryItem } from '@comics-platform/comic-core'
import { ComicCard } from './ComicCard'

export interface ComicGridLibraryProps {
  comics: ComicLibraryItem[]
  onOpen: (id: string) => void
  onDelete?: (id: string) => void
  loadThumbnail?: (id: string) => Promise<Blob | undefined>
  emptyState?: React.ReactNode
  className?: string
}

export function ComicGridLibrary({
  comics,
  onOpen,
  onDelete,
  loadThumbnail,
  emptyState,
  className = '',
}: ComicGridLibraryProps) {
  if (comics.length === 0) {
    return (
      <div
        className={`rounded-[1.75rem] border border-dashed border-slate-300/80 bg-white/60 p-10 text-center text-sm text-slate-500 ${className}`}
      >
        {emptyState ?? 'Your library is empty. Drop a CBZ or CBR to get started.'}
      </div>
    )
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${className}`}
    >
      {comics.map((comic) => (
        <li key={comic.id}>
          <ComicCard
            comic={comic}
            onOpen={onOpen}
            onDelete={onDelete}
            loadThumbnail={loadThumbnail}
          />
        </li>
      ))}
    </ul>
  )
}
