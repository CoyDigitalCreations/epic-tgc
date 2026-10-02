// @vitest-environment node
/**
 * Fase 3b — negar (FB-021 Marcha de las Primeras).
 *
 * "Niega la activación del efecto de un Campeón que controla el rival."
 * Efecto: hechizo negar, tipoNegacion: 'activacion', objetivo campeón rival campo.
 *
 * Semántica V1 (diseño derivado, sin spec en manual): mientras FB-021 esté en
 * campo, el campeón target no puede activar efectos (validarActivarHabilidad
 * rechaza). La negación termina cuando la fuente sale del campo (estado
 * derivado — championNegado scan, patrón modificadoresJSONDe).
 *
 * Cartas: FB-021 Marcha de las Primeras (Mística Presteza cost 3) ·
 * FB-016 Cassandra (Campeón continuo bloqueo_fijo 4) · FB-001 Éter Orden.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { championNegado } from '../efectos'
import { validarActivarHabilidad } from '../habilidades'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const FB021 = 'FB-021' // Mística Presteza, hechizo negar, cost 3
const CASSANDRA = 'FB-016' // Campeón continuo (bloqueo_fijo 4, grant_keyword)
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

function conInstancias(s: GameState, mapa: Record<string, { cardId: string; owner?: PlayerId; extra?: Record<string, unknown> }>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(
        Object.entries(mapa).map(([id, { cardId, owner = 'A', extra }]) => [
          id,
          { cardInstanceId: id, cardId, owner, ...(extra ?? {}) },
        ]),
      ),
    },
  }
}

/** Campeón de `owner` en campo[slot]. */
function conCampeon(s: GameState, cardId: string, owner: PlayerId, slot: number): { s: GameState; id: string } {
  const id = `camp-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

/** Mística de `owner` en misticasTacticas[slot] con extras opcionales. */
function conMistica(s: GameState, cardId: string, owner: PlayerId, slot: number, extra?: Record<string, unknown>): { s: GameState; id: string } {
  const id = `mist-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner, extra } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            misticasTacticas: s.players[owner].campo.misticasTacticas.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

function conMano(s: GameState, owner: PlayerId, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner }])))
  return {
    ...conInst,
    players: { ...conInst.players, [owner]: { ...conInst.players[owner], mano: [...conInst.players[owner].mano, ...Object.keys(mapa)] } },
  }
}

function conEteres(s: GameState, owner: PlayerId, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${owner}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner }]))),
      players: { ...s.players, [owner]: { ...s.players[owner], eterReserva: [...s.players[owner].eterReserva, ...ids] } },
    },
    ids,
  }
}

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return { next: () => n++, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

describe('championNegado — estado derivado (Fase 3b)', () => {
  it('true cuando una fuente negar en campo tiene negadoTargetId === champ', () => {
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    const conMist = conMistica(conCamp.s, FB021, 'A', 0, { negadoTargetId: conCamp.id })
    expect(championNegado(conMist.s, conCamp.id)).toBe(true)
  })

  it('false cuando la fuente negar NO está en campo (salió)', () => {
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    // FB-021 registrada como instancia pero FUERA del campo (en cementerio)
    const s = conInstancias(conCamp.s, {
      'mist-fuera': { cardId: FB021, owner: 'A', extra: { negadoTargetId: conCamp.id } },
    })
    expect(championNegado(s, conCamp.id)).toBe(false)
  })

  it('false cuando el negadoTargetId no coincide con el champ consultado', () => {
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    const conOtro = conCampeon(conCamp.s, CASSANDRA, 'B', 1)
    const conMist = conMistica(conOtro.s, FB021, 'A', 0, { negadoTargetId: 'otro-id' })
    expect(championNegado(conMist.s, conCamp.id)).toBe(false)
    expect(championNegado(conMist.s, conOtro.id)).toBe(false)
  })

  it('false cuando la fuente no tiene efecto negar en el JSON', () => {
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    // Mística sin negar (FB-019) con negadoTargetId seteado — el scan verifica efectos[]
    const conMist = conMistica(conCamp.s, 'FB-019', 'A', 0, { negadoTargetId: conCamp.id })
    expect(championNegado(conMist.s, conCamp.id)).toBe(false)
  })
})

describe('validarActivarHabilidad con negación (Fase 3b)', () => {
  /** Setup: Cassandra (B) en campo + FB-021 (A) en campo negándola + éteres para B. */
  function conCassandraNegada(): { s: GameState; cassandraId: string; fb021Id: string; eterIds: string[] } {
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    const conMist = conMistica(conCamp.s, FB021, 'A', 0, { negadoTargetId: conCamp.id })
    const { s: sConEteres, ids } = conEteres(conMist.s, 'B', ETER_ORDEN, 4)
    // turno = B (el controlador de Cassandra intenta activar)
    const s: GameState = { ...sConEteres, turno: 'B' }
    return { s, cassandraId: conCamp.id, fb021Id: conMist.id, eterIds: ids }
  }

  it('RECHAZA activación de campeón negado', () => {
    const { s, cassandraId, eterIds } = conCassandraNegada()
    const error = validarActivarHabilidad(s, {
      type: 'activar_habilidad',
      cardInstanceId: cassandraId,
      eterIds: eterIds.slice(0, 4),
    })
    expect(error).toMatch(/negado/)
  })

  it('PERMITE activación cuando la fuente negar salió del campo', () => {
    const { s, cassandraId, fb021Id, eterIds } = conCassandraNegada()
    // Sacar FB-021 del campo de A (simular destrucción/retorno)
    const sSinFuente: GameState = {
      ...s,
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          campo: { ...s.players.A.campo, misticasTacticas: [null, null, null] },
        },
      },
    }
    // La instancia sigue existiendo pero FUERA de campo → sin negación
    expect(championNegado(sSinFuente, cassandraId)).toBe(false)
    const error = validarActivarHabilidad(sSinFuente, {
      type: 'activar_habilidad',
      cardInstanceId: cassandraId,
      eterIds: eterIds.slice(0, 4),
    })
    expect(error).toBeNull()
  })

  it('NO afecta campeones no negados (mismo estado)', () => {
    const { s, cassandraId } = conCassandraNegada()
    // Segundo campeón de B NO negado
    const conSegundo = conCampeon(s, CASSANDRA, 'B', 1)
    const error = validarActivarHabilidad(conSegundo.s, {
      type: 'activar_habilidad',
      cardInstanceId: conSegundo.id,
      eterIds: [],
    })
    // Sin éter → error de éter, NO de negación
    expect(error).not.toMatch(/negado/)
  })
})

