import { beforeEach, describe, expect, it, vi } from 'vitest'

const toPng = vi.fn()
const toCanvas = vi.fn()
vi.mock('html-to-image', () => ({ toPng: (...a: unknown[]) => toPng(...a), toCanvas: (...a: unknown[]) => toCanvas(...a) }))

import { CALIDAD_WEBP, exportCardToPng, exportCardToWebp } from '../export-png'

let clicks: Array<{ download: string; href: string }>

beforeEach(() => {
  toPng.mockReset()
  toCanvas.mockReset()
  clicks = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ download: this.download, href: this.href })
  })
})

describe('exportCardToPng', () => {
  it('descarga el PNG con la extensión .png', async () => {
    toPng.mockResolvedValue('data:image/png;base64,AAA')
    await exportCardToPng(document.createElement('div'), 'Vaela')
    expect(clicks).toEqual([{ download: 'Vaela.png', href: 'data:image/png;base64,AAA' }])
  })
})

describe('exportCardToWebp', () => {
  it('codifica el canvas como WebP con la calidad configurada y lo descarga como .webp', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/webp;base64,BBB')
    toCanvas.mockResolvedValue({ toDataURL })
    await exportCardToWebp(document.createElement('div'), 'FB-011')
    expect(toDataURL).toHaveBeenCalledWith('image/webp', CALIDAD_WEBP)
    expect(clicks).toEqual([{ download: 'FB-011.webp', href: 'data:image/webp;base64,BBB' }])
  })

  it('falla en vez de guardar un .webp falso si el navegador devuelve PNG', async () => {
    toCanvas.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,CCC' })
    await expect(exportCardToWebp(document.createElement('div'), 'FB-011')).rejects.toThrow(/WebP/)
    expect(clicks).toEqual([])
  })
})
