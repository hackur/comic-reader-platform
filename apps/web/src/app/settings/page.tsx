'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Trash2, Upload } from 'lucide-react'
import { useTheme } from '@comics-platform/comic-react'
import {
  DEFAULT_PREFERENCES,
  type ComicStorage,
  type Preferences,
} from '@comics-platform/comic-storage'
import { getStorage } from '@/lib/storage'
import { exportLibrary, importLibrary } from '@/lib/library-export'

type ThemeOption = Preferences['theme']
type FitOption = Preferences['defaultFitMode']
type ViewOption = Preferences['defaultViewMode']
type DirOption = Preferences['defaultReadingDirection']

const THEME_OPTIONS: { value: ThemeOption; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Follow OS preference' },
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
]

const FIT_OPTIONS: FitOption[] = ['width', 'height', 'best', 'original']
const VIEW_OPTIONS: ViewOption[] = ['single', 'spread', 'strip']

interface QuotaInfo {
  usage?: number
  quota?: number
}

function formatBytes(n: number | undefined): string {
  if (n === undefined) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [storage, setStorage] = useState<ComicStorage | null>(null)
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await getStorage()
      if (cancelled) return
      const p = (await s.getPreferences()) ?? DEFAULT_PREFERENCES
      if (cancelled) return
      setStorage(s)
      setPrefs(p)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.estimate !== 'function'
    ) {
      return
    }
    void navigator.storage
      .estimate()
      .then((est) => setQuota({ usage: est.usage, quota: est.quota }))
      .catch(() => setQuota(null))
  }, [])

  const persist = async (next: Preferences) => {
    if (!storage) return
    setPrefs(next)
    await storage.setPreferences(next)
  }

  const handleThemeChange = (value: ThemeOption) => {
    setTheme(value)
    void persist({ ...prefs, theme: value })
  }

  const handleExport = async () => {
    if (!storage) return
    setBusy('export')
    setError(null)
    setMessage(null)
    try {
      const blob = await exportLibrary(storage)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comic-library-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage('Library exported.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !storage) return
    setBusy('import')
    setError(null)
    setMessage(null)
    try {
      const result = await importLibrary(storage, file)
      setMessage(`Imported ${result.added} comic(s); skipped ${result.skipped}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(null)
    }
  }

  const handleClear = async () => {
    if (!storage) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Clear the entire local library? This deletes all comics, archives, thumbnails, and bookmarks on this device.',
      )
    ) {
      return
    }
    setBusy('clear')
    setError(null)
    setMessage(null)
    try {
      await storage.clear()
      setMessage('Library cleared.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear library')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--page-muted)]">
              Settings
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">
              Preferences and library tools
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--page-line)] bg-white/70 px-3 text-sm font-medium text-[var(--page-muted)] transition-colors hover:text-[var(--page-ink)]"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </header>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {/* Theme */}
        <section className="rounded-2xl border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight">Theme</h2>
          <p className="mt-1 text-sm text-[var(--page-muted)]">
            Choose how the app should pick its color scheme.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${
                    active
                      ? 'border-sky-500 bg-sky-50/70 text-[var(--page-ink)]'
                      : 'border-[var(--page-line)] bg-white/60 text-[var(--page-ink)] hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="theme"
                      value={opt.value}
                      checked={active}
                      onChange={() => handleThemeChange(opt.value)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </div>
                  <span className="text-xs text-[var(--page-muted)]">
                    {opt.hint}
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        {/* Reading defaults */}
        <section className="rounded-2xl border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight">Reading defaults</h2>
          <p className="mt-1 text-sm text-[var(--page-muted)]">
            Applied to newly opened comics that have no saved state.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--page-ink)]">Fit mode</span>
              <select
                value={prefs.defaultFitMode}
                onChange={(e) =>
                  void persist({
                    ...prefs,
                    defaultFitMode: e.target.value as FitOption,
                  })
                }
                className="rounded-lg border border-[var(--page-line)] bg-white/70 px-3 py-2 text-sm text-[var(--page-ink)]"
              >
                {FIT_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--page-ink)]">View mode</span>
              <select
                value={prefs.defaultViewMode}
                onChange={(e) =>
                  void persist({
                    ...prefs,
                    defaultViewMode: e.target.value as ViewOption,
                  })
                }
                className="rounded-lg border border-[var(--page-line)] bg-white/70 px-3 py-2 text-sm text-[var(--page-ink)]"
              >
                {VIEW_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-[var(--page-ink)]">
                Reading direction
              </span>
              <div className="inline-flex w-fit items-center rounded-full border border-[var(--page-line)] bg-white/70 p-1 text-xs">
                {(['ltr', 'rtl'] as DirOption[]).map((dir) => {
                  const active = prefs.defaultReadingDirection === dir
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() =>
                        void persist({ ...prefs, defaultReadingDirection: dir })
                      }
                      className={`rounded-full px-3 py-1 font-medium transition-colors ${
                        active
                          ? 'bg-sky-600 text-white'
                          : 'text-[var(--page-muted)] hover:text-[var(--page-ink)]'
                      }`}
                    >
                      {dir.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Library export/import */}
        <section className="rounded-2xl border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight">Library</h2>
          <p className="mt-1 text-sm text-[var(--page-muted)]">
            Export or import your library metadata as JSON. Archives and
            thumbnails are not included.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!storage || busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--page-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--page-ink)] transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={14} />
              Export library JSON
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={!storage || busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--page-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--page-ink)] transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={14} />
              Import library JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </section>

        {/* Storage */}
        <section className="rounded-2xl border border-[var(--page-line)] bg-[var(--page-panel)] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight">Storage</h2>
          <div className="mt-3 grid gap-1 text-sm text-[var(--page-muted)]">
            <p>
              Used:{' '}
              <span className="text-[var(--page-ink)]">
                {formatBytes(quota?.usage)}
              </span>
            </p>
            <p>
              Quota:{' '}
              <span className="text-[var(--page-ink)]">
                {formatBytes(quota?.quota)}
              </span>
            </p>
            {!quota ? (
              <p className="text-xs">
                Storage estimate is unavailable in this browser.
              </p>
            ) : null}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleClear}
              disabled={!storage || busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white/80 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={14} />
              Clear local library
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
