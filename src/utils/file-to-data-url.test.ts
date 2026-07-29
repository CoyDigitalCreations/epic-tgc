import { describe, it, expect } from 'vitest'
import { isValidImageFile } from './file-to-data-url'

describe('isValidImageFile', () => {
  it('accepts PNG files', () => {
    const file = new File([''], 'test.png', { type: 'image/png' })
    expect(isValidImageFile(file)).toBe(true)
  })

  it('accepts JPEG files', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    expect(isValidImageFile(file)).toBe(true)
  })

  it('accepts WebP files', () => {
    const file = new File([''], 'test.webp', { type: 'image/webp' })
    expect(isValidImageFile(file)).toBe(true)
  })

  it('accepts AVIF files', () => {
    const file = new File([''], 'test.avif', { type: 'image/avif' })
    expect(isValidImageFile(file)).toBe(true)
  })

  it('rejects SVG files', () => {
    const file = new File([''], 'test.svg', { type: 'image/svg+xml' })
    expect(isValidImageFile(file)).toBe(false)
  })

  it('rejects GIF files', () => {
    const file = new File([''], 'test.gif', { type: 'image/gif' })
    expect(isValidImageFile(file)).toBe(false)
  })

  it('rejects non-image files', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' })
    expect(isValidImageFile(file)).toBe(false)
  })
})
