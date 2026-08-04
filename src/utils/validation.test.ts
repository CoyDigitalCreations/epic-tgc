import { describe, it, expect } from 'vitest'
import { validateCard, isValidCardType, isValidRarity, isValidKeywords } from './validation'

describe('isValidCardType', () => {
  it('returns true for valid types', () => {
    expect(isValidCardType('Campeón')).toBe(true)
    expect(isValidCardType('Éter')).toBe(true)
  })

  it('returns false for invalid types', () => {
    expect(isValidCardType('Mago')).toBe(false)
    expect(isValidCardType('')).toBe(false)
  })
})

describe('isValidRarity', () => {
  it('returns true for valid rarities', () => {
    expect(isValidRarity('Legendaria')).toBe(true)
    expect(isValidRarity('Común')).toBe(true)
  })

  it('returns false for invalid rarities', () => {
    expect(isValidRarity('Ultra Rara')).toBe(false)
  })
})

describe('isValidKeywords', () => {
  it('returns true for valid keywords', () => {
    expect(isValidKeywords(['Carga', 'Vigor'])).toBe(true)
  })

  it('returns false if any keyword is invalid', () => {
    expect(isValidKeywords(['Carga', 'Invencible'])).toBe(false)
  })

  it('returns true for empty array', () => {
    expect(isValidKeywords([])).toBe(true)
  })
})

describe('validateCard', () => {
  it('returns error for missing name on Campeón', () => {
    const errors = validateCard({ type: 'Campeón', name: '' })
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('returns error for negative cost', () => {
    const errors = validateCard({ type: 'Campeón', name: 'Test', stats: { cost: -1, poder: 100, resistencia: 100 } })
    expect(errors.some((e) => e.field === 'cost')).toBe(true)
  })

  it('returns error for invalid card type', () => {
    const errors = validateCard({ type: 'Invalido' as never })
    expect(errors.some((e) => e.field === 'type')).toBe(true)
  })

  it('passes for a valid Campeón with minimum fields', () => {
    const errors = validateCard({
      type: 'Campeón',
      name: 'Aurelion',
      facciones: ['Orden'],
      esencia: 'Mago',
      rol: 'Asalto',
      catHabilidad: 'Efecto',
      stats: { cost: 3, poder: 1000, resistencia: 800 },
    })
    expect(errors.filter((e) => e.field !== 'name')).toHaveLength(0)
  })

  it('returns error for poder exceeding max', () => {
    const errors = validateCard({
      type: 'Campeón',
      name: 'Test',
      stats: { cost: 1, poder: 99999, resistencia: 1 },
    })
    expect(errors.some((e) => e.field === 'poder')).toBe(true)
  })

  it('validates Arcana fields', () => {
    const errors = validateCard({ type: 'Arcana', condicion: '' })
    expect(errors.some((e) => e.field === 'condicion')).toBe(true)
  })
})
