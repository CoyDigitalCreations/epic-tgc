// @vitest-environment node
/**
 * negar (FB-021 Marcha de las Primeras) — REDISEÑO obs 1874: contador de UN
 * SOLO USO sobre la ACTIVACIÓN declarada en la ventana de activar_habilidad.
 *
 * - activar_habilidad (pago YA aplicado) abre VENTANA si el rival tiene
 *   respondibles en campo o PRESTEZA EN MANO → cadena.activacionPendiente.
 * - El rival juega Marcha desde la mano (jugar_respuesta — paga su coste) →
 *   al cerrar la cadena su efecto 'negar' cancela ESA activación (el pago del
 *   activador NO se devuelve, el efecto NO se resuelve) → Marcha al
 *   Cementerio (§5.3, esPermanenteEnMesa ya no la exceptúa).
 * - Sin respuesta (2 pases) → la activación diferida resuelve normalmente.
 * - El candado championNegado se ELIMINÓ: el rival puede volver a activar.
 *
 * Cartas: FB-021 Marcha (Mística Presteza cost 3) · TEST-NEGAR-VICTIMA
 * (Campeón disparo buff +1 ATQ, costo eter:1) · FB-001 Éter Orden.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { statsDe } from '../efectos'
import { etersParaPagar } from '../payments'
import { registrarCartas, esPermanenteEnMesa, getCardMeta } from '../cards'
import type { AnyCard } from '../cards'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const FB021 = 'FB-021' // Mística Presteza, hechizo negar tipoNegacion 'activacion', cost 3
const VICTIMA = 'TEST-NEGAR-VICTIMA' // Campeón disparo buff self +1 ATQ, costo eter:1
const ETER_ORDEN = 'FB-001'

registrarCartas([{
  id: VICTIMA,
  name: 'Víctima de Negación Test',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
  stats: { cost: 2, poder: 2, resistencia: 2 },
  efectos: [{
    tipo: 'disparo',
    efecto: 'buff',
    stats: { ATQ: 1, RES: 0 },
    objetivo: { tipo: 'self', zona: 'campo' },
    costo: { tipo: 'eter', cantidad: 1 },
    texto: 'Puedes pagar 1 Éter: gana +1 ATQ.',
  }],
} as unknown as AnyCard])

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

/** Instancias en la MANO de `owner` (mapa instanceId → cardId). */
function conMano(s: GameState, owner: PlayerId, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner }])))
  return {
    ...conInst,
    players: { ...conInst.players, [owner]: { ...conInst.players[owner], mano: [...conInst.players[owner].mano, ...Object.keys(mapa)] } },
  }
}

/** Éteres de `owner` en Reserva 2A. */
function conEteres(s: GameState, owner: PlayerId, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${ETER_ORDEN}-${owner}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId: ETER_ORDEN, owner }]))),
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

/**
 * Setup canónico: B activa la habilidad de Víctima (turno B); A es el rival,
 * con Marcha en mano (o sin ella según `conMarcha`).
 */
function setupVentana(conMarcha: boolean): { s: GameState; victimaId: string; eterB: string[] } {
  const camp = conCampeon(estadoMinimo(), VICTIMA, 'B', 0)
  const eterB = conEteres(camp.s, 'B', 3)
  let s: GameState = { ...eterB.s, turno: 'B' }
  if (conMarcha) {
    s = conMano(s, 'A', { 'marcha-1': FB021 })
    s = conEteres(s, 'A', 3).s
  }
  return { s, victimaId: camp.id, eterB: eterB.ids }
}

