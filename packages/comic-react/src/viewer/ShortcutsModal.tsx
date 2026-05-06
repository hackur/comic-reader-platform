'use client'

import { useEffect } from 'react'

export interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
}

interface ShortcutRow {
  keys: string
  label: string
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: '→ / Space / PageDown', label: 'Next page' },
  { keys: '← / PageUp', label: 'Previous page' },
  { keys: 'Home', label: 'First page' },
  { keys: 'End', label: 'Last page' },
  { keys: '+ / =', label: 'Zoom in' },
  { keys: '- / _', label: 'Zoom out' },
  { keys: '0', label: 'Reset zoom' },
  { keys: 'r', label: 'Rotate 90°' },
  { keys: 'f', label: 'Fit to screen' },
  { keys: 'b', label: 'Bookmark page (coming soon)' },
  { keys: '?', label: 'Show this help' },
  { keys: 'Esc', label: 'Close' },
]

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--page-line)] bg-[var(--page-panel)] p-6 text-[var(--page-ink)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--page-line)] px-3 py-1 text-xs font-medium text-[var(--page-muted)] hover:text-[var(--page-ink)]"
          >
            Close
          </button>
        </div>
        <ul className="grid gap-2 text-sm">
          {SHORTCUTS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 border-b border-[var(--page-line)]/60 py-1.5 last:border-b-0"
            >
              <span className="text-[var(--page-muted)]">{row.label}</span>
              <kbd className="rounded-md border border-[var(--page-line)] bg-white/40 px-2 py-0.5 font-mono text-xs text-[var(--page-ink)]">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
