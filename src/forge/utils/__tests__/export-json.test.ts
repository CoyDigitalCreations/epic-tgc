import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportCollectionSinArte, exportCollectionToJson, FUENTE_ARTE, FUENTE_EFECTOS, importCardDataFromJson } from '../export-json'
import type { AnyCard } from '../../../shared/types'

function archivoJson(contenido: unknown): File {
  return new File([JSON.stringify(contenido)], 'terminadas.json', { type: 'application/json' })
}

const cartaConArte: AnyCard = {
  id: 'carta-1',
  name: 'Aurora',
  type: 'Campeón',
  rarity: 'Épica',
  keywords: [],
  flavorText: 'Brilla en el alba.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { cost: 4, poder: 9, resistencia: 9 },
  facciones: ['Orden'],
  imageUrl: 'data:image/png;base64,AAAA...',
  hasImage: true,
}

const cartaSinArte: AnyCard = {
  id: 'carta-2',
  name: 'Heraldo del Alba',
  type: 'Mística',
  rarity: 'Común',
  keywords: [],
  flavorText: 'Anuncia el primer rayo.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { cost: 1 },
}

describe('importCardDataFromJson (cartas terminadas: datos sin arte)', () => {
  it('extrae TODO de la carta menos el arte embebido', async () => {
    const cartas = await importCardDataFromJson(archivoJson([cartaConArte]))

    expect(cartas).toHaveLength(1)
    const c = cartas[0]
    // El arte se descarta: ni data URL inline ni flag hasImage
    expect(c.imageUrl).toBeUndefined()
    expect(c.hasImage).toBeUndefined()
    // El resto de la carta queda intacto
    expect(c.name).toBe('Aurora')
    expect(c.type).toBe('Campeón')
    expect(c.rarity).toBe('Épica')
    expect(c.stats).toEqual({ cost: 4, poder: 9, resistencia: 9 })
    expect(c.facciones).toEqual(['Orden'])
    expect(c.flavorText).toBe('Brilla en el alba.')
  })

  it('las cartas que ya venían sin arte quedan igual (sin imageUrl ni hasImage)', async () => {
    const cartas = await importCardDataFromJson(archivoJson([cartaSinArte]))

    expect(cartas).toHaveLength(1)
    expect(cartas[0].imageUrl).toBeUndefined()
    expect(cartas[0].hasImage).toBeUndefined()
    expect(cartas[0].name).toBe('Heraldo del Alba')
    expect(cartas[0].stats).toEqual({ cost: 1 })
  })

  it('descarta el arte de todas las cartas del archivo', async () => {
    const cartas = await importCardDataFromJson(archivoJson([cartaConArte, cartaSinArte]))

    expect(cartas).toHaveLength(2)
    for (const c of cartas) {
      expect(c.imageUrl).toBeUndefined()
      expect(c.hasImage).toBeUndefined()
    }
  })

  it('rechaza un JSON inválido', async () => {
    const malo = new File(['esto no es json {'], 'malo.json', { type: 'application/json' })
    await expect(importCardDataFromJson(malo)).rejects.toThrow('Archivo JSON inválido')
  })
})

describe('exportar la fuente de verdad (FuenteEfectos.json / FuenteArte.json)', () => {
  /** Captura las descargas: nombre del archivo y contenido del Blob. */
  function capturarDescargas(): { nombres: string[]; blobs: Blob[] } {
    const nombres: string[] = []
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blobs.push(b as Blob)
      return 'blob:prueba'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nombres.push(this.download)
    })
    return { nombres, blobs }
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('FuenteEfectos.json: las cartas SIN arte, con el nombre fijo', async () => {
    const { nombres, blobs } = capturarDescargas()
    exportCollectionSinArte([cartaConArte, cartaSinArte], FUENTE_EFECTOS)

    expect(nombres).toEqual(['FuenteEfectos.json'])
    const exportadas = JSON.parse(await blobs[0].text()) as AnyCard[]
    expect(exportadas.map((c) => c.id)).toEqual(['carta-1', 'carta-2'])
    for (const c of exportadas) {
      expect(c.imageUrl).toBeUndefined()
      expect(c.hasImage).toBeUndefined()
    }
  })

  it('FuenteArte.json: la misma exportación CON arte, con el nombre fijo', async () => {
    const { nombres, blobs } = capturarDescargas()
    await exportCollectionToJson([cartaSinArte], FUENTE_ARTE)

    expect(nombres).toEqual(['FuenteArte.json'])
    const exportadas = JSON.parse(await blobs[0].text()) as AnyCard[]
    expect(exportadas.map((c) => c.id)).toEqual(['carta-2'])
  })
})
