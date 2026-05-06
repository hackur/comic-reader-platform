'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ComicPage } from '@comics-platform/comic-core'

export interface PageImageProps {
  page: ComicPage
  alt?: string
  className?: string
  style?: CSSProperties
  onLoad?: () => void
}

export function PageImage({ page, alt, className = '', style, onLoad }: PageImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    void (async () => {
      try {
        const url = await page.getObjectUrl()
        if (cancelled) {
          // Revoke if the page returned a fresh URL we own.
          try {
            URL.revokeObjectURL(url)
          } catch {
            /* noop */
          }
          return
        }
        createdUrl = url
        setSrc(url)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      }
    })()

    return () => {
      cancelled = true
      if (createdUrl) {
        // Defer revocation so a fast-switching parent (e.g. the page
        // preloader or rapid prev/next) does not yank the URL out from
        // under an <img> that is still loading. 5s is a comfortable upper
        // bound for image decode while keeping memory pressure bounded.
        const url = createdUrl
        const revoke = () => {
          try {
            URL.revokeObjectURL(url)
          } catch {
            /* noop */
          }
        }
        const w = globalThis as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        }
        if (typeof w.requestIdleCallback === 'function') {
          w.requestIdleCallback(revoke, { timeout: 5000 })
        } else {
          setTimeout(revoke, 5000)
        }
      }
    }
  }, [page])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-8 text-sm text-rose-700 ${className}`}
        style={style}
      >
        Failed to render page {page.index + 1}
      </div>
    )
  }

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-100/60 p-8 text-sm text-slate-500 ${className}`}
        style={style}
      >
        Loading page {page.index + 1}…
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt ?? page.name}
      className={className}
      style={style}
      onLoad={onLoad}
      draggable={false}
    />
  )
}
