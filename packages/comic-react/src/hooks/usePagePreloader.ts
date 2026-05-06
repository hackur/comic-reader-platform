'use client'

import { useEffect } from 'react'
import type { ComicPage } from '@comics-platform/comic-core'

export interface PreloaderOptions {
  ahead?: number
  behind?: number
}

export function usePagePreloader(
  pages: ComicPage[],
  currentIndex: number,
  options: PreloaderOptions = {},
): void {
  const { ahead = 2, behind = 1 } = options

  useEffect(() => {
    if (!pages.length) return
    const indices: number[] = []
    for (let i = 1; i <= ahead; i++) {
      const idx = currentIndex + i
      if (idx < pages.length) indices.push(idx)
    }
    for (let i = 1; i <= behind; i++) {
      const idx = currentIndex - i
      if (idx >= 0) indices.push(idx)
    }

    let cancelled = false
    const urls: string[] = []
    void Promise.all(
      indices.map(async (idx) => {
        try {
          const url = await pages[idx]!.getObjectUrl()
          if (cancelled) {
            URL.revokeObjectURL(url)
          } else {
            urls.push(url)
            const img = new Image()
            img.src = url
          }
        } catch {
          /* ignore preload errors */
        }
      }),
    )

    return () => {
      cancelled = true
      // Object URLs from getObjectUrl are owned by the page; we don't revoke
      // here because the page implementation may cache them. PageImage owns
      // its own lifecycle for actively-rendered pages.
    }
  }, [pages, currentIndex, ahead, behind])
}
