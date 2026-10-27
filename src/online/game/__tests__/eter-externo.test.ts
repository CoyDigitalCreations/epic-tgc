// @vitest-environment node
/**
 * Fase A — Éter EXTERNO: Éter bloqueado sobre un Campeón por una carta AJENA
 * (Pasivo 1A de FB-005 / DS-006 vía elegir_opcion).
 *
 * Reglas aprobadas (handoff §2.2 / §2.3):
 *  - Se etiqueta `${campeon}#ext` (NO como propio `${campeon}#${idx}`).
 *  - NO es propio: no libera el reagrupar de Alba del Campeón, no ocupa el
 *    cupo «hasta N» de la acción de bloquear.
 *  - SÍ cuenta para umbrales/tramos de un `eter_bloqueado` (eterQueCuenta).
 *  - Un externo NO completa un `bloqueo_fijo` (contarEterUmbral → solo propio).
 *
 * Cartas reales: FB-016 Cassandra (eter_bloqueado «hasta 4», tramos 2/4),
 * FB-010 Aurora (bloqueo_fijo 4 + reagrupar Alba), FB-005 Pasivo 1A, FB-011 Vaela (rival).
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { dispararUmbralBloqueo, reagruparEfectosBloqueoAlba } from '../effectInterpreter'
import { validarBloqueo } from '../payments'
import { getValidActions } from '../validActions'
import { efectoBloqueoAccion, getCardMeta } from '../cards'
import {
  claveEfecto,
  claveExterno,
  etiquetarEterExterno,
  eterDeEfecto,
  eterExternoDe,
  eterQueCuenta,
  evaluarFinSteal,
  quitarEteres,
} from '../eter'
import type { Ctx, GameState, PlayerId } from '../types'

const CASSANDRA = 'FB-016'
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const PASIVO = 'FB-005'
const ETER = 'FB-001'

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action): GameState {
  const r = applyAction(s, accion, crearCtx())
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

/** Forja de A + B vacíos salvo un rival (Vaela) en B. Sin cartas en campo de A todavía. */
function base(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: {
      campeones: [null, null, null, null, null] as (string | null)[],
      misticasTacticas: [null, null, null],
      arcanasCombate: [null, null, null],
    },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 4,
    seed: 1,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  } as unknown as GameState
}

/** Añade instancias y las pone en el campo/zona indicada. */
function poner(
  s: GameState,
  id: string,
  cardId: string,
  owner: PlayerId = 'A',
  extra: Record<string, unknown> = {},
): GameState {
  return { ...s, instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner, ...extra } as GameState['instances'][string] } }
}

function enCampo(s: GameState, jugador: PlayerId, slot: number, id: string): GameState {
  const p = s.players[jugador]
  const campeones = p.campo.campeones.map((c, i) => (i === slot ? id : c))
  return { ...s, players: { ...s.players, [jugador]: { ...p, campo: { ...p.campo, campeones } } } }
}

function conReserva(s: GameState, ids: string[]): GameState {
  return { ...s, players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } } }
}

/** Cassandra (A, slot 0) + Vaela rival (B, slot 0) + 6 Éter en Reserva de A. */
function escenarioCassandra(): GameState {
  let s = base()
  s = poner(s, 'cass', CASSANDRA)
  s = enCampo(s, 'A', 0, 'cass')
  s = poner(s, 'rival', VAELA, 'B')
  s = enCampo(s, 'B', 0, 'rival')
  for (let i = 1; i <= 6; i++) s = poner(s, `e${i}`, ETER)
  return conReserva(s, ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'])
}

/** Aurora (A, slot 0) + Vaela rival (B, slot 0) + 8 Éter en Reserva de A. */
function escenarioAurora(): GameState {
  let s = base()
  s = poner(s, 'aur', AURORA)
  s = enCampo(s, 'A', 0, 'aur')
  s = poner(s, 'rival', VAELA, 'B')
  s = enCampo(s, 'B', 0, 'rival')
  for (let i = 0; i < 8; i++) s = poner(s, `x${i}`, ETER)
  return conReserva(s, Array.from({ length: 8 }, (_, i) => `x${i}`))
}

describe('Éter externo — etiquetado (Pasivo 1A real de FB-005 sobre Cassandra)', () => {
  it('elegir_opcion etiqueta el Éter como EXTERNO (#ext), no como propio del efecto', () => {
    let s = escenarioCassandra()
    s = poner(s, 'pasivo', PASIVO)
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterPagado: ['pasivo'] } } }

    s = aplicar(s, { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass', eterId: 'e1' })

    expect(s.instances.e1.bloqueadoPorEfecto).toBe(claveExterno('cass'))
    expect(s.instances.e1.pagadoPor).toBe('A')
    const idx = efectoBloqueoAccion(getCardMeta(CASSANDRA)!)!.indice
    expect(eterDeEfecto(s, 'cass', idx)).toEqual([]) // NO es propio
    expect(eterExternoDe(s, 'cass')).toEqual(['e1'])
    expect(eterQueCuenta(s, 'cass', idx)).toEqual(['e1']) // SÍ cuenta para umbrales
  })
})

