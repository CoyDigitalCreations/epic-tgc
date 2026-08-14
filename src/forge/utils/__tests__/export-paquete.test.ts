import { describe, expect, it } from 'vitest'
import { serializePaquete, importPaqueteFromJson } from '../export-paquete'
import type { AnyCard, Paquete } from '../../../shared/types'

function archivoJson(contenido: unknown): File {
  return new File([JSON.stringify(contenido)], 'paquete.paquete.json', {
    type: 'application/json',
  })
}

const paquete: Paquete = {
  id: 'mutantes',
  nombre: 'Mutantes',
  tipo: 'Mazo Temático',
  color: '#6b7280',
  facciones: [],
  entrega: 'Personalizado',
  distribucion: { eter: 15, principal: 45, vinculos: 6 },
  lore: 'Los mutantes del yermo.',
}

const cartaDelPaquete: AnyCard = {
  id: 'M-001',
  name: 'Caminante',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { cost: 2, poder: 4, resistencia: 3 },
  paqueteId: 'mutantes',
}

const cartaDeOtroPaquete: AnyCard = {
  ...cartaDelPaquete,
  id: 'FB-010',
  name: 'Aurora',
  paqueteId: 'estasis',
}

const cartaSinPaquete: AnyCard = {
  ...cartaDelPaquete,
  id: 'suelta-1',
  name: 'Sin set',
  paqueteId: undefined,
}

describe('export-paquete — serialización', () => {
  it('serializePaquete filtra SOLO las cartas del paquete', async () => {
    const data = await serializePaquete(paquete, [
      cartaDelPaquete,
      cartaDeOtroPaquete,
      cartaSinPaquete,
    ])
    expect(data.paquete).toEqual(paquete)
    expect(data.cards).toHaveLength(1)
    expect(data.cards[0].id).toBe('M-001')
  })
})

describe('importPaqueteFromJson', () => {
  it('parsea un { paquete, cards } válido', async () => {
    const data = await importPaqueteFromJson(
      archivoJson({ paquete, cards: [cartaDelPaquete] }),
    )
    expect(data.paquete.id).toBe('mutantes')
    expect(data.cards).toHaveLength(1)
    expect(data.cards[0].name).toBe('Caminante')
  })

  it('rechaza JSON sin paquete.id', async () => {
    const malo = { paquete: { nombre: 'X' }, cards: [] }
    await expect(importPaqueteFromJson(archivoJson(malo))).rejects.toThrow(
      /inválido/i,
    )
  })

  it('rechaza JSON sin cards array', async () => {
    const malo = { paquete, cards: 'no-es-array' }
    await expect(importPaqueteFromJson(archivoJson(malo))).rejects.toThrow(
      /inválido/i,
    )
  })

  it('rechaza un JSON no parseable', async () => {
    const malo = new File(['esto no es json {'], 'malo.json', {
      type: 'application/json',
    })
    await expect(importPaqueteFromJson(malo)).rejects.toThrow(
      'Archivo JSON inválido',
    )
  })

  it('round-trip: serialize → file → import produce el MISMO { paquete, cards }', async () => {
    const data = await serializePaquete(paquete, [
      cartaDelPaquete,
      cartaDeOtroPaquete,
    ])
    const importada = await importPaqueteFromJson(archivoJson(data))
    expect(importada).toEqual(data)
  })
})
