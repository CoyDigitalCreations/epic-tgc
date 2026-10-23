import { describe, expect, it } from 'vitest'
import { RARITIES } from '../../shared/types'
import { getCardMeta } from '../game'
import { MAZOS } from '../mazos'
import { CARTAS_PORTADA, cartasDePortada, resumenMazo } from '../resumenMazo'

describe('resumenMazo', () => {
  it('un set oficial son 66 cartas: 15 Éter + 45 Principal + 6 Vínculos', () => {
    for (const mazo of MAZOS) {
      const r = resumenMazo(mazo.cardIds)
      expect(r.eter).toBe(15)
      expect(r.principal).toBe(45)
      expect(r.vinculos).toBe(6)
    }
  })

  it('el Principal se desglosa por tipo y suma 45 (Campeón + Mística + Arcana)', () => {
    for (const mazo of MAZOS) {
      const r = resumenMazo(mazo.cardIds)
      expect(r.campeones + r.misticas + r.arcanas).toBe(r.principal)
      expect(r.campeones).toBeGreaterThan(0)
    }
  })

  it('un mazo vacío no rompe y da todo en cero', () => {
    expect(resumenMazo([])).toEqual({ eter: 0, principal: 0, vinculos: 0, campeones: 0, misticas: 0, arcanas: 0 })
  })
})

describe('cartasDePortada', () => {
  it('devuelve hasta CARTAS_PORTADA cartas ÚNICAS aunque el mazo repita copias', () => {
    for (const mazo of MAZOS) {
      const portada = cartasDePortada(mazo.cardIds)
      expect(portada.length).toBeLessThanOrEqual(CARTAS_PORTADA)
      expect(new Set(portada).size).toBe(portada.length)
    }
  })

  it('prioriza Campeones, y entre ellos los de mayor rareza', () => {
    for (const mazo of MAZOS) {
      const portada = cartasDePortada(mazo.cardIds)
      const metas = portada.map((id) => getCardMeta(id)!)
      expect(metas.every((m) => m.type === 'Campeón')).toBe(true)
      const rarezas = metas.map((m) => RARITIES.indexOf(m.rarity))
      expect(rarezas).toEqual([...rarezas].sort((a, b) => b - a))
    }
  })

  it('cada carta de la portada pertenece al mazo', () => {
    const portada = cartasDePortada(MAZOS[0].cardIds)
    for (const id of portada) expect(MAZOS[0].cardIds).toContain(id)
  })

  it('con pocas cartas devuelve las que hay; con ids desconocidos no rompe y los manda al final', () => {
    const conocida = MAZOS[0].cardIds[0]!
    expect(cartasDePortada([conocida])).toEqual([conocida])
    expect(cartasDePortada(['ZZ-999', conocida]).at(-1)).toBe('ZZ-999')
    expect(cartasDePortada([])).toEqual([])
  })

  it('respeta la cantidad pedida', () => {
    expect(cartasDePortada(MAZOS[0].cardIds, 2)).toHaveLength(2)
  })
})