describe('Éter externo (a) — el reagrupar de Alba NO lo libera (Aurora real)', () => {
  it('libera los propios del efecto y deja el externo bloqueado en la carta', () => {
    let s = escenarioAurora()
    const idx = efectoBloqueoAccion(getCardMeta(AURORA)!)!.indice // steal bloqueo_fijo (índice 1)
    // x0 ya NO está en la Reserva: está bloqueado sobre Aurora (fixture consistente)
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterReserva: s.players.A.eterReserva.filter((id) => id !== 'x0') } } }
    s = { ...s, instances: { ...s.instances, aur: { ...s.instances.aur, eterBloqueado: ['p1', 'p2', 'x0'] } } }
    s = poner(s, 'p1', ETER, 'A', { bloqueadoPorEfecto: claveEfecto('aur', idx), pagadoPor: 'A' })
    s = poner(s, 'p2', ETER, 'A', { bloqueadoPorEfecto: claveEfecto('aur', idx), pagadoPor: 'A' })
    etiquetarEterExterno(s, ['x0'], 'aur', 'A')

    const reservaAntes = s.players.A.eterReserva.length
    reagruparEfectosBloqueoAlba(s, crearCtx(), 'A')

    expect(s.players.A.eterReserva).toHaveLength(reservaAntes + 2)
    expect(s.players.A.eterReserva).toEqual(expect.arrayContaining(['p1', 'p2']))
    expect(s.players.A.eterReserva).not.toContain('x0')
    expect(s.instances.aur.eterBloqueado).toEqual(['x0'])
    expect(s.instances.x0.bloqueadoPorEfecto).toBe(claveExterno('aur'))
  })
})

/** El tramo 4 de FB-016 pide `filtros.agotado: true`: sin rival agotado no hay objetivo y no dispara. */
function conRivalAgotado(s: GameState): GameState {
  return { ...s, instances: { ...s.instances, rival: { ...s.instances.rival, agotado: true } } }
}

describe('Éter externo (b) — SÍ cuenta para tramos de eter_bloqueado (Cassandra real)', () => {
  it('2 propios + 2 externos → completa el tramo 4 (con solo propios, solo el 2)', () => {
    // Control: sin externos, 2 propios → solo tramo 2
    const control = aplicar(conRivalAgotado(escenarioCassandra()), { type: 'bloquear_eter', eterIds: ['e1', 'e2'], targetInstanceId: 'cass' })
    expect(control.instances.cass.tramosDisparados).toEqual([2])

    // Con 2 externos (Pasivo 1A sobre la misma carta) → 2 propios + 2 externos = 4
    let s = conRivalAgotado(escenarioCassandra())
    s = poner(s, 'x1', ETER)
    s = poner(s, 'x2', ETER)
    s = { ...s, instances: { ...s.instances, cass: { ...s.instances.cass, eterBloqueado: ['x1', 'x2'] } } }
    etiquetarEterExterno(s, ['x1', 'x2'], 'cass', 'A')

    s = aplicar(s, { type: 'bloquear_eter', eterIds: ['e1', 'e2'], targetInstanceId: 'cass' })

    expect(s.instances.cass.tramosDisparados).toEqual([2, 4])
  })
})

describe('Éter externo (c) — NO ocupa el cupo «hasta N» (Cassandra real)', () => {
  it('con 2 externos se pueden bloquear 4 propios; el cupo sigue aplicando a los propios', () => {
    let s = escenarioCassandra()
    s = poner(s, 'x1', ETER)
    s = poner(s, 'x2', ETER)
    s = { ...s, instances: { ...s.instances, cass: { ...s.instances.cass, eterBloqueado: ['x1', 'x2'] } } }
    etiquetarEterExterno(s, ['x1', 'x2'], 'cass', 'A')

    // 5 propios exceden el cupo 4 aunque haya externos: el cupo cuenta SOLO lo propio
    expect(validarBloqueo(s, 'A', ['e1', 'e2', 'e3', 'e4', 'e5'], 'cass')).toMatch(/máximo 4/)

    // 4 propios: caben exactamente
    expect(validarBloqueo(s, 'A', ['e1', 'e2', 'e3', 'e4'], 'cass')).toBeNull()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ['e1', 'e2', 'e3', 'e4'], targetInstanceId: 'cass' })
    expect(eterDeEfecto(s, 'cass', efectoBloqueoAccion(getCardMeta(CASSANDRA)!)!.indice)).toHaveLength(4)
    expect(s.instances.cass.eterBloqueado).toHaveLength(6)
  })

  it('validActions ofrece 4 bloqueos (no 2) con 2 externos en la carta', () => {
    let s = escenarioCassandra()
    s = poner(s, 'x1', ETER)
    s = poner(s, 'x2', ETER)
    s = { ...s, instances: { ...s.instances, cass: { ...s.instances.cass, eterBloqueado: ['x1', 'x2'] } } }
    etiquetarEterExterno(s, ['x1', 'x2'], 'cass', 'A')

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'cass')
    expect(bloqueos).toHaveLength(4)
  })
})

