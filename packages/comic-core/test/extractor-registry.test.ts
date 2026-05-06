import { describe, expect, it } from 'vitest'
import {
  ExtractorRegistry,
  ComicError,
  type ComicBook,
  type ComicExtractor,
  type ComicSource,
} from '../src'

function fakeExtractor(): ComicExtractor {
  return {
    async canOpen(): Promise<boolean> {
      return true
    },
    async open(source: ComicSource): Promise<ComicBook> {
      const name =
        source.kind === 'file'
          ? source.file.name
          : source.kind === 'blob'
            ? source.name
            : source.kind === 'url'
              ? (source.name ?? source.url)
              : 'fake'
      return {
        id: 'fake-1',
        title: name,
        format: 'cbz',
        pageCount: 0,
        pages: [],
      }
    },
  }
}

function makeBlobSource(name: string): ComicSource {
  return { kind: 'blob', blob: new Blob([], { type: 'application/zip' }), name }
}

describe('ExtractorRegistry', () => {
  it('registers and resolves an extractor by detected format', async () => {
    const registry = new ExtractorRegistry()
    const ext = fakeExtractor()
    registry.register('cbz', ext)
    const resolved = await registry.resolve(makeBlobSource('book.cbz'))
    expect(resolved).toBe(ext)
  })

  it('throws ComicError for an unsupported source', async () => {
    const registry = new ExtractorRegistry()
    await expect(registry.resolve(makeBlobSource('mystery.xyz'))).rejects.toThrow(
      ComicError,
    )
  })

  it('lists registered formats', () => {
    const registry = new ExtractorRegistry()
    registry.register('cbz', fakeExtractor())
    registry.register('cbt', fakeExtractor())
    expect(registry.list().sort()).toEqual(['cbt', 'cbz'])
  })
})
