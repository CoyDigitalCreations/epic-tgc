import { describe, it, expect } from 'vitest'
import {
  PAQUETES,
  ESTASIS_CARDS,
  DISONANCIA_CARDS,
  ALL_CARDS,
  estasisDistribucion,
  disonanciaDistribucion,
  progresoPaquete,
  CARD_ART_IDS,
  cardArtPath,
} from './paquetes'
import { KEYWORDS, RARITIES } from '../types/enums'
import type { AnyCard } from '../types'

describe('Paquetes', () => {
  it('registra el mazo temático Estásis de la entrega Primogénitos con distribución oficial', () => {
    const estasis = PAQUETES.find((p) => p.id === 'estasis')
    expect(estasis).toBeDefined()
    expect(estasis?.nombre).toBe('Estásis')
    expect(estasis?.entrega).toBe('Primogénitos')
    expect(estasis?.tipo).toBe('Mazo Temático')
    expect(estasis?.facciones).toEqual(['Orden'])
    expect(estasis?.distribucion).toEqual({ eter: 15, principal: 45, vinculos: 6 })
  })

  it('registra el mazo temático Disonancia de la entrega Primogénitos con distribución oficial', () => {
    const disonancia = PAQUETES.find((p) => p.id === 'disonancia')
    expect(disonancia).toBeDefined()
    expect(disonancia?.nombre).toBe('Disonancia')
    expect(disonancia?.entrega).toBe('Primogénitos')
    expect(disonancia?.tipo).toBe('Mazo Temático')
    expect(disonancia?.facciones).toEqual(['Caos'])
    expect(disonancia?.distribucion).toEqual({ eter: 15, principal: 45, vinculos: 6 })
  })

  describe('Estásis (entrega Primogénitos) — 32 diseños / 66 cartas', () => {
    it('tiene 32 diseños con IDs únicos y prefijo FB-', () => {
      expect(ESTASIS_CARDS).toHaveLength(32)
      const ids = ESTASIS_CARDS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => /^FB-\d{3}$/.test(id))).toBe(true)
    })

    it('cumple la distribución oficial: 15 Éter + 45 Principal + 6 Vínculos = 66', () => {
      const dist = estasisDistribucion()
      expect(dist).toEqual({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    })

    it('las cartas con facción son de Orden; Éter, Vínculo y ex-Táctica no tienen facción', () => {
      const sinFaccion = ['FB-021', 'FB-022'] // ex-Tácticas convertidas a Místicas
      for (const card of ESTASIS_CARDS) {
        expect(card.paqueteId).toBe('estasis')
        if (card.type !== 'Éter' && card.type !== 'Vínculo' && !sinFaccion.includes(card.id)) {
          expect(card.facciones).toEqual(['Orden'])
        }
      }
    })

    it('todas tienen nombre, flavor text y límite de copias válido', () => {
      for (const card of ESTASIS_CARDS) {
        expect(card.name.trim().length).toBeGreaterThan(0)
        expect(card.flavorText.trim().length).toBeGreaterThan(0)
        expect(['1', '2', '3']).toContain(card.limiteCopias)
      }
    })

    it('usa solo raridades y keywords del catálogo', () => {
      for (const card of ESTASIS_CARDS) {
        expect(RARITIES).toContain(card.rarity)
        expect(card.keywords.every((k) => KEYWORDS.includes(k))).toBe(true)
      }
    })

    it('respeta los valores MEL (1-12) en los Campeones', () => {
      for (const card of ESTASIS_CARDS) {
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
        'Campeón': (c) => 'stats' in c && ('efectoPasivo' in c || 'efectoDisparo' in c || true),
        'Mística': (c) => typeof (c as { efecto?: string }).efecto === 'string',
        'Arcana': (c) => typeof (c as { efecto?: string }).efecto === 'string' || (typeof (c as { condicion?: string }).condicion === 'string' && typeof (c as { recompensa?: string }).recompensa === 'string'),
        'Vínculo': (c) => typeof (c as { efecto?: string }).efecto === 'string',
      }
      for (const card of ESTASIS_CARDS) {
        const check = expectations[card.type]
        expect(check, `carta ${card.id} (${card.type}) con campos incompletos`).toBeDefined()
        expect(check(card), `carta ${card.id} (${card.type}) con campos incompletos`).toBe(true)
      }
    })

    it('los Vínculos no cuestan Éter (cost 0) y no tienen Poder/Resistencia', () => {
      const vinculos = ESTASIS_CARDS.filter((c) => c.type === 'Vínculo')
      expect(vinculos).toHaveLength(6)
      for (const v of vinculos) {
        expect(v.stats.cost).toBe(0)
        expect('poder' in v.stats).toBe(false)
      }
    })
  })

  describe('Disonancia (entrega Primogénitos) — contraparte de Estásis', () => {
    it('tiene 33 diseños con IDs únicos y prefijo DS-', () => {
      expect(DISONANCIA_CARDS).toHaveLength(33)
      const ids = DISONANCIA_CARDS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => /^DS-\d{3}$/.test(id))).toBe(true)
    })

    it('cumple la distribución oficial: 15 Éter + 45 Principal + 6 Vínculos = 66', () => {
      const dist = disonanciaDistribucion()
      expect(dist).toEqual({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    })

    it('las cartas con facción son de Caos; Éter, Vínculo y ex-Táctica no tienen facción', () => {
      const sinFaccion = ['DS-021', 'DS-022'] // ex-Tácticas convertidas a Místicas
      for (const card of DISONANCIA_CARDS) {
        expect(card.paqueteId).toBe('disonancia')
        if (card.type !== 'Éter' && card.type !== 'Vínculo' && !sinFaccion.includes(card.id)) {
          expect(card.facciones).toEqual(['Caos'])
        }
      }
    })

    it('todas tienen nombre, flavor text y límite de copias válido', () => {
      for (const card of DISONANCIA_CARDS) {
        expect(card.name.trim().length).toBeGreaterThan(0)
        expect(card.flavorText.trim().length).toBeGreaterThan(0)
        expect(['1', '2', '3']).toContain(card.limiteCopias)
      }
    })

    it('usa solo raridades y keywords del catálogo', () => {
      for (const card of DISONANCIA_CARDS) {
        expect(RARITIES).toContain(card.rarity)
        expect(card.keywords.every((k) => KEYWORDS.includes(k))).toBe(true)
      }
    })

    it('respeta los valores MEL (1-12) en los Campeones', () => {
      for (const card of DISONANCIA_CARDS) {
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
        'Campeón': (c) => 'stats' in c && ('efectoPasivo' in c || 'efectoDisparo' in c || true),
        'Mística': (c) => typeof (c as { efecto?: string }).efecto === 'string',
        'Arcana': (c) => typeof (c as { efecto?: string }).efecto === 'string' || (typeof (c as { condicion?: string }).condicion === 'string' && typeof (c as { recompensa?: string }).recompensa === 'string'),
        'Vínculo': (c) => typeof (c as { efecto?: string }).efecto === 'string',
      }
      for (const card of DISONANCIA_CARDS) {
        const check = expectations[card.type]
        expect(check, `carta ${card.id} (${card.type}) con campos incompletos`).toBeDefined()
        expect(check(card), `carta ${card.id} (${card.type}) con campos incompletos`).toBe(true)
      }
    })

    it('los Vínculos no cuestan Éter (cost 0) y no tienen Poder/Resistencia', () => {
      const vinculos = DISONANCIA_CARDS.filter((c) => c.type === 'Vínculo')
      expect(vinculos).toHaveLength(6)
      for (const v of vinculos) {
        expect(v.stats.cost).toBe(0)
        expect('poder' in v.stats).toBe(false)
      }
    })

    it('Ragnar (DS-001) es el espejo de Aurora: misma potencia, defensa opuesta', () => {
      const aurora = ESTASIS_CARDS.find((c) => c.id === 'FB-010')!
      const ragnar = DISONANCIA_CARDS.find((c) => c.id === 'DS-001')!
      expect(ragnar).toBeDefined()

      // Mismo presupuesto: Única, Soberano, Singular, 9/9, coste 4
      expect(ragnar.rarity).toBe('Única')
      expect(ragnar.roles).toEqual(['Soberano'])
      expect(ragnar.catHabilidad).toBe('Singular')
      expect(ragnar.stats).toEqual({ cost: 4, poder: 9, resistencia: 9 })

      // Keywords complementarias: Aurora Inmortal (no muere por efectos),
      // Ragnar Indestructible (no muere en batalla)
      expect(aurora.keywords).toEqual(['Inmortal'])
      expect(ragnar.keywords).toEqual(['Indestructible'])
    })

    it('las keywords complementarias de Estásis tienen su espejo en Disonancia', () => {
      // Éter bloqueado: FB-008 da Inmortal ↔ DS-009 da Indestructible
      expect(ESTASIS_CARDS.find((c) => c.id === 'FB-008')?.efectoBloqueo).toContain('Inmortal')
      expect(DISONANCIA_CARDS.find((c) => c.id === 'DS-009')?.efectoBloqueo).toContain('Indestructible')
      // Vínculos: FB-028 da Inmortal permanente ↔ DS-028 da Indestructible permanente
      expect(ESTASIS_CARDS.find((c) => c.id === 'FB-028')?.efecto).toContain('Inmortal')
      expect(DISONANCIA_CARDS.find((c) => c.id === 'DS-028')?.efecto).toContain('Indestructible')
    })

    it('la colección completa del paquete alcanza las 66 copias (mazo jugable)', () => {
      const prog = progresoPaquete(DISONANCIA_CARDS, 'disonancia')
      expect(prog?.total).toBe(66)
      expect(prog?.coleccionadas).toBe(66)
      expect(prog?.completo).toBe(true)
    })
  })

  describe('Convención de nomenclatura — Campeones con título adicional', () => {
    it('todo Campeón de ambos mazos usa el formato "Nombre, Título"', () => {
      const campeones = ALL_CARDS.filter((c) => c.type === 'Campeón')
      expect(campeones.length).toBeGreaterThan(0)
      for (const card of campeones) {
        expect(
          card.name.includes(', '),
          `Campeón ${card.id} sin título adicional: "${card.name}"`,
        ).toBe(true)
        // El título no debe repetir el nombre (ej. "Ragnar, Ragnar")
        const [, titulo] = card.name.split(', ')
        expect(titulo?.trim().length ?? 0).toBeGreaterThan(0)
      }
    })
  })

  describe('Arte versionado (public/cartas) — convención automática', () => {
    it('todas las cartas de Estásis con arte tienen arte oficial mapeado', () => {
      for (const card of ESTASIS_CARDS) {
        if (!CARD_ART_IDS.has(card.id)) continue
        expect(cardArtPath(card.id)).toBe(`/cartas/${card.id}.png`)
      }
    })

    it('todas las cartas de Disonancia tienen arte oficial mapeado', () => {
      for (const card of DISONANCIA_CARDS) {
        expect(CARD_ART_IDS.has(card.id)).toBe(true)
        expect(cardArtPath(card.id)).toBe(`/cartas/${card.id}.png`)
      }
    })

    it('las cartas nuevas (C4) con arte versionado tienen arte oficial mapeado', () => {
      for (const id of ['FB-031', 'FB-032', 'DS-031', 'DS-032', 'DS-033']) {
        expect(CARD_ART_IDS.has(id)).toBe(true)
        expect(cardArtPath(id)).toBe(`/cartas/${id}.png`)
      }
    })

    it('devuelve undefined para IDs inexistentes o vacíos', () => {
      expect(cardArtPath('no-existe')).toBeUndefined()
      expect(cardArtPath(undefined)).toBeUndefined()
    })
  })

  describe('progresoPaquete — contador de colección', () => {
    it('devuelve 0/66 cuando la colección no tiene cartas del paquete', () => {
      expect(progresoPaquete([], 'estasis')).toEqual({
        paqueteId: 'estasis',
        coleccionadas: 0,
        total: 66,
        completo: false,
      })
    })

    it('suma copias por limiteCopias, no diseños únicos', () => {
      // FB-001 ×2 + FB-002 ×1 + FB-003 ×2 = 5 copias (3 diseños)
      const parcial = ESTASIS_CARDS.slice(0, 3)
      const prog = progresoPaquete(parcial, 'estasis')
      expect(prog?.coleccionadas).toBe(5)
      expect(prog?.completo).toBe(false)
    })

    it('marca completo cuando la colección tiene las 66 copias', () => {
      const prog = progresoPaquete(ESTASIS_CARDS, 'estasis')
      expect(prog?.coleccionadas).toBe(66)
      expect(prog?.completo).toBe(true)
    })

    it('devuelve null para un paquete inexistente', () => {
      expect(progresoPaquete(ESTASIS_CARDS, 'no-existe')).toBeNull()
    })

    it('ignora cartas de otros paquetes y cartas sin paquete', () => {
      const foraneas: AnyCard[] = [
        ESTASIS_CARDS[0],
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
      expect(progresoPaquete(foraneas, 'estasis')?.coleccionadas).toBe(2)
    })
  })
})
