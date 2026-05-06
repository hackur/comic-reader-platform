import { describe, expect, it } from 'vitest'
import { MemoryComicStorage } from '../src'

const sampleRecord = () => ({
  id: 'book-1',
  title: 'Test Issue #1',
  format: 'cbz' as const,
  sourceName: 'test.cbz',
  pageCount: 22,
  addedAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
})

describe('MemoryComicStorage', () => {
  it('round-trips add/get/list/delete', async () => {
    const storage = new MemoryComicStorage()
    const record = sampleRecord()

    expect(await storage.listComics()).toEqual([])

    await storage.addComic(record)
    expect(await storage.getComic(record.id)).toEqual(record)
    expect(await storage.listComics()).toHaveLength(1)

    await storage.deleteComic(record.id)
    expect(await storage.getComic(record.id)).toBeUndefined()
    expect(await storage.listComics()).toEqual([])
  })

  it('overwrites an existing record on add with the same id', async () => {
    const storage = new MemoryComicStorage()
    const record = sampleRecord()
    await storage.addComic(record)
    await storage.addComic({ ...record, title: 'Updated Title' })
    const fetched = await storage.getComic(record.id)
    expect(fetched?.title).toBe('Updated Title')
    expect(await storage.listComics()).toHaveLength(1)
  })
})
