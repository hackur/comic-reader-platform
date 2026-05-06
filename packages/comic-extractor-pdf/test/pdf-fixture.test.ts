import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { PdfComicExtractor } from '../src/PdfComicExtractor.js'

// pdf.js needs a worker + canvas to actually render pages, neither of which is
// available in vitest's happy-dom env. We exercise canOpen() (signature-only)
// against the real fixture and skip page rendering. Full parse coverage will
// move to a browser test runner once one is wired up.
describe.skipIf(typeof Blob === 'undefined')('PdfComicExtractor on real fixtures', () => {
  it('canOpen recognises the synthesized PDF', async () => {
    const bytes = await loadFixture('pdf/synthetic.pdf')
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const extractor = new PdfComicExtractor()
    expect(await extractor.canOpen({ kind: 'blob', blob, name: 'synthetic.pdf' })).toBe(true)
  })

  it('canOpen rejects a non-PDF', async () => {
    const bytes = await loadFixture('cbz/synthetic.cbz')
    const blob = new Blob([bytes], { type: 'application/zip' })
    expect(await new PdfComicExtractor().canOpen({ kind: 'blob', blob, name: 'x.cbz' })).toBe(
      false,
    )
  })
})
