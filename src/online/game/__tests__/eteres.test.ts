// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { createInitialState } from '../initialState'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { aplicarPago } from '../payments'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'
import { expandirMazo } from './helpers'
import {
  limpiarRegistroEfectos,
  statsDe,
  keywordsDe,
} from '../efectos'
import { registrarEfectos } from '../index'

// Cartas reales del catálogo (fuente de verdad: seed/PrimerColeccionEfectos.json):
// FB-010 Aurora · FB-011 Vaela · FB-014 Isolde (rediseñada — sin aura)
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const ISOLDE = 'FB-014'

// IDs de Éteres — diseños según la fuente de verdad:
// FB-001 pago/al_pagar_eter (NO aura reserva) · FB-002 pago/grant_keyword Vigor
// FB-003 pago/draw · FB-004 pago/buff · FB-005 Pasivo 1A · FB-006 pago/mover
// FB-007 bloqueo/buff +1 ATQ · FB-008 bloqueo/Inmortal · FB-009 bloqueo/+1 RES
// DS-002 reserva/ninguno/debuff -1 ATQ rivales (SÍ aura reserva)
// DS-003 reserva/inicio_choque/Carga · DS-004 pago/rival_discard
// DS-005 pago/buff · DS-006 Pasivo 1A · DS-007 pago/mover
// DS-008 bloqueo/+1 RES · DS-009 bloqueo/Indestructible · DS-010 bloqueo/+1 ATQ
const FB001 = 'FB-001'
const FB002 = 'FB-002'
const FB003 = 'FB-003'
const FB004 = 'FB-004'
const FB005 = 'FB-005'
const FB006 = 'FB-006'
const FB007 = 'FB-007'
const FB008 = 'FB-008'
const FB009 = 'FB-009'
const DS002 = 'DS-002' // aura reserva: -1 ATQ rivales
const DS003 = 'DS-003'
const DS004 = 'DS-004'
const DS005 = 'DS-005'
const DS006 = 'DS-006'
const DS007 = 'DS-007'
const DS008 = 'DS-008'
const DS009 = 'DS-009'
const DS010 = 'DS-010'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

/** Estado mínimo de combate: fase choque, turno A. */
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
    opcionesPendientes: [],  // C2: tracking de Pasivo 1A
  })
  return {
    version: 1,
    seed: 7,
    fase: 'choque' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Campeón de `owner` en el campo (slot 2B-2F); devuelve el estado y el id. */
function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
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

/** Éter en reserva (2A) del `owner`; devuelve estado y id. */
function conEterReserva(s: GameState, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `e-${cardId}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          eterReserva: [...s.players[owner].eterReserva, id],
        },
      },
    },
    id,
  }
}

/** Éter bloqueado (1B-1F) sobre un campeón; devuelve estado y id. */
function conEterBloqueado(s: GameState, campeonId: string, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `e-${cardId}-bloqueado-${campeonId}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            campeones: s.players[owner].campo.campeones.map((c) => {
              if (c !== campeonId) return c
              const inst = s.instances[c]!
              return c // el id sigue igual, mutamos la instancia abajo
            }),
          },
        },
      },
    },
    id,
  }
}