describe('ventana de negación en activar_habilidad (obs 1874)', () => {
  it('con Presteza del rival EN MANO: abre cadena y DIFIERE la activación (pago queda, efecto sin resolver)', () => {
    const { s, victimaId, eterB } = setupVentana(true)
    const ctx = crearCtx()

    const s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(0, 1) }, ctx)

    // Pago YA hecho (pago queda) — 1 Éter a 1A y el Campeón agotado (Paga y Agota, §5.2)
    expect(s2.players.B.eterPagado).toHaveLength(1)
    expect(s2.instances[victimaId].agotado).toBe(true)
    // Ventana abierta con la activación DIFERIDA — efecto AÚN sin resolver
    expect(s2.cadena).toBeTruthy()
    expect(s2.cadena!.prioridad).toBe('A')
    expect(s2.cadena!.activacionPendiente).toMatchObject({ jugador: 'B', cardInstanceId: victimaId })
    expect(statsDe(s2, victimaId).poder).toBe(2) // buff aún pendiente
    // A (con Marcha en mano) puede responder con jugar_respuesta
    const accionesA = getValidActions(s2, 'A')
    const resp = accionesA.find((a) => a.type === 'jugar_respuesta' && a.cardInstanceId === 'marcha-1')
    expect(resp).toBeTruthy()
    expect(accionesA.some((a) => a.type === 'pasar_prioridad')).toBe(true)
  })

  it('SIN respondibles del rival: la activación resuelve directo (comportamiento previo intacto)', () => {
    const { s, victimaId, eterB } = setupVentana(false)
    const ctx = crearCtx()

    const s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(0, 1) }, ctx)

    expect(s2.cadena).toBeUndefined()
    expect(statsDe(s2, victimaId).poder).toBe(3) // buff aplicado de entrada
  })

  it('pases (sin respuesta): la activación diferida resuelve al cerrar la cadena', () => {
    const { s, victimaId, eterB } = setupVentana(true)
    const ctx = crearCtx()
    let s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(0, 1) }, ctx)

    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx) // A pasa
    expect(s2.cadena).toBeTruthy()
    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx) // B pasa → cierra

    expect(s2.cadena).toBeUndefined()
    expect(statsDe(s2, victimaId).poder).toBe(3) // el efecto resolvió
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(false)
  })

  it('Marcha jugada como respuesta: CANCELA la activación (pago queda, Marcha al Cementerio)', () => {
    const { s, victimaId, eterB } = setupVentana(true)
    const ctx = crearCtx()
    let s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(0, 1) }, ctx)

    // A responde jugando Marcha desde la mano (paga 3)
    const pagoMarcha = etersParaPagar(s2, 'A', FB021)!
    s2 = aplicar(s2, { type: 'jugar_respuesta', cardInstanceId: 'marcha-1', eterIds: pagoMarcha }, ctx)
    expect(s2.cadena!.pila).toEqual(['marcha-1'])
    expect(s2.players.A.mano).not.toContain('marcha-1')
    expect(s2.players.A.eterPagado).toHaveLength(3)

    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx) // B pasa
    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx) // A pasa → resuelve (LIFO: Marcha primero)

    // La activación NO se resolvió (fizzled) pero el pago del activador queda
    expect(s2.cadena).toBeUndefined()
    expect(statsDe(s2, victimaId).poder).toBe(2)
    expect(s2.players.B.eterPagado).toHaveLength(1)
    expect(s2.instances[victimaId].agotado).toBe(true) // el agotamiento también es coste: no se devuelve
    // Marcha se consumió: al Cementerio de A (§5.3 un solo uso)
    expect(s2.players.A.cementerio).toContain('marcha-1')
    expect(s2.players.A.campo.misticasTacticas).not.toContain('marcha-1')
    // Evento de contrato emitido
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(true)
  })

  it('SIN candado: tras negar, el coste no se devuelve (sigue agotado) pero al enderezarse PUEDE volver a activar', () => {
    const { s, victimaId, eterB } = setupVentana(true)
    const ctx = crearCtx()
    let s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(0, 1) }, ctx)
    s2 = aplicar(s2, { type: 'jugar_respuesta', cardInstanceId: 'marcha-1', eterIds: etersParaPagar(s2, 'A', FB021)! }, ctx)
    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx)
    s2 = aplicar(s2, { type: 'pasar_prioridad' }, ctx)
    expect(statsDe(s2, victimaId).poder).toBe(2) // negada

    // El mismo turno ya no puede: el agotamiento del coste NO se devuelve al negar la
    // activación (§9.6). Pero NO hay candado persistente: el viejo championNegado ya no
    // existe, así que al enderezarse (Alba) puede activar de nuevo.
    const bloqueada = applyAction(s2, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(1, 2) }, ctx)
    expect(bloqueada.ok).toBe(false)
    s2 = { ...s2, instances: { ...s2.instances, [victimaId]: { ...s2.instances[victimaId], agotado: false } } }
    const r = applyAction(s2, { type: 'activar_habilidad', cardInstanceId: victimaId, eterIds: eterB.slice(1, 2) }, ctx)
    // Sin Marcha en mano de A ni respondibles en campo → resuelve directo
    expect(r.ok).toBe(true)
    if (r.ok) expect(statsDe(r.state, victimaId).poder).toBe(3)
  })
})

describe('Marcha fuera de ventana (jugar_mistica normal)', () => {
  it('FB-021 es de UN SOLO USO: sin activación pendiente hace fizzled y va al Cementerio', () => {
    const ctx = crearCtx()
    // A juega Marcha en su propio forja; B sin respondibles
    let s = conMano(estadoMinimo(), 'A', { 'marcha-1': FB021 })
    s = conEteres(s, 'A', 3).s

    // La excepción 'negar' de esPermanenteEnMesa se eliminó (obs 1874 (a))
    expect(esPermanenteEnMesa(getCardMeta(FB021)!)).toBe(false)

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'marcha-1', slot: 0, eterIds: etersParaPagar(s, 'A', FB021)! }, ctx)

    // Sin ventana/activación pendiente: fizzled, consumida, al Cementerio
    expect(s.players.A.cementerio).toContain('marcha-1')
    expect(s.players.A.campo.misticasTacticas[0]).toBeNull()
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(false)
  })
})
