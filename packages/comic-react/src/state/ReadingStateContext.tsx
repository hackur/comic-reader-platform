'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react'
import type { ReactNode } from 'react'
import type { ReadingState } from '@comics-platform/comic-core'

export interface ReadingStateActions {
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  setFit: (fit: ReadingState['fitMode']) => void
  setZoom: (zoom: number) => void
  rotate: (delta?: number) => void
  toggleDirection: () => void
  setViewMode: (mode: ReadingState['viewMode']) => void
}

export interface ReadingStateContextValue extends ReadingState, ReadingStateActions {
  pageCount: number
}

const defaultState: ReadingState = {
  currentPage: 0,
  zoom: 1,
  rotation: 0,
  fitMode: 'best',
  readingDirection: 'ltr',
  viewMode: 'single',
}

type Action =
  | { type: 'next'; pageCount: number; step: number }
  | { type: 'prev'; step: number }
  | { type: 'goto'; page: number; pageCount: number }
  | { type: 'fit'; fit: ReadingState['fitMode'] }
  | { type: 'zoom'; zoom: number }
  | { type: 'rotate'; delta: number }
  | { type: 'toggleDir' }
  | { type: 'viewMode'; mode: ReadingState['viewMode'] }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function reducer(state: ReadingState, action: Action): ReadingState {
  switch (action.type) {
    case 'next':
      return {
        ...state,
        currentPage: clamp(
          state.currentPage + action.step,
          0,
          Math.max(0, action.pageCount - 1),
        ),
      }
    case 'prev':
      return {
        ...state,
        currentPage: clamp(state.currentPage - action.step, 0, Number.MAX_SAFE_INTEGER),
      }
    case 'goto':
      return {
        ...state,
        currentPage: clamp(action.page, 0, Math.max(0, action.pageCount - 1)),
      }
    case 'fit':
      return { ...state, fitMode: action.fit, zoom: 1 }
    case 'zoom':
      return { ...state, zoom: clamp(action.zoom, 0.25, 6) }
    case 'rotate':
      return { ...state, rotation: (state.rotation + action.delta + 360) % 360 }
    case 'toggleDir':
      return {
        ...state,
        readingDirection: state.readingDirection === 'ltr' ? 'rtl' : 'ltr',
      }
    case 'viewMode':
      return { ...state, viewMode: action.mode }
    default:
      return state
  }
}

const ReadingStateContext = createContext<ReadingStateContextValue | null>(null)

export interface ReadingStateProviderProps {
  pageCount: number
  initial?: Partial<ReadingState>
  children: ReactNode
}

export function ReadingStateProvider({
  pageCount,
  initial,
  children,
}: ReadingStateProviderProps) {
  const [state, dispatch] = useReducer(reducer, { ...defaultState, ...initial })

  const step = state.viewMode === 'spread' ? 2 : 1

  const nextPage = useCallback(
    () => dispatch({ type: 'next', pageCount, step }),
    [pageCount, step],
  )
  const prevPage = useCallback(() => dispatch({ type: 'prev', step }), [step])
  const goToPage = useCallback(
    (page: number) => dispatch({ type: 'goto', page, pageCount }),
    [pageCount],
  )
  const setFit = useCallback(
    (fit: ReadingState['fitMode']) => dispatch({ type: 'fit', fit }),
    [],
  )
  const setZoom = useCallback((zoom: number) => dispatch({ type: 'zoom', zoom }), [])
  const rotate = useCallback(
    (delta = 90) => dispatch({ type: 'rotate', delta }),
    [],
  )
  const toggleDirection = useCallback(() => dispatch({ type: 'toggleDir' }), [])
  const setViewMode = useCallback(
    (mode: ReadingState['viewMode']) => dispatch({ type: 'viewMode', mode }),
    [],
  )

  const value = useMemo<ReadingStateContextValue>(
    () => ({
      ...state,
      pageCount,
      nextPage,
      prevPage,
      goToPage,
      setFit,
      setZoom,
      rotate,
      toggleDirection,
      setViewMode,
    }),
    [
      state,
      pageCount,
      nextPage,
      prevPage,
      goToPage,
      setFit,
      setZoom,
      rotate,
      toggleDirection,
      setViewMode,
    ],
  )

  return (
    <ReadingStateContext.Provider value={value}>{children}</ReadingStateContext.Provider>
  )
}

export function useReadingState(): ReadingStateContextValue {
  const ctx = useContext(ReadingStateContext)
  if (!ctx) {
    throw new Error('useReadingState must be used within a ReadingStateProvider')
  }
  return ctx
}
