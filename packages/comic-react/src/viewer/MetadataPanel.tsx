'use client'

import { X } from 'lucide-react'
import type { ComicBook } from '@comics-platform/comic-core'

export interface MetadataPanelProps {
  book: ComicBook
  open: boolean
  onClose: () => void
  className?: string
}

interface Field {
  label: string
  value: string | number | undefined
}

function formatDate(year?: number, month?: number): string | undefined {
  if (!year) return undefined
  if (month && month >= 1 && month <= 12) {
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    })
  }
  return String(year)
}

export function MetadataPanel({
  book,
  open,
  onClose,
  className = '',
}: MetadataPanelProps) {
  const meta = book.metadata
  const date = formatDate(meta?.year, meta?.month)

  const fields: Field[] = [
    { label: 'Series', value: meta?.series },
    { label: 'Number', value: meta?.number },
    { label: 'Volume', value: meta?.volume },
    { label: 'Title', value: meta?.title },
    { label: 'Date', value: date },
    { label: 'Writer', value: meta?.writer },
    { label: 'Penciller', value: meta?.penciller },
    { label: 'Publisher', value: meta?.publisher },
    { label: 'Genre', value: meta?.genre },
    { label: 'Language', value: meta?.languageISO },
    { label: 'Age rating', value: meta?.ageRating },
    { label: 'Page count', value: meta?.pageCount ?? book.pageCount },
  ]

  const populated = fields.filter(
    (f) => f.value !== undefined && String(f.value).trim().length > 0,
  )
  const summary = meta?.summary?.trim()
  const hasContent = !!meta && (populated.length > 0 || !!summary)

  return (
    <aside
      role="complementary"
      aria-label="Comic information"
      aria-hidden={!open}
      className={`pointer-events-none fixed inset-y-0 right-0 z-30 flex w-full max-w-sm transform flex-col transition-transform duration-200 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      } ${className}`}
    >
      <div
        className={`pointer-events-auto m-3 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--page-line)] bg-white/95 shadow-[0_28px_100px_-30px_rgba(15,23,42,0.5)] backdrop-blur`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--page-line)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Comic info
            </p>
            <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comic information"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--page-line)] bg-white/80 text-slate-600 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hasContent ? (
            <p className="text-sm text-slate-500">
              No metadata available for this comic.
            </p>
          ) : (
            <div className="space-y-5">
              {populated.length > 0 ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {populated.map((f) => (
                    <div key={f.label} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {f.label}
                      </dt>
                      <dd className="mt-0.5 truncate text-sm text-slate-900">
                        {String(f.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {summary ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Summary
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">
                    {summary}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
