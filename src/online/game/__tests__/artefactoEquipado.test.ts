// @vitest-environment node
/**
 * Un ARTEFACTO que da ATQ al «Campeón equipado» (DS-021 «El Nudo Aprieta» +3, FB-024 «Filo del Éter Primigenio» +2) dura
 * MIENTRAS ESTÁ EQUIPADO. Antes el bono se aplicaba una sola vez al resolverse y expiraba con el turno (el texto no pone
 * duración): el Campeón volvía a su ATQ con el Artefacto todavía equipado. Ahora es un aura derivada (como FB-020).
 * Cartas REALES.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { buildReporte } from '../coverageMap'
import { statsDe, purgarEfectosTemporales } from '../efectos'
import { getCardMeta } from '../cards'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { GameState } from '../types'
import { PR, aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, conMistica, crearCtx, escenaVacia } from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

const base = (s: GameState) => statsDe(s, 'c').poder
function escena(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6); conCampeon(s, 'A', 'c', PR.PEON, 0)
  return s
}

describe('DS-021 «El Nudo Aprieta» (Mística Artefacto, +3 ATQ al equipado)', () => {
  it('jugada de verdad: al equiparla sube y SIGUE subido cuando termina el turno', () => {
    const s0 = escena(); conEteres(s0, 'A', 6); conMano(s0, 'A', 'art', 'DS-021')
    const ctx = crearCtx()
    const poderBase = base(s0)
    let s = aplicar(s0, getValidActions(s0, 'A').find((a) => a.type === 'jugar_mistica' && a.cardInstanceId === 'art')!, ctx)
    for (let i = 0; i < 4 && (s.cadena || s.objetivosPendientes?.length); i++) {
      const a = getValidActions(s, s.cadena?.prioridad ?? 'A').find((x) => x.type === 'elegir_objetivo' || x.type === 'pasar_prioridad')
      if (!a) break
      s = aplicar(s, a, ctx)
    }
    const eq = getValidActions(s, 'A').find((x) => x.type === 'equipar_artefacto')
    if (eq) s = aplicar(s, eq, ctx)
    expect(s.instances.art.equipadoA).toBe('c')
    expect(base(s)).toBe(poderBase + 3)
    // termina el turno de A (Forja → Choque → Ocaso) y empieza el de B
    for (let i = 0; i < 3; i++) s = aplicar(s, getValidActions(s, s.turno).find((x) => x.type === 'pasar_turno')!, ctx)
    expect(s.turno).toBe('B')
    expect(base(s)).toBe(poderBase + 3) // el Artefacto sigue equipado → el bono sigue
  })
  it('no es un modificador de un solo uso: no hay nada que purgar en el Ocaso', () => {
    const s = escena(); conMistica(s, 'A', 'art', 'DS-021', 0, { equipadoA: 'c' })
    const antes = base(s)
    purgarEfectosTemporales(s, 'ocaso')
    expect(base(s)).toBe(antes)
    expect(s.instances.c.modificadores ?? []).toEqual([])
  })
  it('si el Artefacto sale del campo, el bono se va con él', () => {
    const s = escena(); conMistica(s, 'A', 'art', 'DS-021', 0, { equipadoA: 'c' })
    const conBono = base(s)
    s.players.A.campo.misticasTacticas[0] = null
    expect(base(s)).toBe(conBono - 3)
  })
  it('dos Artefactos suman', () => {
    const s = escena(); conMistica(s, 'A', 'a1', 'DS-021', 0, { equipadoA: 'c' }); conMistica(s, 'A', 'a2', 'DS-021', 1, { equipadoA: 'c' })
    expect(base(s)).toBe(2 + 3 + 3)
  })
  it('solo beneficia al Campeón al que está equipado', () => {
    const s = escena(); conCampeon(s, 'A', 'otro', PR.PEON, 1); conMistica(s, 'A', 'art', 'DS-021', 0, { equipadoA: 'c' })
    expect(statsDe(s, 'otro').poder).toBe(2)
  })
})

describe('FB-024 «Filo del Éter Primigenio» (Arcana Artefacto, +2 ATQ al equipado)', () => {
  it('BOCA ABAJO no da nada (una Arcana sin revelar no tiene efectos vigentes)', () => {
    const s = escena(); conArcana(s, 'A', 'filo', 'FB-024', 0, { equipadoA: 'c' })
    expect(base(s)).toBe(2)
  })
  it('revelada y equipada, +2 mientras siga equipada', () => {
    const s = escena(); conArcana(s, 'A', 'filo', 'FB-024', 0, { equipadoA: 'c', bocaArriba: true })
    expect(base(s)).toBe(4)
    purgarEfectosTemporales(s, 'ocaso')
    expect(base(s)).toBe(4)
  })
})

describe('el mapa de cobertura', () => {
  it('los Artefactos de ATQ se clasifican como aura derivada', () => {
    for (const id of ['DS-021', 'FB-024']) {
      const reporte = buildReporte([getCardMeta(id) as AnyCard])
      // (FB-024 tiene además un ítem por su `condicion` de Arcana, que sí es una activación)
      expect(reporte.items.filter((i) => i.origen === 'efectos').map((i) => i.estado), id).toEqual(['OK_AURA_JSON'])
    }
  })
})
