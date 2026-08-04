import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CARD_TYPES,
  RARITIES,
  KEYWORDS,
  FACCIONES,
  FACCION_COLORS,
  FACCION_IMAGES,
} from './enums'

describe('CARD_TYPES', () => {
  it('contiene los 7 tipos de carta', () => {
    expect(CARD_TYPES).toHaveLength(7)
    expect(CARD_TYPES).toContain('Éter')
    expect(CARD_TYPES).toContain('Campeón')
    expect(CARD_TYPES).toContain('Mística')
    expect(CARD_TYPES).toContain('Táctica')
    expect(CARD_TYPES).toContain('Arcana')
    expect(CARD_TYPES).toContain('Combate')
    expect(CARD_TYPES).toContain('Vínculo')
  })
})

describe('RARITIES', () => {
  it('contiene 6 rarezas en orden ascendente', () => {
    expect(RARITIES).toHaveLength(6)
    expect(RARITIES[0]).toBe('Común')
    expect(RARITIES[RARITIES.length - 1]).toBe('Única')
  })
})

describe('KEYWORDS', () => {
  it('contiene las 10 keywords oficiales v2.0', () => {
    expect(KEYWORDS).toHaveLength(10)
    expect(KEYWORDS).toContain('Carga')
    expect(KEYWORDS).toContain('Vigor')
    expect(KEYWORDS).toContain('Inmortal')
    expect(KEYWORDS).toContain('Indestructible')
    expect(KEYWORDS).toContain('Recarga')
    expect(KEYWORDS).toContain('Resonancia')
    expect(KEYWORDS).toContain('Transmutar')
    expect(KEYWORDS).toContain('Frenesí')
    expect(KEYWORDS).toContain('Protector')
    expect(KEYWORDS).toContain('Fracturar')
  })

  it('no contiene keywords de la v1.0', () => {
    expect(KEYWORDS).not.toContain('Guardián')
    expect(KEYWORDS).not.toContain('Golpe Letal')
    expect(KEYWORDS).not.toContain('Canalizar')
  })
})

describe('FACCIONES', () => {
  it('contiene las 8 facciones v2.0', () => {
    expect(FACCIONES).toHaveLength(8)
    expect(FACCIONES).toContain('Orden')
    expect(FACCIONES).toContain('Caos')
    expect(FACCIONES).toContain('Creación')
    expect(FACCIONES).toContain('Destrucción')
    expect(FACCIONES).toContain('Ley')
    expect(FACCIONES).toContain('Purga')
    expect(FACCIONES).toContain('Entropía')
    expect(FACCIONES).toContain('Mutación')
  })

  it('asigna el color alineado con el medallón de cada facción', () => {
    expect(FACCION_COLORS.Orden).toBe('#e5e7eb')
    expect(FACCION_COLORS.Caos).toBe('#3b82f6')
    expect(FACCION_COLORS.Creación).toBe('#22c55e')
    expect(FACCION_COLORS.Destrucción).toBe('#ef4444')
    expect(FACCION_COLORS.Ley).toBe('#eab308')
    expect(FACCION_COLORS.Purga).toBe('#f97316')
    expect(FACCION_COLORS.Entropía).toBe('#a855f7')
    expect(FACCION_COLORS.Mutación).toBe('#22d3ee')
  })

  it('mapea cada facción a un medallón existente en public/', () => {
    for (const faccion of FACCIONES) {
      const file = FACCION_IMAGES[faccion]
      expect(file).toMatch(/^\/facciones_[a-z]+\.png$/)
      expect(
        existsSync(resolve(process.cwd(), 'public', file.replace(/^\//, ''))),
      ).toBe(true)
    }
  })
})
