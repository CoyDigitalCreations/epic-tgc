import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveCardImage,
  getCardImage,
  getAllCardImages,
  deleteCardImage,
  clearCardImages,
} from '../image-store'

// fake-indexeddb gives us a REAL IndexedDB implementation in jsdom, so these
// tests exercise the actual get/put/delete code paths — not just the no-op
// fallback used when `indexedDB` is undefined.

beforeEach(async () => {
  await clearCardImages()
  vi.resetModules()
})

describe('image-store (IndexedDB real)', () => {
  it('guarda y lee una imagen por id', async () => {
    await saveCardImage('c1', 'data:image/webp;base64,AAA')
    const img = await getCardImage('c1')
    expect(img).toBe('data:image/webp;base64,AAA')
  })

  it('LEE DESDE IndexedDB, no desde el cache en memoria (regresión del tx())', async () => {
    // Guarda con el módulo A (cache lleno), luego recarga "fresco" el módulo
    // (cache vacío) y lee: debe venir de IndexedDB, no de memoria.
    await saveCardImage('c1', 'data:image/webp;base64,AAA')
    vi.resetModules()
    const fresh = await import('../image-store')
    const img = await fresh.getCardImage('c1')
    expect(img).toBe('data:image/webp;base64,AAA')
  })

  it('getAllCardImages devuelve todas las imágenes guardadas', async () => {
    await saveCardImage('c1', 'data:image/webp;base64,AAA')
    await saveCardImage('c2', 'data:image/webp;base64,BBB')
    const all = await getAllCardImages()
    expect(all.map((r) => r.id).sort()).toEqual(['c1', 'c2'])
  })

  it('deleteCardImage remueve la imagen', async () => {
    await saveCardImage('c1', 'data:image/webp;base64,AAA')
    await deleteCardImage('c1')
    expect(await getCardImage('c1')).toBeUndefined()
  })

  it('clearCardImages vacía el store', async () => {
    await saveCardImage('c1', 'data:image/webp;base64,AAA')
    await clearCardImages()
    expect(await getAllCardImages()).toEqual([])
  })
})
