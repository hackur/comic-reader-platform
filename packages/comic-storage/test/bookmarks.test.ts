import { describe, expect, it } from 'vitest'
import { MemoryComicStorage, type Bookmark } from '../src'

const sampleBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: 'bm-1',
  comicId: 'book-1',
  page: 5,
  label: 'Cool moment',
  createdAt: new Date('2026-02-01').toISOString(),
  ...overrides,
})

describe('MemoryComicStorage bookmarks', () => {
  it('adds, lists, and removes bookmarks', async () => {
    const storage = new MemoryComicStorage()
    expect(await storage.listBookmarks('book-1')).toEqual([])

    const a = sampleBookmark()
    const b = sampleBookmark({ id: 'bm-2', page: 11, label: undefined })
    await storage.addBookmark(a)
    await storage.addBookmark(b)

    const list = await storage.listBookmarks('book-1')
    expect(list).toHaveLength(2)
    expect(list.map((x) => x.id).sort()).toEqual(['bm-1', 'bm-2'])

    await storage.removeBookmark('bm-1')
    const after = await storage.listBookmarks('book-1')
    expect(after).toHaveLength(1)
    expect(after[0]?.id).toBe('bm-2')
  })

  it('isolates bookmarks per comic', async () => {
    const storage = new MemoryComicStorage()
    await storage.addBookmark(sampleBookmark({ id: 'a', comicId: 'book-1' }))
    await storage.addBookmark(sampleBookmark({ id: 'b', comicId: 'book-2' }))

    expect(await storage.listBookmarks('book-1')).toHaveLength(1)
    expect(await storage.listBookmarks('book-2')).toHaveLength(1)
    expect(await storage.listBookmarks('missing')).toEqual([])
  })

  it('cascades delete when comic is removed', async () => {
    const storage = new MemoryComicStorage()
    await storage.addComic({
      id: 'book-1',
      title: 't',
      format: 'cbz',
      sourceName: 's',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await storage.addBookmark(sampleBookmark())
    await storage.deleteComic('book-1')
    expect(await storage.listBookmarks('book-1')).toEqual([])
  })
})
