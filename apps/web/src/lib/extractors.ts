import {
  ExtractorRegistry,
  defaultRegistry,
  type ComicExtractor,
} from '@comics-platform/comic-core'
import { ZipComicExtractor } from '@comics-platform/comic-extractor-zip'
import { TarComicExtractor } from '@comics-platform/comic-extractor-tar'
import { ImagesComicExtractor } from '@comics-platform/comic-extractor-images'

let built = false
let pdfLoadPromise: Promise<ComicExtractor> | null = null
let rarLoadPromise: Promise<ComicExtractor> | null = null

/**
 * Register the always-available extractors. PDF and RAR are lazy-loaded
 * on demand because pdfjs-dist and libarchive.js pull in browser-only
 * globals at module evaluation time.
 */
export function buildRegistry(): ExtractorRegistry {
  if (built) return defaultRegistry

  defaultRegistry.register('cbz', new ZipComicExtractor())
  defaultRegistry.register('cbt', new TarComicExtractor())
  defaultRegistry.register('images', new ImagesComicExtractor())

  built = true
  return defaultRegistry
}

export async function getPdfExtractor(): Promise<ComicExtractor> {
  if (!pdfLoadPromise) {
    pdfLoadPromise = import('@comics-platform/comic-extractor-pdf').then(
      (mod) => new mod.PdfComicExtractor(),
    )
  }
  return pdfLoadPromise
}

export async function ensurePdfSupport(
  registry: ExtractorRegistry,
): Promise<void> {
  const pdf = await getPdfExtractor()
  registry.register('pdf', pdf)
}

export async function getRarExtractor(): Promise<ComicExtractor> {
  if (!rarLoadPromise) {
    rarLoadPromise = import('@comics-platform/comic-extractor-rar').then(
      (mod) => new mod.RarComicExtractor(),
    )
  }
  return rarLoadPromise
}

export async function ensureRarSupport(
  registry: ExtractorRegistry,
): Promise<void> {
  const rar = await getRarExtractor()
  registry.register('cbr', rar)
}
