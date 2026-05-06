'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ExtractorRegistry } from '@comics-platform/comic-core'

export type { ExtractorRegistry }

const ExtractorContext = createContext<ExtractorRegistry | null>(null)

export interface ExtractorProviderProps {
  registry: ExtractorRegistry
  children: ReactNode
}

export function ExtractorProvider({ registry, children }: ExtractorProviderProps) {
  return (
    <ExtractorContext.Provider value={registry}>{children}</ExtractorContext.Provider>
  )
}

export function useExtractorRegistry(): ExtractorRegistry {
  const ctx = useContext(ExtractorContext)
  if (!ctx) {
    throw new Error('useExtractorRegistry must be used within an ExtractorProvider')
  }
  return ctx
}
