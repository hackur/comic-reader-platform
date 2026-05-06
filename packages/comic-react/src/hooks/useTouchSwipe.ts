'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

export interface SwipeOptions {
  threshold?: number
  velocity?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  enabled?: boolean
}

export interface SwipeHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

export interface UseTouchSwipeResult {
  ref: RefObject<HTMLDivElement | null>
  handlers: SwipeHandlers
}

interface PointerStart {
  x: number
  y: number
  t: number
  id: number
}

export function useTouchSwipe(options: SwipeOptions = {}): UseTouchSwipeResult {
  const {
    threshold = 60,
    velocity = 0.3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enabled = true,
  } = options
  const ref = useRef<HTMLDivElement | null>(null)
  const start = useRef<PointerStart | null>(null)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      start.current = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        id: e.pointerId,
      }
    },
    [enabled],
  )

  const onPointerMove = useCallback(() => {
    /* no-op; gesture detection happens on pointer up */
  }, [])

  const finish = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      const dt = Math.max(1, performance.now() - s.t)
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const v = Math.max(absX, absY) / dt

      if (absX >= threshold && absX > absY && v >= velocity) {
        if (dx < 0) onSwipeLeft?.()
        else onSwipeRight?.()
      } else if (absY >= threshold && absY > absX && v >= velocity) {
        if (dy < 0) onSwipeUp?.()
        else onSwipeDown?.()
      }
      start.current = null
    },
    [enabled, threshold, velocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown],
  )

  const onPointerCancel = useCallback(() => {
    start.current = null
  }, [])

  useEffect(() => () => {
    start.current = null
  }, [])

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel,
    },
  }
}
