import { describe, expect, it } from 'vitest'
import { parseComicInfoXml } from '../src'

const SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Series>Awesome Series</Series>
  <Number>3</Number>
  <PageCount>24</PageCount>
  <Writer>Jane Author</Writer>
</ComicInfo>`

describe('parseComicInfoXml', () => {
  it('parses series, number, and pageCount', () => {
    const info = parseComicInfoXml(SAMPLE)
    expect(info.series).toBe('Awesome Series')
    expect(info.number).toBe('3')
    expect(info.pageCount).toBe(24)
  })

  it('returns an empty object for malformed input', () => {
    const info = parseComicInfoXml('not xml at all')
    expect(info.series).toBeUndefined()
    expect(info.pageCount).toBeUndefined()
  })
})
