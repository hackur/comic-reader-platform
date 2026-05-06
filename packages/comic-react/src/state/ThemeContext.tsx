'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: ThemePreference
  setTheme: (t: ThemePreference) => void
  resolved: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps {
  initialTheme?: ThemePreference
  onChange?: (theme: ThemePreference) => void
  children: ReactNode
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  initialTheme = 'system',
  onChange,
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  )

  // Keep state in sync if the host swaps the initial theme later (e.g. once
  // preferences load from storage).
  useEffect(() => {
    setThemeState(initialTheme)
  }, [initialTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    }
    // Safari < 14 fallback
    mq.addListener(listener)
    return () => mq.removeListener(listener)
  }, [])

  const resolved: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setThemeState(t)
      onChange?.(t)
    },
    [onChange],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolved }),
    [theme, setTheme, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
