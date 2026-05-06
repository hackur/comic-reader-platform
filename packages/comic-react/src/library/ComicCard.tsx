'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ComicLibraryItem } from '@comics-platform/comic-core'

export interface ComicCardProps {
  comic: ComicLibraryItem
  onOpen: (id: string) => void
  onDelete?: (id: string) => void
  /**
   * Optional thumbnail loader. When provided, the card asynchronously fetches
   * a Blob for `comic.id`, creates an object URL, and revokes it on unmount
   * or comic change.
   */
  loadThumbnail?: (id: string) => Promise<Blob | undefined>
  className?: string
}

function formatRelative(date?: Date): string | null {
  if (!date) return null
  const ms = Date.now() - date.getTime()
  const sec = Math.round(ms / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}

export function ComicCard({
  comic,
  onOpen,
  onDelete,
  loadThumbnail,
  className = '',
}: ComicCardProps) {
  const lastRead = formatRelative(comic.lastRead)
  const progress =
    typeof comic.progress === 'number'
      ? Math.min(100, Math.max(0, Math.round(comic.progress * 100)))
      : null

  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!loadThumbnail) {
      setThumbUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    void (async () => {
      try {
        const blob = await loadThumbnail(comic.id)
        if (cancelled || !blob) return
        createdUrl = URL.createObjectURL(blob)
        setThumbUrl(createdUrl)
      } catch {
        /* thumbnail is best-effort */
      }
    })()
    return () => {
      cancelled = true
      if (createdUrl) {
        try {
          URL.revokeObjectURL(createdUrl)
        } catch {
          /* noop */
        }
      }
    }
  }, [comic.id, loadThumbnail])

  const coverSrc = comic.coverUrl ?? thumbUrl

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_80px_-30px_rgba(15,23,42,0.55)] ${className}`}
    >
      <button
        type="button"
        onClick={() => onOpen(comic.id)}
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-200"
        aria-label={`Open ${comic.title}`}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={comic.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-200 to-slate-300 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            {comic.format}
          </div>
        )}
        {progress !== null ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-900/30">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold tracking-[-0.01em] text-slate-950">
          {comic.title}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium uppercase tracking-[0.14em]">
            {comic.format}
          </span>
          {lastRead ? <span>{lastRead}</span> : null}
        </div>
      </div>

      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(comic.id)
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 bg-white/90 text-slate-600 opacity-0 shadow-sm transition-opacity hover:text-rose-600 group-hover:opacity-100"
          aria-label={`Remove ${comic.title}`}
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </article>
  )
}
