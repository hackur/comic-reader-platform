import {
  createComicStorage,
  MemoryComicStorage,
  type ComicStorage,
} from '@comics-platform/comic-storage'

let cached: Promise<ComicStorage> | null = null

export function getStorage(): Promise<ComicStorage> {
  if (cached) return cached
  if (typeof window === 'undefined') {
    cached = Promise.resolve(new MemoryComicStorage())
    return cached
  }
  cached = createComicStorage()
  return cached
}
