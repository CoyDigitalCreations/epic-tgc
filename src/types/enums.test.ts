import { describe, it, expect } from 'vitest'
import { CARD_TYPES, RARITIES, KEYWORDS, ELEMENTS } from './enums'

describe('CARD_TYPES', () => {
  it('contiene los 6 tipos de carta', () => {
    expect(CARD_TYPES).toHaveLength(6)
    expect(CARD_TYPES).toContain('Campeón')
    expect(CARD_TYPES).toContain('Mística')
    expect(CARD_TYPES).toContain('Táctica')
    expect(CARD_TYPES).toContain('Arcana')
    expect(CARD_TYPES).toContain('Combate')
    expect(CARD_TYPES).toContain('Éter')
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
  it('contiene todas las keywords del Éter Engine', () => {
    expect(KEYWORDS).toContain('Guardián')
    expect(KEYWORDS).toContain('Protector')
    expect(KEYWORDS).toContain('Carga')
    expect(KEYWORDS).toContain('Inmortal')
    expect(KEYWORDS).toContain('Golpe Letal')
  })

  it('tiene 12 keywords definidas', () => {
    expect(KEYWORDS).toHaveLength(12)
  })
})

describe('ELEMENTS', () => {
  it('contiene 6 elementos', () => {
    expect(ELEMENTS).toHaveLength(6)
    expect(ELEMENTS).toContain('Fuego')
    expect(ELEMENTS).toContain('Tinieblas')
  })
})