describe('flujo integral jugar FB-021 (Fase 3b)', () => {
  it('al jugar FB-021 contra el único campeón rival → D1 pendiente; al elegir → negado', () => {
    const ctx = crearCtx()
    // B tiene Cassandra en campo; A juega FB-021 (cost 3)
    const conCamp = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    let s = conMano(conCamp.s, 'A', { fb021: FB021 })
    const { s: sEteres, ids } = conEteres(s, 'A', ETER_ORDEN, 3)
    s = sEteres

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'fb021', slot: 0, eterIds: ids }, ctx)

    // D1: fromTrigger=true fuerza pendiente aunque haya 1 target (patrón del motor)
    expect(s.objetivosPendientes?.length).toBe(1)
    expect(s.objetivosPendientes![0].opciones).toContain(conCamp.id)
    // Todavía NO negado (pendiente sin resolver)
    expect(championNegado(s, conCamp.id)).toBe(false)

    // Resolver el pendiente → re-dispatch con objetivo-elegido → negar ejecuta
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: conCamp.id }, ctx)

    const fb021Inst = Object.values(s.instances).find((i) => i?.cardId === FB021)
    expect(fb021Inst?.negadoTargetId).toBe(conCamp.id)
    expect(championNegado(s, conCamp.id)).toBe(true)
  })

  it('FB-021 sin campeones rivales en campo → no nega nada (efecto fizzled)', () => {
    const ctx = crearCtx()
    // Campo de B vacío; A juega FB-021
    let s = conMano(estadoMinimo(), 'A', { fb021: FB021 })
    const { s: sEteres, ids } = conEteres(s, 'A', ETER_ORDEN, 3)
    s = sEteres

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'fb021', slot: 0, eterIds: ids }, ctx)

    const fb021Inst = Object.values(s.instances).find((i) => i?.cardId === FB021)
    expect(fb021Inst?.negadoTargetId).toBeUndefined()
  })

  it('D1: con DOS campeones rivales → pendiente elegir_objetivo; al elegir, solo el chosen queda negado', () => {
    const ctx = crearCtx()
    const conCamp0 = conCampeon(estadoMinimo(), CASSANDRA, 'B', 0)
    const conCamp1 = conCampeon(conCamp0.s, CASSANDRA, 'B', 1)
    let s = conMano(conCamp1.s, 'A', { fb021: FB021 })
    const { s: sEteres, ids } = conEteres(s, 'A', ETER_ORDEN, 3)
    s = sEteres

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'fb021', slot: 0, eterIds: ids }, ctx)

    // Pendiente D1 creado (múltiples rivales)
    expect(s.objetivosPendientes?.length).toBe(1)
    const pend = s.objetivosPendientes![0]
    expect(pend.opciones).toContain(conCamp0.id)
    expect(pend.opciones).toContain(conCamp1.id)
    // Todavía NO nega (pendiente sin resolver)
    expect(championNegado(s, conCamp0.id)).toBe(false)

    // Elegir el primer campeón → re-dispatch con objetivo-elegido
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: conCamp0.id }, ctx)
    expect(championNegado(s, conCamp0.id)).toBe(true)
    expect(championNegado(s, conCamp1.id)).toBe(false)
  })
})
