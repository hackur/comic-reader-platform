'use client'

import {
  ArrowLeftRight,
  Bookmark,
  BookOpen,
  Columns2,
  Info,
  Maximize2,
  Minimize2,
  RotateCw,
  ScanLine,
  Square,
  StretchHorizontal,
  StretchVertical,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import type { ReadingState } from '@comics-platform/comic-core'
import { useReadingState } from '../state/ReadingStateContext'

export interface ViewerToolbarProps {
  title: string
  onClose?: () => void
  onInfo?: () => void
  onBookmarks?: () => void
  bookmarksActive?: boolean
  className?: string
}

interface ToolbarIconProps {
  icon: ComponentType<{ className?: string; size?: number }>
  label: string
  onClick: () => void
  active?: boolean
}

function ToolbarIcon({ icon: Icon, label, onClick, active }: ToolbarIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
        active
          ? 'border-sky-500 bg-sky-600 text-white'
          : 'border-slate-300/70 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-950'
      }`}
    >
      <Icon size={16} />
    </button>
  )
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-sm backdrop-blur">
      {children}
    </div>
  )
}

export function ViewerToolbar({
  title,
  onClose,
  onInfo,
  onBookmarks,
  bookmarksActive,
  className = '',
}: ViewerToolbarProps) {
  const {
    currentPage,
    pageCount,
    viewMode,
    fitMode,
    zoom,
    readingDirection,
    setViewMode,
    setFit,
    setZoom,
    rotate,
    toggleDirection,
  } = useReadingState()

  const setFitTyped = (mode: ReadingState['fitMode']) => setFit(mode)
  const setViewTyped = (mode: ReadingState['viewMode']) => setViewMode(mode)

  return (
    <div
      role="toolbar"
      aria-label="Comic viewer controls"
      className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
          >
            Library
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
            {title}
          </p>
          <p className="text-xs text-slate-500">
            Page {Math.min(currentPage + 1, pageCount)} of {pageCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Group>
          <ToolbarIcon
            icon={Square}
            label="Single page"
            onClick={() => setViewTyped('single')}
            active={viewMode === 'single'}
          />
          <ToolbarIcon
            icon={Columns2}
            label="Spread"
            onClick={() => setViewTyped('spread')}
            active={viewMode === 'spread'}
          />
          <ToolbarIcon
            icon={ScanLine}
            label="Vertical strip"
            onClick={() => setViewTyped('strip')}
            active={viewMode === 'strip'}
          />
        </Group>

        <Group>
          <ToolbarIcon
            icon={StretchHorizontal}
            label="Fit width"
            onClick={() => setFitTyped('width')}
            active={fitMode === 'width'}
          />
          <ToolbarIcon
            icon={StretchVertical}
            label="Fit height"
            onClick={() => setFitTyped('height')}
            active={fitMode === 'height'}
          />
          <ToolbarIcon
            icon={Maximize2}
            label="Best fit"
            onClick={() => setFitTyped('best')}
            active={fitMode === 'best'}
          />
          <ToolbarIcon
            icon={Minimize2}
            label="Original size"
            onClick={() => setFitTyped('original')}
            active={fitMode === 'original'}
          />
        </Group>

        <Group>
          <ToolbarIcon icon={ZoomOut} label="Zoom out" onClick={() => setZoom(zoom - 0.1)} />
          <span className="w-12 text-center text-xs font-medium text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarIcon icon={ZoomIn} label="Zoom in" onClick={() => setZoom(zoom + 0.1)} />
          <ToolbarIcon icon={RotateCw} label="Rotate" onClick={() => rotate(90)} />
        </Group>

        <Group>
          <ToolbarIcon
            icon={ArrowLeftRight}
            label={`Reading direction: ${readingDirection.toUpperCase()}`}
            onClick={toggleDirection}
            active={readingDirection === 'rtl'}
          />
          <ToolbarIcon
            icon={BookOpen}
            label="Reset view"
            onClick={() => {
              setZoom(1)
              setFitTyped('best')
            }}
          />
        </Group>

        {onInfo || onBookmarks ? (
          <Group>
            {onInfo ? (
              <ToolbarIcon
                icon={Info}
                label="Comic information"
                onClick={onInfo}
              />
            ) : null}
            {onBookmarks ? (
              <ToolbarIcon
                icon={Bookmark}
                label="Bookmarks"
                onClick={onBookmarks}
                active={bookmarksActive}
              />
            ) : null}
          </Group>
        ) : null}
      </div>
    </div>
  )
}
