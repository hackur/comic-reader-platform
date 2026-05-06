'use client'

import { useRouter } from 'next/navigation'
import {
  ComicGridLibrary,
  useComicLibrary,
} from '@comics-platform/comic-react'

export default function LibraryPage() {
  const router = useRouter()
  const library = useComicLibrary()
  const comics = library.comics

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <p className="inline-flex w-fit rounded-full border border-[var(--page-line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--page-muted)] shadow-sm backdrop-blur">
            Library
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Everything stored on this device
          </h1>
        </header>
        <section className="rounded-[2rem] border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          {comics.length === 0 ? (
            <p className="text-[var(--page-muted)]">
              No comics yet. Head back to the home page to import some.
            </p>
          ) : (
            <ComicGridLibrary
              comics={comics}
              onOpen={(id) =>
                router.push(`/reader?id=${encodeURIComponent(id)}`)
              }
            />
          )}
        </section>
      </div>
    </main>
  )
}