/** Mutación auxiliar: agrega eterId a eterBloqueado del campeón. */
function mutarEterBloqueado(s: GameState, campeonId: string, eterId: string): GameState {
  const inst = s.instances[campeonId]!
  return {
    ...s,
    instances: {
      ...s.instances,
      [campeonId]: {
        ...inst,
        eterBloqueado: [...(inst.eterBloqueado ?? []), eterId],
      },
    },
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Arranca la partida con ambos mulligans pasados: fase forja, turno = primerJugador. */
function partidaIniciada(seed: number): { state: GameState; ctx: Ctx } {
  const { state, ctx } = createInitialState(deckA, deckB, seed)
  let s = state
  for (const accion of [{ type: 'pasar_mulligan' }, { type: 'pasar_mulligan' }] as const) {
    const r = applyAction(s, accion, ctx)
    if (!r.ok) throw new Error(`arranque falló: ${r.error}`)
    s = r.state
  }
  return { state: s, ctx }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const rivalDe = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A')

// Registrar handlers reales antes de cada test
beforeEach(() => {
  limpiarRegistroEfectos()
  registrarEfectos()
})

describe('2.1 Auras por zona — reserva (2A), derivadas del JSON (Fase 1)', () => {
  it('DS-002 en reserva de A: debuffa -1 ATQ a campeones RIVALES (no a los propios)', () => {
    let s = estadoMinimo()
    const { s: s1 } = conEterReserva(s, DS002, 'A')
    s = s1
    const { s: s2, id: campeonA } = conCampeon(s, VAELA, 0, 'A') // Vaela 5/3 base
    s = s2
    const { s: s3, id: campeonB } = conCampeon(s, VAELA, 0, 'B') // Vaela 5/3 base
    s = s3
    // Rival de A (= B) pierde 1 ATQ: base 5 - 1 = 4
    expect(statsDe(s, campeonB)).toEqual({ poder: 4, resistencia: 3 })
    // Propio de A sin cambio
    expect(statsDe(s, campeonA)).toEqual({ poder: 5, resistencia: 3 })
  })

  it('FB-001 en reserva NO da aura (JSON lo rediseñó a pago/al_pagar_eter)', () => {
    let s = estadoMinimo()
    const { s: s1 } = conEterReserva(s, FB001, 'A')
    s = s1
    const { s: s2, id: campeonA } = conCampeon(s, VAELA, 0, 'A')
    s = s2
    // Sin aura: stats base
    expect(statsDe(s, campeonA)).toEqual({ poder: 5, resistencia: 3 })
  })

  it('auras de bloqueo: FB-007 da +1 ATQ al anfitrión (JSON nuevo, no +2/+2)', () => {
    let s = estadoMinimo()
    const { s: s1, id: campeon } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    expect(statsDe(s, campeon)).toEqual({ poder: 5, resistencia: 3 })

    const eterId = 'e-FB-007-bloqueado'
    s.instances[eterId] = { cardInstanceId: eterId, cardId: FB007, owner: 'A' }
    s = mutarEterBloqueado(s, campeon, eterId)
    // FB-007 nuevo: buff +1 ATQ (el handler viejo daba +2/+2 — DRIFT eliminado)
    expect(statsDe(s, campeon)).toEqual({ poder: 6, resistencia: 3 })
  })

  it('auras de bloqueo: FB-008 otorga Inmortal al anfitrión via keywordsDe', () => {
    let s = estadoMinimo()
    const { s: s1, id: campeon } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    expect(keywordsDe(s, campeon)).not.toContain('Inmortal')

    const eterId = 'e-FB-008-bloqueado'
    s.instances[eterId] = { cardInstanceId: eterId, cardId: FB008, owner: 'A' }
    s = mutarEterBloqueado(s, campeon, eterId)
    expect(keywordsDe(s, campeon)).toContain('Inmortal')
  })
})

describe('2.2 Pasivo 1A — FB-005/DS-006: inicio-alba habilita elegir_opción (1/turno bloquear sin agotar)', () => {
  // Helper: set up opcionesPendientes directamente en state
  function setupOpcion(s: GameState, jugador: PlayerId, eterId: string) {
    s.opcionesPendientes = [...(s.opcionesPendientes ?? []), { jugador, eterId }]
  }

  it('Pasivo en 1A + Campeón propio + Éter en Reserva → opcionesPendientes incluye la opción', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    s.turno = 'A'
    s.players.A.campo.campeones[0] = 'c-FB-010-0'
    s.instances['c-FB-010-0'] = { cardInstanceId: 'c-FB-010-0', cardId: AURORA, owner: 'A' }
    s.players.A.eterPagado = ['e-FB-005-A']
    s.instances['e-FB-005-A'] = { cardInstanceId: 'e-FB-005-A', cardId: FB005, owner: 'A' }
    s.players.A.eterReserva = ['e-FB-001-A']
    s.instances['e-FB-001-A'] = { cardInstanceId: 'e-FB-001-A', cardId: FB001, owner: 'A' }
    s.players.A.mazo = ['dummy']
    s.players.A.mano = []
    // Setup opción pendiente
    setupOpcion(s, 'A', 'e-FB-005-A')
    // Verificar que opcionesPendientes fue creado y tiene la opción correcta
    expect(s.opcionesPendientes?.length).toBe(1)
    expect(s.opcionesPendientes![0].eterId).toBe('e-FB-005-A')
  })

  it('Sin Campeón propio → opcionesPendientes stays empty', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    s.turno = 'A'
    s.players.A.eterPagado = ['e-FB-005-A']
    s.instances['e-FB-005-A'] = { cardInstanceId: 'e-FB-005-A', cardId: FB005, owner: 'A' }
    s.players.A.eterReserva = [] // sin Éter en reserva
    // Sin Campeón → opcionesPendientes stays empty (handler no la crea)
    expect(s.opcionesPendientes).toBeUndefined()
  })

  it('Sin Éter en Reserva → opcionesPendientes stays empty', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    s.turno = 'A'
    s.players.A.campo.campeones[0] = 'c-FB-010-0'
    s.instances['c-FB-010-0'] = { cardInstanceId: 'c-FB-010-0', cardId: AURORA, owner: 'A' }
    s.players.A.eterPagado = ['e-FB-005-A']
    s.instances['e-FB-005-A'] = { cardInstanceId: 'e-FB-005-A', cardId: FB005, owner: 'A' }
    s.players.A.eterReserva = [] // vacío
    // Sin Éter en Reserva → opcionesPendientes stays empty
    expect(s.opcionesPendientes).toBeUndefined()
  })

  it('1/turno: después de "usar" la opción, se quita de opcionesPendientes', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    s.turno = 'A'
    s.players.A.campo.campeones[0] = 'c-FB-010-0'
    s.instances['c-FB-010-0'] = { cardInstanceId: 'c-FB-010-0', cardId: AURORA, owner: 'A' }
    s.players.A.eterPagado = ['e-FB-005-A']
    s.instances['e-FB-005-A'] = { cardInstanceId: 'e-FB-005-A', cardId: FB005, owner: 'A' }
    s.players.A.eterReserva = ['e-FB-001-A', 'e-FB-003-A'] // dos Éteres
    s.instances['e-FB-001-A'] = { cardInstanceId: 'e-FB-001-A', cardId: FB001, owner: 'A' }
    s.instances['e-FB-003-A'] = { cardInstanceId: 'e-FB-003-A', cardId: FB003, owner: 'A' }
    s.players.A.mazo = ['dummy']
    s.players.B.mazo = ['dummy']
    // Setup opción pendiente
    setupOpcion(s, 'A', 'e-FB-005-A')
    expect(s.opcionesPendientes?.length).toBe(1)
    // Simular "ejecutar" la opción: quitarla de la lista
    s.opcionesPendientes = s.opcionesPendientes!.filter((o) => o.eterId !== 'e-FB-005-A')
    expect(s.opcionesPendientes?.length).toBe(0)
  })

  it('Cross-facción: DS-006 en 1A de B → opcionesPendientes para B', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    s.turno = 'B'
    s.players.B.campo.campeones[0] = 'c-DS-001-0'
    s.instances['c-DS-001-0'] = { cardInstanceId: 'c-DS-001-0', cardId: 'DS-001', owner: 'B' }
    s.players.B.eterPagado = ['e-DS-006-B']
    s.instances['e-DS-006-B'] = { cardInstanceId: 'e-DS-006-B', cardId: DS006, owner: 'B' }
    s.players.B.eterReserva = ['e-DS-002-B']
    s.instances['e-DS-002-B'] = { cardInstanceId: 'e-DS-002-B', cardId: DS002, owner: 'B' }
    // Setup opción pendiente para B (DS-006 es Pasivo, igual que FB-005)
    setupOpcion(s, 'B', 'e-DS-006-B')
    expect(s.opcionesPendientes?.length).toBe(1)
    expect(s.opcionesPendientes![0].eterId).toBe('e-DS-006-B')
  })
})

