import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ESTASIS_CARDS, DISONANCIA_CARDS, ALL_CARDS } from './paquetes'
import type { AnyCard } from '../types'

/**
 * Integridad seeds ↔ código.
 * Si agregás cartas a src/data/paquetes.ts, corré `npm run seed`
 * para regenerar seed/*.json. Estos tests avisan si se desincronizan.
 */
const readSeed = (file: string): AnyCard[] =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'seed', file), 'utf8'),
  ) as AnyCard[]

describe('Seeds JSON (seed/)', () => {
  it('estasis.json existe y coincide 1:1 con ESTASIS_CARDS', () => {
    const seed = readSeed('estasis.json')
    expect(seed).toHaveLength(ESTASIS_CARDS.length)
    expect(seed.map((c) => c.id)).toEqual(ESTASIS_CARDS.map((c) => c.id))
  })

  it('disonancia.json existe y coincide 1:1 con DISONANCIA_CARDS', () => {
    const seed = readSeed('disonancia.json')
    expect(seed).toHaveLength(DISONANCIA_CARDS.length)
    expect(seed.map((c) => c.id)).toEqual(DISONANCIA_CARDS.map((c) => c.id))
  })

  it('coleccion-completa.json coincide 1:1 con ALL_CARDS', () => {
    const seed = readSeed('coleccion-completa.json')
    expect(seed.map((c) => c.id)).toEqual(ALL_CARDS.map((c) => c.id))
  })

  it('el seed es importable por la app (campos mínimos por carta)', () => {
    const seed = readSeed('estasis.json')
    for (const card of seed) {
      expect(card.id).toBeTruthy()
      expect(card.name).toBeTruthy()
      expect(card.type).toBeTruthy()
      expect(card.stats).toBeDefined()
    }
  })

  it('no deja cartas sueltas: todas las del seed pertenecen a un paquete registrado', () => {
    const seed = readSeed('coleccion-completa.json')
    const paqueteIds = new Set(['estasis', 'disonancia'])
    for (const card of seed) {
      expect(card.paqueteId).toBeTruthy()
      expect(paqueteIds.has(card.paqueteId!)).toBe(true)
    }
  })
})
