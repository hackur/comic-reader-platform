import { describe, it, expect } from 'vitest'
import { loadFixture } from '@fixtures'
import { ImagesComicExtractor } from '../src/ImagesComicExtractor.js'

const PAGES = ['page-01.jpg', 'page-02.jpg', 'page-03.jpg', 'page-04.jpg']

async function loadPage(name: string): Promise<File> {
  const bytes = await loadFixture(`images/sample-folder/${name}`)
  return new File([bytes], name, { type: 'image/jpeg' })
}

describe.skipIf(typeof File === 'undefined')('ImagesComicExtractor on real fixtures', () => {
  it('opens a 4-image set and returns pages in natural-sort order', async () => {
    const files = await Promise.all(PAGES.map(loadPage))
    // Shuffle the input to verify natural-sort behaviour, not insertion order.
    const shuffled = [files[2]!, files[0]!, files[3]!, files[1]!]
    const extractor = new ImagesComicExtractor()

    const book = await extractor.open({
      kind: 'images',
      files: shuffled,
      name: 'desperado-sample',
    })

    expect(book.format).toBe('images')
    expect(book.pageCount).toBe(4)
    expect(book.pages.map((p) => p.name)).toEqual(PAGES)
  })

  it('getBlob returns JPEG bytes', async () => {
    const files = await Promise.all(PAGES.map(loadPage))
    const book = await new ImagesComicExtractor().open({
      kind: 'images',
      files,
      name: 'desperado-sample',
    })
    const out = await book.pages[0]!.getBlob()
    const head = new Uint8Array(await out.arrayBuffer())
    expect(head[0]).toBe(0xff)
    expect(head[1]).toBe(0xd8)
  })
})
