'use client'

import { useEffect } from 'react'
import { useReadingState } from '../state/ReadingStateContext'

export interface KeyboardNavOptions {
  enabled?: boolean
  target?: HTMLElement | Window | null
  onHelp?: () => void
  onBookmark?: () => void
}

export function useKeyboardNav(options: KeyboardNavOptions = {}): void {
  const { enabled = true, target, onHelp, onBookmark } = options
  const {
    nextPage,
    prevPage,
    goToPage,
    pageCount,
    setZoom,
    zoom,
    rotate,
    setFit,
    readingDirection,
  } = useReadingState()

  useEffect(() => {
    if (!enabled) return
    const node: EventTarget = target ?? (typeof window !== 'undefined' ? window : globalThis)

    const handler = (event: Event) => {
      const e = event as KeyboardEvent
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return
      }

      const goForward = readingDirection === 'rtl' ? prevPage : nextPage
      const goBackward = readingDirection === 'rtl' ? nextPage : prevPage

      switch (e.key) {
        case 'ArrowRight':
          goForward()
          break
        case 'ArrowLeft':
          goBackward()
          break
        case ' ':
        case 'PageDown':
          e.preventDefault()
          nextPage()
          break
        case 'PageUp':
          e.preventDefault()
          prevPage()
          break
        case 'Home':
          goToPage(0)
          break
        case 'End':
          goToPage(Math.max(0, pageCount - 1))
          break
        case '+':
        case '=':
          setZoom(zoom + 0.1)
          break
        case '-':
        case '_':
          setZoom(zoom - 0.1)
          break
        case '0':
          setZoom(1)
          break
        case 'r':
        case 'R':
          rotate(90)
          break
        case 'f':
        case 'F':
          setFit('best')
          break
        case '?':
          if (onHelp) {
            e.preventDefault()
            onHelp()
          }
          break
        case 'b':
        case 'B':
          if (onBookmark) {
            e.preventDefault()
            onBookmark()
          }
          break
        default:
          break
      }
    }

    node.addEventListener('keydown', handler)
    return () => node.removeEventListener('keydown', handler)
  }, [
    enabled,
    target,
    nextPage,
    prevPage,
    goToPage,
    pageCount,
    setZoom,
    zoom,
    rotate,
    setFit,
    readingDirection,
    onHelp,
    onBookmark,
  ])
}
