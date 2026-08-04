import { describe, it, expect } from 'vitest'
import {
  PAQUETES,
  FIRSTBORNE_CARDS,
  firstborneDistribucion,
  progresoPaquete,
} from './paquetes'
import { KEYWORDS, RARITIES } from '../types/enums'
import type { AnyCard } from '../types'

describe('Paquetes', () => {
  it('registra el mazo temático Firstborne con distribución oficial', () => {
    const firstborne = PAQUETES.find((p) => p.id === 'firstborne')
    expect(firstborne).toBeDefined()
    expect(firstborne?.tipo).toBe('Mazo Temático')
    expect(firstborne?.facciones).toEqual(['Orden'])
    expect(firstborne?.distribucion).toEqual({ eter: 15, principal: 40, vinculos: 6 })
  })

  describe('Firstborne — 30 diseños / 61 cartas', () => {
    it('tiene 30 diseños con IDs únicos y prefijo FB-', () => {
      expect(FIRSTBORNE_CARDS).toHaveLength(30)
      const ids = FIRSTBORNE_CARDS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => /^FB-\d{3}$/.test(id))).toBe(true)
    })

    it('cumple la distribución oficial: 15 Éter + 40 Principal + 6 Vínculos = 61', () => {
      const dist = firstborneDistribucion()
      expect(dist).toEqual({ eter: 15, principal: 40, vinculos: 6, total: 61 })
    })

    it('todas las cartas pertenecen al paquete y a la facción Orden', () => {
      for (const card of FIRSTBORNE_CARDS) {
        expect(card.paqueteId).toBe('firstborne')
        expect(card.facciones).toEqual(['Orden'])
      }
    })

    it('todas tienen nombre, flavor text y límite de copias válido', () => {
      for (const card of FIRSTBORNE_CARDS) {
        expect(card.name.trim().length).toBeGreaterThan(0)
        expect(card.flavorText.trim().length).toBeGreaterThan(0)
        expect(['1', '2', '3']).toContain(card.limiteCopias)
      }
    })

    it('usa solo raridades y keywords del catálogo', () => {
      for (const card of FIRSTBORNE_CARDS) {
        expect(RARITIES).toContain(card.rarity)
        expect(card.keywords.every((k) => KEYWORDS.includes(k))).toBe(true)
      }
    })

    it('respeta los valores MEL (1-12) en los Campeones', () => {
      for (const card of FIRSTBORNE_CARDS) {
        if (card.type !== 'Campeón') continue
        const { poder, resistencia } = card.stats
        expect(poder).toBeGreaterThanOrEqual(1)
        expect(poder).toBeLessThanOrEqual(12)
        expect(resistencia).toBeGreaterThanOrEqual(1)
        expect(resistencia).toBeLessThanOrEqual(12)
      }
    })

    it('cada tipo de carta tiene los campos de juego que le corresponden', () => {
      const expectations: Record<string, (c: AnyCard) => boolean> = {
        'Éter': (c) => 'efectoReserva' in c || 'efectoPago' in c || 'efectoBloqueo' in c,
        'Campeón': (c) => 'stats' in c && ('efectoPasivo' in c || 'efectoActivo' in c || true),
        'Mística': (c) => typeof (c as { efecto?: string }).efecto === 'string',
        'Táctica': (c) => typeof (c as { descripcion?: string }).descripcion === 'string',
        'Arcana': (c) =>
          typeof (c as { condicion?: string }).condicion === 'string' &&
          typeof (c as { recompensa?: string }).recompensa === 'string',
        'Combate': (c) => typeof (c as { descripcion?: string }).descripcion === 'string',
        'Vínculo': (c) => typeof (c as { efecto?: string }).efecto === 'string',
      }
      for (const card of FIRSTBORNE_CARDS) {
        const check = expectations[card.type]
        expect(check, `carta ${card.id} (${card.type}) con campos incompletos`).toBeDefined()
        expect(check(card), `carta ${card.id} (${card.type}) con campos incompletos`).toBe(true)
      }
    })

    it('los Vínculos no cuestan Éter (cost 0) y no tienen Poder/Resistencia', () => {
      const vinculos = FIRSTBORNE_CARDS.filter((c) => c.type === 'Vínculo')
      expect(vinculos).toHaveLength(6)
      for (const v of vinculos) {
        expect(v.stats.cost).toBe(0)
        expect('poder' in v.stats).toBe(false)
      }
    })
  })

  describe('progresoPaquete — contador de colección', () => {
    it('devuelve 0/61 cuando la colección no tiene cartas del paquete', () => {
      expect(progresoPaquete([], 'firstborne')).toEqual({
        paqueteId: 'firstborne',
        coleccionadas: 0,
        total: 61,
        completo: false,
      })
    })

    it('suma copias por limiteCopias, no diseños únicos', () => {
      // FB-001 ×2 + FB-002 ×1 + FB-003 ×2 = 5 copias (3 diseños)
      const parcial = FIRSTBORNE_CARDS.slice(0, 3)
      const prog = progresoPaquete(parcial, 'firstborne')
      expect(prog?.coleccionadas).toBe(5)
      expect(prog?.completo).toBe(false)
    })

    it('marca completo cuando la colección tiene las 61 copias', () => {
      const prog = progresoPaquete(FIRSTBORNE_CARDS, 'firstborne')
      expect(prog?.coleccionadas).toBe(61)
      expect(prog?.completo).toBe(true)
    })

    it('devuelve null para un paquete inexistente', () => {
      expect(progresoPaquete(FIRSTBORNE_CARDS, 'no-existe')).toBeNull()
    })

    it('ignora cartas de otros paquetes y cartas sin paquete', () => {
      const foraneas: AnyCard[] = [
        FIRSTBORNE_CARDS[0],
        {
          id: 'manual-1',
          name: 'Carta Manual',
          type: 'Campeón',
          rarity: 'Común',
          keywords: [],
          flavorText: '',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          stats: { cost: 2, poder: 5, resistencia: 5 },
          limiteCopias: '3',
        } as AnyCard,
      ]
      // Solo cuenta la FB-001 (×2); la manual no tiene paqueteId
      expect(progresoPaquete(foraneas, 'firstborne')?.coleccionadas).toBe(2)
    })
  })
})
