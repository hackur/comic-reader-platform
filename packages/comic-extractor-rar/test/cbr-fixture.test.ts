import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { RarComicExtractor } from '../src/RarComicExtractor.js'

// libarchive.js needs a Web Worker + WASM. We can't reliably parse the CBR
// inside vitest's happy-dom env, so we cover the cheap-but-meaningful checks:
// canOpen() (signature sniffing) on the real downloaded CBR, and rejection of
// the wrong-magic negative fixture.
describe.skipIf(typeof Blob === 'undefined')('RarComicExtractor on real fixtures', () => {
  it('canOpen recognises the real PD CBR (Things To Come 1955-01)', async () => {
    const bytes = await loadFixture('cbr/things-to-come-1955-01.cbr')
    const blob = new Blob([bytes], { type: 'application/x-cbr' })
    expect(
      await new RarComicExtractor().canOpen({
        kind: 'blob',
        blob,
        name: 'things-to-come-1955-01.cbr',
      }),
    ).toBe(true)
  })

  it('canOpen rejects bytes with wrong magic when extension does not hint RAR', async () => {
    // canOpen accepts any .cbr/.rar name *or* the RAR magic. Strip the extension
    // hint so this exercises the magic-byte path only.
    const bytes = await loadFixture('malformed/wrong-magic.cbr')
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    expect(
      await new RarComicExtractor().canOpen({ kind: 'blob', blob, name: 'unknown.bin' }),
    ).toBe(false)
  })

  it('canOpen rejects a CBZ (extension+magic both wrong)', async () => {
    const bytes = await loadFixture('cbz/synthetic.cbz')
    const blob = new Blob([bytes], { type: 'application/zip' })
    expect(
      await new RarComicExtractor().canOpen({ kind: 'blob', blob, name: 'synthetic.cbz' }),
    ).toBe(false)
  })
})
