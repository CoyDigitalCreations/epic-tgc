import { describe, expect, it } from 'vitest'
import { importCardDataFromJson } from '../export-json'
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
