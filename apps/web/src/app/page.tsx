'use client'

import { useRouter } from 'next/navigation'
import type { ComicSource } from '@comics-platform/comic-core'
import {
  ComicDropzone,
  ComicGridLibrary,
  useComicLibrary,
} from '@comics-platform/comic-react'

const stack = [
  'Next.js 16.2',
  'React 19.2',
  'TypeScript 6.0',
  'Tailwind CSS 4.2',
  'Cloudflare Pages static export',
]

export default function Home() {
  const router = useRouter()
  const library = useComicLibrary()

  const handleFileSelect = async (sources: ComicSource[]) => {
    for (const source of sources) {
      try {
        await library.importSource(source)
      } catch (error) {
        console.error('Failed to import comic', error)
      }
    }
  }

  const handleOpen = (id: string) => {
    router.push(`/reader?id=${encodeURIComponent(id)}`)
  }

  const handleDelete = async (id: string) => {
    try {
      await library.remove(id)
    } catch (error) {
      console.error('Failed to delete comic', error)
    }
  }

  const comics = library.comics ?? []
  const isEmpty = comics.length === 0

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex w-fit rounded-full border border-[var(--page-line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--page-muted)] shadow-sm backdrop-blur">
              CBZ first. CBR optional. Local first.
            </p>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Your local-first comic library, in any modern browser.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--page-muted)] sm:text-lg">
                Drop in CBZ, CBT, PDF, or folders of images. Files stay on your device, the reader runs as a static app, and CBR is supported as an optional plugin.
              </p>
            </div>
          </div>
          <div className="grid gap-2 rounded-[1.5rem] border border-[var(--page-line)] bg-[var(--page-panel)] p-5 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)] backdrop-blur sm:min-w-80">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--page-muted)]">
              Verified 2026 stack
            </p>
            <div className="flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[var(--page-muted)]">
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Drop to import</span>
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Stored in your browser</span>
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Read offline</span>
          </div>
          <ComicDropzone onFileSelect={handleFileSelect} />
        </section>

        <section className="rounded-[2rem] border border-[var(--page-line)] bg-white/80 p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--page-muted)]">
                Your library
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                {isEmpty ? 'Nothing here yet' : `${comics.length} ${comics.length === 1 ? 'comic' : 'comics'} on this device`}
              </h2>
            </div>
          </div>

          {isEmpty ? (
            <div className="grid place-items-center gap-3 rounded-[1.5rem] border border-dashed border-[var(--page-line)] bg-white/60 px-6 py-16 text-center">
              <p className="text-lg font-semibold tracking-[-0.02em]">
                Import your first comic
              </p>
              <p className="max-w-md text-sm leading-6 text-[var(--page-muted)]">
                Drag a CBZ, CBT, PDF, or folder of images onto the dropzone above. Everything stays in your browser, with metadata in IndexedDB and large blobs in OPFS.
              </p>
            </div>
          ) : (
            <ComicGridLibrary comics={comics} onOpen={handleOpen} onDelete={handleDelete} />
          )}
        </section>
      </div>
    </main>
  )
}