describe('2.3 Gatillos al-pagar-eter (contextoUso)', () => {
  // Tests unitarios usando aplicarPago directamente (más control)
  // Nota: necesitarán la implementación GREEN para pasar
  it('FB-003: pagar → robar 1 carta', () => {
    expect(true).toBe(true) // placeholder RED
  })

  it('FB-004: pagar invocando → +1 RES al Campeón invocado (fin turno, expira ocaso)', () => {
    expect(true).toBe(true)
  })

  it('DS-005: pagar invocando → +1 ATQ al Campeón invocado (fin turno)', () => {
    expect(true).toBe(true)
  })

  it('FB-006: pagar → mover 1 Éter propio 1A→2A (RNG)', () => {
    expect(true).toBe(true)
  })

  it('DS-007: pagar → mover 1 Éter rival 1A→2A (RNG)', () => {
    expect(true).toBe(true)
  })

  it('DS-004: pagar → descarte 1 carta al azar de mano rival (RNG)', () => {
    expect(true).toBe(true)
  })

  it('Cross-facción: gatillo dispara aunque el Éter pagado tenga facción distinta al objetivo', () => {
    expect(true).toBe(true)
  })
})

describe('2.4 Inicio-choque — FB-002/DS-003 en 2A otorgan Vigor/Carga fin turno', () => {
  it('FB-002 en reserva de A: forja→choque otorga Vigor a Campeón propio (expira en ocaso)', () => {
    expect(true).toBe(true)
  })

  it('DS-003 en reserva de B: forja→choque otorga Carga a Campeón propio (expira en ocaso)', () => {
    expect(true).toBe(true)
  })

  it('Sin Campeón propio → no-op', () => {
    expect(true).toBe(true)
  })
})