describe('Éter externo (f) — NO completa un bloqueo_fijo (decisión 2.4, Aurora real)', () => {
  /** Aurora con 3 propios del steal (índice 1) + `externos` extra etiquetados #ext. */
  function auroraCon(propios: number, externos: number): GameState {
    let s = escenarioAurora()
    const idx = efectoBloqueoAccion(getCardMeta(AURORA)!)!.indice
    const pIds = Array.from({ length: propios }, (_, i) => `x${i}`)
    const eIds = Array.from({ length: externos }, (_, i) => `x${propios + i}`)
    s = {
      ...s,
      players: { ...s.players, A: { ...s.players.A, eterReserva: s.players.A.eterReserva.filter((id) => ![...pIds, ...eIds].includes(id)) } },
      instances: { ...s.instances, aur: { ...s.instances.aur, eterBloqueado: [...pIds, ...eIds] } },
    }
    for (const id of pIds) s.instances[id] = { ...s.instances[id], bloqueadoPorEfecto: claveEfecto('aur', idx), pagadoPor: 'A' }
    etiquetarEterExterno(s, eIds, 'aur', 'A')
    return s
  }

  it('3 propios + 1 externo: el externo NO completa una activación (el bloqueo fijo exige 4 propios)', () => {
    const s = auroraCon(3, 0)
    s.instances.x3 = { cardInstanceId: 'x3', cardId: ETER, owner: 'A', bloqueadoPorEfecto: claveExterno('aur'), pagadoPor: 'A' }
    s.instances.aur = { ...s.instances.aur, eterBloqueado: [...(s.instances.aur.eterBloqueado ?? []), 'x3'] }
    // 3 propios + el externo no cuentan como activación de 4: validarBloqueo exige exactamente 4 Éter propios por acción
    expect(validarBloqueo(s, 'A', ['x4', 'x5', 'x6'], 'aur')).toMatch(/exactamente 4/)
  })

  it('sin activación, dispararUmbralBloqueo no hace nada (Fase B: bloqueo_fijo dispara POR ACTIVACIÓN)', () => {
    const s = auroraCon(4, 1)
    dispararUmbralBloqueo(s, crearCtx(), 'aur')
    expect(s.objetivosPendientes ?? []).toEqual([])
  })

  it('activación con 4 propios + 1 externo: arma el robo; el externo ni suma ni resta', () => {
    const idx = efectoBloqueoAccion(getCardMeta(AURORA)!)!.indice
    const s = auroraCon(4, 1)
    dispararUmbralBloqueo(s, crearCtx(), 'aur', idx)
    expect(s.objetivosPendientes?.[0]?.opciones).toContain('rival')
  })
})

describe('Éter externo (d) — jugada completa: FB-005 sobre Aurora (decisión A)', () => {
  it('FB-005 bloquea 1 externo → Aurora roba con 4 propios → Alba libera los 4 y el robo sigue → sin externo regresa', () => {
    let s = escenarioAurora()
    // Pasivo 1A (FB-005) en la zona de pago: solo funciona desde 1A
    s = poner(s, 'pasivo', PASIVO)
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterPagado: ['pasivo'] } } }

    // 1) FB-005 bloquea x7 (Reserva) sobre Aurora → EXTERNO
    s = aplicar(s, { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'aur', eterId: 'x7' })
    expect(s.instances.x7.bloqueadoPorEfecto).toBe(claveExterno('aur'))

    // 2) Aurora roba con 4 propios (x0..x3): el externo NO ocupa el pago exacto
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ['x0', 'x1', 'x2', 'x3'], targetInstanceId: 'aur' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rival' })
    expect(s.players.A.campo.campeones).toContain('rival')
    expect(s.instances.rival.stolenBy).toBe('aur')

    // 3) Alba: se liberan los 4 propios; el externo se queda → el robo NO regresa
    reagruparEfectosBloqueoAlba(s, crearCtx(), 'A')
    expect(s.instances.aur.eterBloqueado).toEqual(['x7'])
    expect(s.players.A.campo.campeones).toContain('rival')
    expect(s.instances.rival.stolenBy).toBe('aur')

    // 4) Sin Éter en Aurora, el robo termina y el campeón vuelve a B
    quitarEteres(s, 'aur', ['x7'])
    evaluarFinSteal(s, crearCtx(), 'aur')
    expect(s.instances.rival.stolenBy).toBeUndefined()
    expect(s.players.B.campo.campeones).toContain('rival')
  })

  it('el externo sobre Cassandra (hasta 4) tampoco ocupa el cupo: 4 propios siguen siendo legales', () => {
    let s = escenarioCassandra()
    s = poner(s, 'pasivo', PASIVO)
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterPagado: ['pasivo'] } } }
    s = aplicar(s, { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass', eterId: 'e6' })
    expect(validarBloqueo(s, 'A', ['e1', 'e2', 'e3', 'e4'], 'cass')).toBeNull()
  })
})
