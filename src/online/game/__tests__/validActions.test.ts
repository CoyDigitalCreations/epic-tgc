// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

const CAMPEON = 'FB-011' // cost 2
const CAMPEON_BLOQUEO = 'FB-016' // Cassandra: habilidad activa con patrón "bloqueado"
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
    expect(tipos).toContain('colocar_arcana')
    expect(tipos).toContain('pasar_turno')
    expect(tipos).toContain('rendirse')
  })

  it('NO incluye jugar_campeon/jugar_mistica si la Reserva no alcanza; sí colocar_arcana (gratis)', () => {
    let s = conMano(estadoMinimo(), { cam: CAMPEON, mist: MISTICA, arc: ARCANA })
    s = conEteres(s, ETER_ORDEN, 1) // no alcanza para coste 2 ni 3

    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).not.toContain('jugar_campeon')
    expect(tipos).not.toContain('jugar_mistica')
    expect(tipos).toContain('colocar_arcana') // gratis: siempre disponible si hay slot
    expect(tipos).not.toContain('activar_arcana') // no hay éter suficiente para activar
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

  it('incluye bloquear_eter por Campeón propio con habilidad activa "bloqueado" y Éter de facción compartida en la Reserva', () => {
    let s = conInstancias(estadoMinimo(), { cam1: { cardId: CAMPEON_BLOQUEO, owner: 'A' } })
    s = { ...s, players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['cam1', null, null, null, null] } } } }
    s = conEteres(s, 'FB-001', 1) // Éter Orden compatible con Cassandra (Orden)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(1)
  })

  it('NO incluye bloquear_eter para Campeón sin habilidad que use éter bloqueado', () => {
    let s = conInstancias(estadoMinimo(), { cam1: { cardId: CAMPEON, owner: 'A' } })
    s = { ...s, players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['cam1', null, null, null, null] } } } }
    s = conEteres(s, 'FB-001', 1)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(0)
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

describe('getValidActions en Choque (9.1-9.3, C2)', () => {
  it('Choque sin combate: el activo declara_ataque (todos los elegibles + por Campeón) o pasa_turno; el rival solo rendirse', () => {
    let s = conInstancias(estadoMinimo(), { a1: { cardId: CAMPEON, owner: 'A' } })
    s = { ...s, fase: 'choque', primerTurno: false, players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['a1', null, null, null, null] } } } }

    const activo = getValidActions(s, 'A')
    const tipos = activo.map((a) => a.type)
    expect(tipos).toContain('pasar_turno') // ataque OPCIONAL (9.1, ADR-11)
    expect(activo.filter((a) => a.type === 'declarar_ataque')).toHaveLength(2) // "todos" + 1 por Campeón
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
  })

  it('primerTurno prohíbe atacar (§8.6): sin declarar_ataque, sí pasar_turno', () => {
    let s = conInstancias(estadoMinimo(), { a1: { cardId: CAMPEON, owner: 'A' } }) // primerTurno: true
    s = { ...s, fase: 'choque', players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['a1', null, null, null, null] } } } }

    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).not.toContain('declarar_ataque')
    expect(tipos).toContain('pasar_turno')
  })

  it('combate pendiente (paso bloqueo): el activo NO pasa el turno (R15); el DEFENSOR recibe el bloqueo greedy forzado', () => {
    let s = conInstancias(estadoMinimo(), { a1: { cardId: CAMPEON, owner: 'A' }, b1: { cardId: CAMPEON, owner: 'B' } })
    s = {
      ...s,
      fase: 'choque',
      primerTurno: false,
      players: {
        ...s.players,
        A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['a1', null, null, null, null] } },
        B: { ...s.players.B, campo: { ...s.players.B.campo, campeones: ['b1', null, null, null, null] } },
      },
      combate: { paso: 'bloqueo', atacantes: ['a1'], bloqueos: {}, rupturaDisponible: true, rupturaUsadaEsteTurno: false },
    }

    expect(getValidActions(s, 'A').map((a) => a.type)).toEqual(['rendirse']) // gated: no pasar_turno
    const defensor = getValidActions(s, 'B')
    const bloqueo = defensor.find((a): a is Extract<Action, { type: 'declarar_bloqueo' }> => a.type === 'declarar_bloqueo')
    expect(bloqueo).toBeDefined()
    if (bloqueo) expect(bloqueo.asignaciones).toEqual({ a1: 'b1' })
  })

  it('payloads de combate generados pasan applyAction (nunca fallan, 6.2)', () => {
    let s = conInstancias(estadoMinimo(), { a1: { cardId: CAMPEON, owner: 'A' }, b1: { cardId: CAMPEON, owner: 'B' } })
    s = {
      ...s,
      fase: 'choque',
      primerTurno: false,
      players: {
        ...s.players,
        A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: ['a1', null, null, null, null] } },
        B: { ...s.players.B, campo: { ...s.players.B.campo, campeones: ['b1', null, null, null, null] } },
      },
    }
    const ctx: Ctx = { next: () => 0, emit: () => {}, events: [] }

    const ataque = getValidActions(s, 'A').find((a): a is Extract<Action, { type: 'declarar_ataque' }> => a.type === 'declarar_ataque')
    expect(ataque).toBeDefined()
    const r1 = applyAction(s, ataque!, ctx)
    if (!r1.ok) throw new Error(`declarar_ataque generado falló: ${r1.error}`)
    expect(r1.state.combate?.paso).toBe('bloqueo')

    const bloqueo = getValidActions(r1.state, 'B').find((a): a is Extract<Action, { type: 'declarar_bloqueo' }> => a.type === 'declarar_bloqueo')
    expect(bloqueo).toBeDefined()
    const r2 = applyAction(r1.state, bloqueo!, ctx)
    if (!r2.ok) throw new Error(`declarar_bloqueo generado falló: ${r2.error}`)
    expect(r2.state.combate?.paso).toBe('resolucion')
  })
})
