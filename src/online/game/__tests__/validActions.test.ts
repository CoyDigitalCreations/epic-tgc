// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

const CAMPEON = 'FB-011' // cost 2
const MISTICA = 'FB-019' // cost 2
const TACTICA = 'FB-021' // cost 0
const ARCANA = 'FB-023' // cost 3
const COMBATE = 'FB-024' // cost 0
const ETER_ORDEN = 'FB-001'

function estadoMinimo(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 7,
    fase: 'forja' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conInstancias(s: GameState, mapa: Record<string, { cardId: string; owner?: PlayerId }>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(
        Object.entries(mapa).map(([id, { cardId, owner = 'A' }]) => [id, { cardInstanceId: id, cardId, owner }]),
      ),
    },
  }
}

function conMano(s: GameState, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner: 'A' }])))
  return { ...conInst, players: { ...conInst.players, A: { ...conInst.players.A, mano: Object.keys(mapa) } } }
}

function conEteres(s: GameState, cardId: string, n: number): GameState {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner: 'A' }]))),
    players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
  }
}

describe('getValidActions en Forja (5.5)', () => {
  it('incluye jugar_campeon/jugar_mistica/colocar_* solo cuando son pagables y hay slot; siempre pasar_turno y rendirse', () => {
    let s = conMano(estadoMinimo(), {
      cam: CAMPEON,
      mist: MISTICA,
      tac: TACTICA,
      arc: ARCANA,
      comb: COMBATE,
    })
    s = conEteres(s, ETER_ORDEN, 3) // suficiente para FB-011 (2), FB-019 (2) y FB-023 (3)

    const acciones = getValidActions(s, 'A')
    const tipos = acciones.map((a) => a.type)

    expect(tipos).toContain('jugar_campeon')
    expect(tipos).toContain('jugar_mistica')
    expect(tipos).toContain('colocar_tactica')
    expect(tipos).toContain('colocar_arcana')
    expect(tipos).toContain('colocar_combate')
    expect(tipos).toContain('pasar_turno')
    expect(tipos).toContain('rendirse')
  })

  it('NO incluye jugar_campeon/jugar_mistica/colocar_arcana si la Reserva no alcanza; sí Táctica y Combate (gratis)', () => {
    let s = conMano(estadoMinimo(), { cam: CAMPEON, mist: MISTICA, tac: TACTICA, arc: ARCANA, comb: COMBATE })
    s = conEteres(s, ETER_ORDEN, 1) // no alcanza para coste 2 ni 3

    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).not.toContain('jugar_campeon')
    expect(tipos).not.toContain('jugar_mistica')
    expect(tipos).not.toContain('colocar_arcana')
    expect(tipos).toContain('colocar_tactica')
    expect(tipos).toContain('colocar_combate')
  })

  it('NO incluye acciones de invocación si no hay slot libre en el grupo', () => {
    let s = conMano(estadoMinimo(), { cam: CAMPEON })
    s = conEteres(s, ETER_ORDEN, 2)
    s = {
      ...s,
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          campo: {
            campeones: ['x1', 'x2', 'x3', 'x4', 'x5'],
            misticasTacticas: [null, null, null],
            arcanasCombate: [null, null, null],
          },
        },
      },
      instances: {
        ...s.instances,
        ...Object.fromEntries(['x1', 'x2', 'x3', 'x4', 'x5'].map((id) => [id, { cardInstanceId: id, cardId: CAMPEON, owner: 'A' as PlayerId }])),
      },
    }
    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).not.toContain('jugar_campeon')
    expect(tipos).toContain('pasar_turno')
  })

  it('Soberano en mano: incluye jugar_campeon SOLO si hay sacrificio de facción compartida', () => {
    const CON_CAMPO = { cam1: CAMPEON } // campeón Orden propio en campo
    let s = conMano(estadoMinimo(), { aurora: 'FB-010' }) // Soberano Singular cost 4
    s = conInstancias(s, Object.fromEntries(Object.entries(CON_CAMPO).map(([id, cardId]) => [id, { cardId, owner: 'A' }])))
    s = {
      ...s,
      players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: [null, 'cam1', null, null, null] } } },
    }
    s = conEteres(s, ETER_ORDEN, 4)

    const jugar = getValidActions(s, 'A').filter((a) => a.type === 'jugar_campeon')
    expect(jugar).toHaveLength(1)
    if (jugar[0]?.type === 'jugar_campeon') {
      expect(jugar[0].sacrificios).toEqual(['cam1'])
      expect(jugar[0].eterIds).toHaveLength(4)
    }

    // Sin sacrificio disponible (campo vacío) → no se genera
    const sinCampo = conEteres(conMano(estadoMinimo(), { aurora: 'FB-010' }), ETER_ORDEN, 4)
    const tipos = getValidActions(sinCampo, 'A').map((a) => a.type)
    expect(tipos).not.toContain('jugar_campeon')
  })

  it('incluye bloquear_eter por Campeón propio con Éter de facción compartida en la Reserva', () => {
    let s = conInstancias(estadoMinimo(), { cam1: { cardId: CAMPEON, owner: 'A' } })
    s = { ...s, players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['cam1', null, null, null, null] } } } }
    s = conEteres(s, ETER_ORDEN, 1)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(1)
  })

  it('solo expone acciones para el jugador ACTIVO; el rival solo ve rendirse', () => {
    const s = conEteres(conMano(estadoMinimo(), { cam: CAMPEON }), ETER_ORDEN, 2)
    const activo = getValidActions(s, 'A')
    const rival = getValidActions(s, 'B')
    expect(activo.some((a) => a.type === 'jugar_campeon')).toBe(true)
    expect(rival.map((a) => a.type)).toEqual(['rendirse'])
  })

  it('NUNCA devuelve acciones que fallan: cada payload generado pasa applyAction', () => {
    let s = conMano(estadoMinimo(), { cam: CAMPEON, mist: MISTICA, tac: TACTICA, arc: ARCANA, comb: COMBATE })
    s = conEteres(s, ETER_ORDEN, 3)
    const ctx: Ctx = { next: () => 0, emit: () => {}, events: [] }

    const acciones: Action[] = getValidActions(s, 'A')
    for (const accion of acciones) {
      const r = applyAction(s, accion, ctx)
      expect(r.ok, `la acción generada ${accion.type} falló: ${(r as { error?: string }).error ?? ''}`).toBe(true)
    }
  })
})
