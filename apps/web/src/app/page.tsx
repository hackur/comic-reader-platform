'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import type { ComicSource } from '@comics-platform/comic-core'
import {
  ComicDropzone,
  ComicGridLibrary,
  LibrarySearchBar,
  useComicLibrary,
  useTheme,
} from '@comics-platform/comic-react'

export default function Home() {
  const router = useRouter()
  const library = useComicLibrary()
  const { theme, setTheme, resolved } = useTheme()

  const handleFileSelect = async (sources: ComicSource[]) => {
    for (const source of sources) {
      try {
        await library.importSource(source)
      } catch (err) {
        // Error is also captured in library.error and rendered below
        console.error('Failed to import comic', err)
      }
    }
  }

  const handleOpen = (id: string) => {
    router.push(`/reader?id=${encodeURIComponent(id)}`)
  }

  const handleDelete = async (id: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this comic from your local library?')
    ) {
      return
    }
    try {
      await library.remove(id)
    } catch (err) {
      console.error('Failed to delete comic', err)
    }
  }

  const toggleTheme = () => {
    // Cycle: system -> opposite-of-resolved -> system
    if (theme === 'system') {
      setTheme(resolved === 'dark' ? 'light' : 'dark')
    } else {
      setTheme('system')
    }
  }

  const comics = library.comics
  const hasComics = comics.length > 0

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <img
              src="/logo.svg"
              alt=""
              width={48}
              height={48}
              className="mt-1 size-12 shrink-0 text-[var(--page-ink)]"
            />
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
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
              title={`Theme: ${theme}${theme === 'system' ? ` (${resolved})` : ''}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--page-line)] bg-white/70 text-[var(--page-ink)] transition-colors hover:border-slate-400"
            >
              {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/settings"
              aria-label="Open settings"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white/70 px-3 text-sm font-medium text-[var(--page-ink)] transition-colors hover:border-slate-400"
            >
              <SettingsIcon size={14} />
              Settings
            </Link>
          </div>
        </header>

        {library.error ? (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm">
            <div>
              <p className="font-semibold">Something went wrong importing that comic</p>
              <p className="mt-1 text-rose-700">{library.error.message}</p>
            </div>
            <button
              type="button"
              onClick={() => library.clearError()}
              className="rounded-full border border-rose-300 bg-white/70 px-3 py-1 text-xs font-medium text-rose-700 hover:border-rose-400"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[var(--page-muted)]">
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Drop to import</span>
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Stored in your browser</span>
            <span className="rounded-full border border-[var(--page-line)] px-3 py-1">Read offline</span>
          </div>
          <ComicDropzone onFileSelect={handleFileSelect} />
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-[var(--page-line)] bg-white/80 p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--page-muted)]">
                Your library
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                {hasComics
                  ? `${comics.length} ${comics.length === 1 ? 'comic' : 'comics'} on this device`
                  : 'Nothing here yet'}
              </h2>
            </div>
          </div>

          {hasComics ? <LibrarySearchBar /> : null}

          {!hasComics ? (
            <div className="grid place-items-center gap-3 rounded-[1.5rem] border border-dashed border-[var(--page-line)] bg-white/60 px-6 py-16 text-center">
              <p className="text-lg font-semibold tracking-[-0.02em]">
                Import your first comic
              </p>
              <p className="max-w-md text-sm leading-6 text-[var(--page-muted)]">
                Drag a CBZ, CBT, PDF, or folder of images onto the dropzone above. Everything stays in your browser, with metadata in IndexedDB and large blobs in OPFS.
              </p>
            </div>
          ) : (
            <ComicGridLibrary
              comics={comics}
              onOpen={handleOpen}
              onDelete={handleDelete}
              loadThumbnail={library.getThumbnail}
              emptyState="No comics match your search."
            />
          )}
        </section>
      </div>
    </main>
  )
}
