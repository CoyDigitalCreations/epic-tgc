// @vitest-environment node
/**
 * Filtros de ATQ/RES del objetivo: `atqMax`/`resMax` miran el valor ORIGINAL (impreso) y
 * `atqActualMax`/`resActualMax` el valor ACTUAL (con buffs, debuffs y auras). Cartas SINTÉTICAS.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { resolveTargets } from '../targetResolver'
import type { FiltroObjetivo } from '../../../shared/types/cards'
import type { GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, poder: number, resistencia: number) => ({
  ...base, id, name: id, type: 'Campeón' as const, keywords: [], efectos: [],
  facciones: ['Orden' as const], stats: { cost: 1, poder, resistencia },
}) as never

beforeAll(() => {
  registrarCartas([campeon('T-3', 3, 3), campeon('T-5', 5, 5)])
})

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
/** B controla `bajo` (3/3 impreso) y `alto` (5/5 impreso). */
function estado(): GameState {
  const s: GameState = { version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} }
  s.instances.bajo = { cardInstanceId: 'bajo', cardId: 'T-3', owner: 'B' }
  s.instances.alto = { cardInstanceId: 'alto', cardId: 'T-5', owner: 'B' }
  s.players.B.campo.campeones[0] = 'bajo'
  s.players.B.campo.campeones[1] = 'alto'
  return s
}
const objetivos = (s: GameState, filtros: FiltroObjetivo) =>
  resolveTargets(s, { tipo: 'campeon', controlador: 'rival', zona: 'campo', filtros }, 'A')

describe('filtros de ATQ/RES: original vs actual', () => {
  it('sin modificadores, original y actual coinciden', () => {
    const s = estado()
    expect(objetivos(s, { resMax: 3 })).toEqual(['bajo'])
    expect(objetivos(s, { resActualMax: 3 })).toEqual(['bajo'])
    expect(objetivos(s, { atqMax: 3 })).toEqual(['bajo'])
    expect(objetivos(s, { atqActualMax: 3 })).toEqual(['bajo'])
  })
  it('un buff sube el valor ACTUAL pero no el ORIGINAL', () => {
    const s = estado()
    s.instances.bajo.modificadores = [{ stat: 'resistencia', valor: 3, expira: 'ocaso' } as never, { stat: 'poder', valor: 3, expira: 'ocaso' } as never]
    expect(objetivos(s, { resMax: 3 })).toEqual(['bajo']) // sigue siendo 3 impreso
    expect(objetivos(s, { resActualMax: 3 })).toEqual([]) // ahora vale 6
    expect(objetivos(s, { atqMax: 3 })).toEqual(['bajo'])
    expect(objetivos(s, { atqActualMax: 3 })).toEqual([])
  })
  it('un debuff baja el valor ACTUAL pero no el ORIGINAL', () => {
    const s = estado()
    s.instances.alto.modificadores = [{ stat: 'resistencia', valor: -3, expira: 'ocaso' } as never, { stat: 'poder', valor: -3, expira: 'ocaso' } as never]
    expect(objetivos(s, { resMax: 3 })).toEqual(['bajo']) // impreso 5: no entra
    expect(objetivos(s, { resActualMax: 3 }).sort()).toEqual(['alto', 'bajo']) // vale 2: entra
    expect(objetivos(s, { atqMax: 3 })).toEqual(['bajo'])
    expect(objetivos(s, { atqActualMax: 3 }).sort()).toEqual(['alto', 'bajo'])
  })
  it('los filtros Min distinguen original de actual igual que los Max', () => {
    const s = estado()
    s.instances.bajo.modificadores = [{ stat: 'resistencia', valor: 4, expira: 'ocaso' } as never, { stat: 'poder', valor: 4, expira: 'ocaso' } as never]
    expect(objetivos(s, { resMin: 5 })).toEqual(['alto']) // bajo imprime 3
    expect(objetivos(s, { resActualMin: 5 }).sort()).toEqual(['alto', 'bajo']) // bajo vale 7
    expect(objetivos(s, { atqMin: 5 })).toEqual(['alto'])
    expect(objetivos(s, { atqActualMin: 5 }).sort()).toEqual(['alto', 'bajo'])
    expect(objetivos(s, { resMin: 4, resMax: 5 })).toEqual(['alto']) // rango sobre el impreso
  })
  it('se pueden combinar: original ≤ N y actual ≤ M', () => {
    const s = estado()
    s.instances.bajo.modificadores = [{ stat: 'resistencia', valor: 2, expira: 'ocaso' } as never]
    expect(objetivos(s, { resMax: 3, resActualMax: 4 })).toEqual([]) // impreso 3 sí, actual 5 no
    expect(objetivos(s, { resMax: 3, resActualMax: 5 })).toEqual(['bajo'])
  })
})

describe('seleccionar (ranking): original vs actual', () => {
  const rank = (s: GameState, orden: 'mayor' | 'menor', stat: 'poder' | 'resistencia', valor?: 'original' | 'actual') =>
    objetivos(s, { seleccionar: { stat, orden, ...(valor ? { valor } : {}) } })

  it('sin modificadores coinciden; por defecto es el valor original', () => {
    const s = estado()
    expect(rank(s, 'mayor', 'resistencia')).toEqual(['alto'])
    expect(rank(s, 'mayor', 'resistencia', 'actual')).toEqual(['alto'])
    expect(rank(s, 'menor', 'poder')).toEqual(['bajo'])
  })
  it('un buff cambia el ranking ACTUAL pero no el ORIGINAL (ni el defecto)', () => {
    const s = estado()
    s.instances.bajo.modificadores = [{ stat: 'resistencia', valor: 4, expira: 'ocaso' } as never, { stat: 'poder', valor: 4, expira: 'ocaso' } as never]
    expect(rank(s, 'mayor', 'resistencia')).toEqual(['alto'])
    expect(rank(s, 'mayor', 'resistencia', 'original')).toEqual(['alto'])
    expect(rank(s, 'mayor', 'resistencia', 'actual')).toEqual(['bajo']) // 3 + 4 = 7 > 5
    expect(rank(s, 'menor', 'poder', 'actual')).toEqual(['alto']) // bajo 7, alto 5
    expect(rank(s, 'menor', 'poder')).toEqual(['bajo'])
  })
})
