import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { TarComicExtractor } from '../src/TarComicExtractor.js'

describe.skipIf(typeof Blob === 'undefined')('TarComicExtractor on real fixtures', () => {
  it('opens the synthesized CBT and returns 4 image pages', async () => {
    const bytes = await loadFixture('cbt/synthetic.cbt')
    const blob = new Blob([bytes], { type: 'application/x-tar' })
    const extractor = new TarComicExtractor()

    expect(await extractor.canOpen({ kind: 'blob', blob, name: 'synthetic.cbt' })).toBe(true)

    const book = await extractor.open({ kind: 'blob', blob, name: 'synthetic.cbt' })
    expect(book.format).toBe('cbt')
    expect(book.pageCount).toBe(4)
    expect(book.pages).toHaveLength(4)

    const firstPage = await book.pages[0]!.getBlob()
    const head = new Uint8Array(await firstPage.arrayBuffer())
    expect(head[0]).toBe(0xff)
    expect(head[1]).toBe(0xd8)
  })
})
