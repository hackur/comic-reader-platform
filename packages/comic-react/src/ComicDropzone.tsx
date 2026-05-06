'use client'

import { useCallback } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { ComicSource } from '@comics-platform/comic-core'

interface ComicDropzoneProps {
  onFileSelect: (sources: ComicSource[]) => void
  className?: string
}

export function ComicDropzone({ onFileSelect, className = '' }: ComicDropzoneProps) {
  // Audit (H): drop and click flows are mutually exclusive — a drag-drop
  // fires `onDrop` (we copy files from `dataTransfer.files`) while the
  // hidden `<input type="file">` only fires `onChange` from a click. There
  // is no dual-fire path because we do not forward the drop event into
  // the input. We still defensively clear `event.target.value` on the
  // input change so re-selecting the same file re-fires the change event.
  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    const sources: ComicSource[] = files.map(file => ({
      kind: 'file' as const,
      file
    }))
    // Clear the dataTransfer so any bubbling handlers do not re-process
    // the same files.
    try {
      event.dataTransfer.clearData()
    } catch {
      /* some browsers throw on clearData outside of dragstart */
    }
    onFileSelect(sources)
  }, [onFileSelect])

  const handleFileInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const sources: ComicSource[] = files.map(file => ({
      kind: 'file' as const,
      file
    }))
    // Reset so picking the same file twice still triggers onChange.
    event.target.value = ''
    onFileSelect(sources)
  }, [onFileSelect])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.75rem] border border-dashed border-slate-300/80 bg-white/70 p-8 text-left transition-colors hover:border-slate-400 ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-sky-500/60 to-transparent" />
      <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div className="space-y-4">
          <p className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Local library intake
          </p>
          <div className="space-y-2">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Drop comic files and keep them on-device.
            </p>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              Start with CBZ, allow optional CBR, and treat everything as a normalized page stream once the archive is opened.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="inline-flex cursor-pointer">
            <span className="rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-700">
              Browse Files
            </span>
            <input
              type="file"
              multiple
              accept=".cbr,.cbz,.cbt,.rar,.zip,.tar,.pdf,image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
          <p className="text-xs leading-6 text-slate-500">
            Accepted now: .cbz, .cbr, .cbt, .rar, .zip, .tar, .pdf, and standalone images.
          </p>
        </div>
      </div>
    </div>
  )
}