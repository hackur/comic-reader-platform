import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { ZipComicExtractor } from '../src/ZipComicExtractor.js'

describe.skipIf(typeof Blob === 'undefined')('ZipComicExtractor on real fixtures', () => {
  it('opens the synthesized CBZ and returns 4 image pages', async () => {
    const bytes = await loadFixture('cbz/synthetic.cbz')
    const blob = new Blob([bytes], { type: 'application/x-cbz' })
    const extractor = new ZipComicExtractor()

    expect(await extractor.canOpen({ kind: 'blob', blob, name: 'synthetic.cbz' })).toBe(true)

    const book = await extractor.open({ kind: 'blob', blob, name: 'synthetic.cbz' })
    expect(book.format).toBe('cbz')
    expect(book.pageCount).toBe(4)
    expect(book.pages).toHaveLength(4)
  })

  it('parses ComicInfo.xml from with-comicinfo.cbz', async () => {
    const bytes = await loadFixture('cbz/with-comicinfo.cbz')
    const blob = new Blob([bytes], { type: 'application/x-cbz' })
    const book = await new ZipComicExtractor().open({
      kind: 'blob',
      blob,
      name: 'with-comicinfo.cbz',
    })
    expect(book.metadata?.series).toBe('Desperado')
    expect(Number(book.metadata?.year)).toBe(1948)
  })

  it('opens the real PD Marvel Family fixture', async () => {
    const bytes = await loadFixture('cbz/marvel-family-66-inside-covers.cbz')
    const blob = new Blob([bytes], { type: 'application/x-cbz' })
    const book = await new ZipComicExtractor().open({
      kind: 'blob',
      blob,
      name: 'marvel-family-66-inside-covers.cbz',
    })
    expect(book.format).toBe('cbz')
    expect(book.pageCount).toBeGreaterThan(0)
  })

  it('rejects truncated.cbz', async () => {
    const bytes = await loadFixture('malformed/truncated.cbz')
    const blob = new Blob([bytes], { type: 'application/x-cbz' })
    await expect(
      new ZipComicExtractor().open({ kind: 'blob', blob, name: 'truncated.cbz' }),
    ).rejects.toBeDefined()
  })
})
