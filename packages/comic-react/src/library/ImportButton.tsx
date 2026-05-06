'use client'

import { useCallback, useRef } from 'react'
import { Plus } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { ComicSource } from '@comics-platform/comic-core'

export interface ImportButtonProps {
  onImport: (sources: ComicSource[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  className?: string
}

const DEFAULT_ACCEPT = '.cbr,.cbz,.cbt,.rar,.zip,.tar,.pdf,image/*'

export function ImportButton({
  onImport,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  label = 'Import',
  className = '',
}: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      if (files.length === 0) return
      const sources: ComicSource[] = files.map((file) => ({ kind: 'file', file }))
      onImport(sources)
      event.target.value = ''
    },
    [onImport],
  )

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 ${className}`}
      >
        <Plus size={16} />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}
