'use client'

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { ComicBook, ReadingState } from '@comics-platform/comic-core'
import { useReadingState } from '../state/ReadingStateContext'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { useTouchSwipe } from '../hooks/useTouchSwipe'
import { usePagePreloader } from '../hooks/usePagePreloader'
import { PageImage } from './PageImage'

export interface ComicViewerProps {
  book: ComicBook
  className?: string
}

function fitClassFor(fit: ReadingState['fitMode']): string {
  switch (fit) {
    case 'width':
      return 'w-full h-auto'
    case 'height':
      return 'h-full w-auto'
    case 'best':
      return 'max-h-full max-w-full object-contain'
    case 'original':
      return 'h-auto w-auto'
  }
}

export function ComicViewer({ book, className = '' }: ComicViewerProps) {
  const {
    currentPage,
    viewMode,
    readingDirection,
    zoom,
    rotation,
    fitMode,
    nextPage,
    prevPage,
  } = useReadingState()

  useKeyboardNav()
  usePagePreloader(book.pages, currentPage)

  const swipe = useTouchSwipe({
    onSwipeLeft: () => (readingDirection === 'rtl' ? prevPage() : nextPage()),
    onSwipeRight: () => (readingDirection === 'rtl' ? nextPage() : prevPage()),
  })

  const visiblePages = useMemo(() => {
    if (viewMode === 'spread') {
      const pair = [book.pages[currentPage], book.pages[currentPage + 1]].filter(
        (p): p is NonNullable<typeof p> => Boolean(p),
      )
      return pair
    }
    if (viewMode === 'strip') {
      return book.pages
    }
    const single = book.pages[currentPage]
    return single ? [single] : []
  }, [book.pages, currentPage, viewMode])

  const transformStyle: CSSProperties = {
    transform: `rotate(${rotation}deg) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: 'transform 200ms ease',
  }

  const fitClass = fitClassFor(fitMode)
  const isStrip = viewMode === 'strip'
  const directionClass =
    readingDirection === 'rtl' ? 'flex-row-reverse' : 'flex-row'

  return (
    <div
      ref={swipe.ref}
      {...swipe.handlers}
      className={`relative flex h-full w-full items-center justify-center overflow-auto bg-slate-950/95 ${className}`}
      tabIndex={0}
    >
      {isStrip ? (
        <div className="flex w-full max-w-4xl flex-col gap-2 py-6">
          {visiblePages.map((page) => (
            <PageImage
              key={page.id}
              page={page}
              className={`mx-auto select-none ${fitClass}`}
              style={transformStyle}
            />
          ))}
        </div>
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center gap-2 ${directionClass}`}
        >
          {visiblePages.map((page) => (
            <PageImage
              key={page.id}
              page={page}
              className={`select-none ${fitClass}`}
              style={transformStyle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
