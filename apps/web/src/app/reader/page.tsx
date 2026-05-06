'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ComicBook, ComicSource } from '@comics-platform/comic-core'
import {
  ComicReaderShell,
  useExtractorRegistry,
} from '@comics-platform/comic-react'
import { ensurePdfSupport, ensureRarSupport } from '@/lib/extractors'
import { getStorage } from '@/lib/storage'

function ReaderInner() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id')
  const registry = useExtractorRegistry()

  const [book, setBook] = useState<ComicBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) {
        setError('No comic id provided.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const storage = await getStorage()
        const record = await storage.getComic(id)
        if (!record) throw new Error('Comic not found in library.')
        const blob = await storage.getArchiveBlob(id)
        if (!blob) throw new Error('Archive blob missing for this comic.')

        if (record.format === 'pdf') {
          await ensurePdfSupport(registry)
        } else if (record.format === 'cbr') {
          await ensureRarSupport(registry)
        }

        const source: ComicSource = {
          kind: 'blob',
          blob,
          name: record.sourceName ?? record.title ?? id,
        }
        const extractor = await registry.resolve(source)
        const extracted = await extractor.open(source)
        if (cancelled) return
        setBook(extracted)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to open comic.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, registry])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <div className="rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] px-8 py-10 text-center shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--page-muted)]">
            Opening
          </p>
          <p className="mt-2 text-lg font-medium tracking-[-0.02em]">
            Re-extracting pages from your local archive...
          </p>
        </div>
      </main>
    )
  }

  if (error || !book) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <div className="grid max-w-md gap-3 rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] px-8 py-10 text-center shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">
            Could not open comic
          </p>
          <p className="text-base leading-6 text-[var(--page-muted)]">
            {error ?? 'Unknown error.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-2 inline-flex justify-center rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white"
          >
            Back to library
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <ComicReaderShell book={book} onClose={() => router.push('/')} />
    </main>
  )
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--page-muted)]">
            Loading reader...
          </p>
        </main>
      }
    >
      <ReaderInner />
    </Suspense>
  )
}
