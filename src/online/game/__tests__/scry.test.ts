// @vitest-environment node
/**
 * F9c — `scry`: mira las N cartas del tope, ordénalas y manda las que quieras al fondo. Cartas SINTÉTICAS («Dummy»).
 * La partida espera a quien mira (`ScryPendiente`) hasta que responde con `ordenar_mazo`.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { botTonto } from '../bot'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { descartarScryMuertos, scryActual } from '../scry'
import { actorActual, getValidActions } from '../validActions'
import { visibleState } from '../visibleState'
import type { EfectoData } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const,
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '3' as const,
}
const mistica = (id: string) => ({ ...base, id, name: id, type: 'Mística' as const, keywords: [], efectos: [], stats: { cost: 1 } }) as never

beforeAll(() => {
  registrarCartas([mistica('T-MIST'), mistica('T-CARTA')])
})

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
/** Mazo de A = [a, b, c, d, e] (tope primero). */
function estado(mazoA = ['a', 'b', 'c', 'd', 'e'], mazoB = ['x', 'y', 'z']): GameState {
  const s: GameState = { version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} }
  for (const [j, ids] of [['A', mazoA], ['B', mazoB]] as [PlayerId, string[]][]) {
    for (const id of ids) s.instances[id] = { cardInstanceId: id, cardId: 'T-CARTA', owner: j }
    s.players[j].mazo = [...ids]
  }
  return s
}
const ctx = (): Ctx => { const events: Ctx['events'] = []; return { next: () => 0, emit: (e) => { events.push(e) }, events } }
const SCRY = (cantidad: number, extra: Partial<EfectoData> = {}): EfectoData => ({ tipo: 'disparo', efecto: 'scry', cantidad, ...extra })

function lanzar(s: GameState, c: Ctx, e: EfectoData, quien: PlayerId = 'A') {
  s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: quien }
  interpretEffect(s, c, s.instances.fuente, e, { jugador: quien })
}
const ordenar = (s: GameState, arriba: string[], fondo: string[], j?: PlayerId): { ok: boolean; s: GameState; error?: string; c: Ctx } => {
  const c = ctx()
  const r = applyAction(s, { type: 'ordenar_mazo', arriba, fondo, ...(j ? { jugador: j } : {}) } as Action, c)
  return r.ok ? { ok: true, s: r.state, c } : { ok: false, s, error: r.error, c }
}

describe('F9c — el efecto scry mira el tope y espera', () => {
  it('mira las N del tope: crea la pendiente, avisa con mazo_mirado y NO mueve el mazo', () => {
    const s = estado(); const c = ctx()
    lanzar(s, c, SCRY(3))
    expect(s.scryPendientes).toEqual([{ jugador: 'A', mazoDe: 'A', cartas: ['a', 'b', 'c'] }])
    expect(s.players.A.mazo).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(c.events).toEqual([{ type: 'mazo_mirado', jugador: 'A', cantidad: 3 }])
  })
  it('sin cantidad mira 1', () => {
    const s = estado(); lanzar(s, ctx(), { tipo: 'disparo', efecto: 'scry' })
    expect(s.scryPendientes?.[0].cartas).toEqual(['a'])
  })
  it('con menos cartas de las pedidas mira las que haya; con el mazo vacío no hace nada', () => {
    const s = estado(['a', 'b']); lanzar(s, ctx(), SCRY(5))
    expect(s.scryPendientes?.[0].cartas).toEqual(['a', 'b'])
    const vacio = estado([]); const c = ctx(); lanzar(vacio, c, SCRY(2))
    expect(vacio.scryPendientes).toBeUndefined()
    expect(c.events).toEqual([])
  })
  it('controlador «rival»: quien lanza mira el mazo del RIVAL', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2, { objetivo: { tipo: 'carta', controlador: 'rival', zona: 'mazo' } }))
    expect(s.scryPendientes).toEqual([{ jugador: 'A', mazoDe: 'B', cartas: ['x', 'y'] }])
  })
})

