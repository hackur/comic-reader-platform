import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { detectFormat } from '../src/format-detect.js'

async function blobSource(relPath: string, name: string, type: string) {
  const bytes = await loadFixture(relPath)
  return { kind: 'blob' as const, blob: new Blob([bytes], { type }), name }
}

describe.skipIf(typeof Blob === 'undefined')('detectFormat across all real fixtures', () => {
  it('CBZ', async () => {
    const src = await blobSource('cbz/synthetic.cbz', 'synthetic.cbz', 'application/x-cbz')
    expect(await detectFormat(src)).toBe('cbz')
  })

  it('real PD CBZ', async () => {
    const src = await blobSource(
      'cbz/marvel-family-66-inside-covers.cbz',
      'marvel-family-66-inside-covers.cbz',
      'application/x-cbz',
    )
    expect(await detectFormat(src)).toBe('cbz')
  })

  it('CBR', async () => {
    const src = await blobSource(
      'cbr/things-to-come-1955-01.cbr',
      'things-to-come-1955-01.cbr',
      'application/x-cbr',
    )
    expect(await detectFormat(src)).toBe('cbr')
  })

  it('CBT', async () => {
    const src = await blobSource('cbt/synthetic.cbt', 'synthetic.cbt', 'application/x-tar')
    expect(await detectFormat(src)).toBe('cbt')
  })

  it('PDF', async () => {
    const src = await blobSource('pdf/synthetic.pdf', 'synthetic.pdf', 'application/pdf')
    expect(await detectFormat(src)).toBe('pdf')
  })
})
