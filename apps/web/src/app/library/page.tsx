'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  ComicGridLibrary,
  LibrarySearchBar,
  useComicLibrary,
} from '@comics-platform/comic-react'

export default function LibraryPage() {
  const router = useRouter()
  const library = useComicLibrary()
  const comics = library.comics

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex w-fit rounded-full border border-[var(--page-line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--page-muted)] shadow-sm backdrop-blur">
              Library
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Everything stored on this device
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white/70 px-3 text-sm font-medium text-[var(--page-ink)] transition-colors hover:border-slate-400"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
        </header>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          {comics.length === 0 ? (
            <p className="text-[var(--page-muted)]">
              No comics yet. Head back to the home page to import some.
            </p>
          ) : (
            <>
              <LibrarySearchBar />
              <ComicGridLibrary
                comics={comics}
                onOpen={(id) =>
                  router.push(`/reader?id=${encodeURIComponent(id)}`)
                }
                onDelete={async (id) => {
                  if (
                    typeof window !== 'undefined' &&
                    window.confirm('Delete this comic from your local library?')
                  ) {
                    await library.remove(id)
                  }
                }}
                loadThumbnail={library.getThumbnail}
                emptyState="No comics match your search."
              />
            </>
          )}
        </section>
      </div>
    </main>
  )
}
