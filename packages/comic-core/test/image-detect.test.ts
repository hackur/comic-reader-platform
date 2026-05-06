import { describe, expect, it } from 'vitest'
import { imageMimeFromExt, isImageFilename } from '../src'

describe('isImageFilename', () => {
  it('accepts common image extensions', () => {
    expect(isImageFilename('cover.jpg')).toBe(true)
    expect(isImageFilename('page-01.PNG')).toBe(true)
    expect(isImageFilename('strip.webp')).toBe(true)
    expect(isImageFilename('art.avif')).toBe(true)
  })

  it('rejects non-image extensions', () => {
    expect(isImageFilename('ComicInfo.xml')).toBe(false)
    expect(isImageFilename('Thumbs.db')).toBe(false)
    expect(isImageFilename('readme')).toBe(false)
    expect(isImageFilename('')).toBe(false)
    expect(isImageFilename('archive.zip')).toBe(false)
  })
})

describe('imageMimeFromExt', () => {
  it('maps known filenames to MIME types', () => {
    expect(imageMimeFromExt('a.jpg')).toBe('image/jpeg')
    expect(imageMimeFromExt('a.jpeg')).toBe('image/jpeg')
    expect(imageMimeFromExt('a.png')).toBe('image/png')
    expect(imageMimeFromExt('a.webp')).toBe('image/webp')
    expect(imageMimeFromExt('a.gif')).toBe('image/gif')
  })

  it('is case-insensitive', () => {
    expect(imageMimeFromExt('a.PNG')).toBe('image/png')
  })

  it('returns undefined for unknown extensions', () => {
    expect(imageMimeFromExt('a.xml')).toBeUndefined()
    expect(imageMimeFromExt('noext')).toBeUndefined()
  })
})