describe('F9c — ordenar_mazo', () => {
  it('reordena arriba y manda al fondo; el resto conserva su orden en medio', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    const r = ordenar(s, ['c', 'a'], ['b'])
    expect(r.ok).toBe(true)
    expect(r.s.players.A.mazo).toEqual(['c', 'a', 'd', 'e', 'b'])
    expect(r.s.scryPendientes).toBeUndefined()
    expect(r.c.events).toEqual([{ type: 'mazo_ordenado', jugador: 'A', arriba: 2, fondo: 1 }])
  })
  it('todo arriba sin cambiar el orden deja el mazo igual (la jugada del bot)', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    expect(ordenar(s, ['a', 'b', 'c'], []).s.players.A.mazo).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('todo al fondo: las N cartas pasan al final en ese orden', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2))
    expect(ordenar(s, [], ['b', 'a']).s.players.A.mazo).toEqual(['c', 'd', 'e', 'b', 'a'])
  })
  it('la primera de `arriba` es la que se roba primero', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    const r = ordenar(s, ['c', 'b', 'a'], [])
    expect(r.s.players.A.mazo[0]).toBe('c')
  })
  it('scry sobre el mazo del rival lo reordena a ÉL, no al que mira', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2, { objetivo: { tipo: 'carta', controlador: 'rival', zona: 'mazo' } }))
    const r = ordenar(s, ['y'], ['x'])
    expect(r.s.players.B.mazo).toEqual(['y', 'z', 'x'])
    expect(r.s.players.A.mazo).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('rechaza cartas de menos, de más, repetidas o ajenas', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    expect(ordenar(s, ['a', 'b'], []).ok).toBe(false)
    expect(ordenar(s, ['a', 'b', 'c', 'd'], []).ok).toBe(false)
    expect(ordenar(s, ['a', 'a'], ['b', 'c']).ok).toBe(false)
    expect(ordenar(s, ['a', 'b'], ['d']).ok).toBe(false)
  })
  it('sin scry pendiente no hay nada que ordenar', () => {
    expect(ordenar(estado(), [], []).error).toMatch(/no hay un mazo por ordenar/)
  })
  it('solo lo ordena quien lo mira', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(1))
    expect(ordenar(s, ['a'], [], 'B').ok).toBe(false)
  })
})

describe('F9c — la partida espera a quien mira', () => {
  it('mientras haya scry pendiente solo se acepta ordenar o rendirse', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2))
    const r = applyAction(s, { type: 'pasar_turno' }, ctx())
    expect(r.ok).toBe(false)
    expect(applyAction(s, { type: 'rendirse', jugador: 'A' }, ctx()).ok).toBe(true)
  })
  it('el actor es quien mira aunque no sea su turno, y solo él tiene acciones', () => {
    const s = estado(); s.turno = 'B'
    lanzar(s, ctx(), SCRY(2), 'A')
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'A').map((a) => a.type)).toEqual(['rendirse', 'ordenar_mazo'])
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
  })
  it('la acción ofrecida es la canónica: conservar el orden, nada al fondo', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    expect(getValidActions(s, 'A').filter((a) => a.type === 'ordenar_mazo')).toEqual([{ type: 'ordenar_mazo', arriba: ['a', 'b', 'c'], fondo: [] }])
  })
  it('el bot responde conservando el orden', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    const accion = botTonto(s, 'A')
    expect(accion).toEqual({ type: 'ordenar_mazo', arriba: ['a', 'b', 'c'], fondo: [] })
    expect(botTonto(s, 'B')).toBeNull()
  })
  it('si una carta mirada sale del mazo, se ordenan las que quedan; sin ninguna la pendiente se descarta', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(3))
    s.players.A.mazo = s.players.A.mazo.filter((id) => id !== 'a') // se robó
    expect(ordenar(s, ['a', 'b', 'c'], []).ok).toBe(false)
    expect(ordenar(s, ['c', 'b'], []).s.players.A.mazo).toEqual(['c', 'b', 'd', 'e'])
    s.players.A.mazo = ['d', 'e']
    expect(scryActual(s)).toBeUndefined()
    descartarScryMuertos(s)
    expect(s.scryPendientes).toBeUndefined()
  })
  it('dos scry seguidos se atienden en orden (FIFO)', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(1)); lanzar(s, ctx(), SCRY(2))
    const primero = ordenar(s, ['a'], [])
    expect(primero.s.scryPendientes).toHaveLength(1)
    expect(ordenar(primero.s, ['b', 'a'], []).s.scryPendientes).toBeUndefined()
  })
})

describe('F9c — visibilidad', () => {
  it('quien mira ve las cartas del scry; el rival no; el resto del mazo sigue opaco para ambos', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2))
    const mia = visibleState(s, 'A')
    expect([mia.instances.a.cardId, mia.instances.b.cardId]).toEqual(['T-CARTA', 'T-CARTA'])
    expect(mia.instances.c.cardId).toBeNull()
    const rival = visibleState(s, 'B')
    expect([rival.instances.a.cardId, rival.instances.b.cardId]).toEqual([null, null])
  })
  it('al terminar de ordenar el mazo vuelve a ser opaco', () => {
    const s = estado(); lanzar(s, ctx(), SCRY(2))
    const fin = ordenar(s, ['b', 'a'], []).s
    expect(visibleState(fin, 'A').instances.a.cardId).toBeNull()
  })
})
