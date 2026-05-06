import { describe, expect, it } from 'vitest'
import { naturalCompare } from '../src'

describe('naturalCompare', () => {
  it('orders numbers numerically, not lexically', () => {
    expect(naturalCompare('p2', 'p10')).toBeLessThan(0)
    expect(naturalCompare('p10', 'p2')).toBeGreaterThan(0)
  })

  it('orders single letters alphabetically', () => {
    expect(naturalCompare('a', 'b')).toBeLessThan(0)
    expect(naturalCompare('b', 'a')).toBeGreaterThan(0)
  })

  it('handles mixed letters and numbers', () => {
    const input = ['page10.jpg', 'page2.jpg', 'page1.jpg', 'page20.jpg']
    const sorted = [...input].sort(naturalCompare)
    expect(sorted).toEqual(['page1.jpg', 'page2.jpg', 'page10.jpg', 'page20.jpg'])
  })

  it('returns 0 for equal strings', () => {
    expect(naturalCompare('chapter-01.cbz', 'chapter-01.cbz')).toBe(0)
  })
})
