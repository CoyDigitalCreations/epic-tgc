// @vitest-environment node
/**
 * F5b — el opener de la pila resuelve ÚLTIMO (LIFO real) para jugar Mística,
 * activar Arcana y activar habilidad.
 *
 * - El costo y el estado "ya aplicado" (pago, slot, volteo, 1/turno) ocurren al
 *   declarar; el EFECTO (hechizos) se difiere al fondo de la pila (cadena.opener)
 *   y resuelve al cierre, DESPUÉS de las respuestas.
 * - Gate de apertura: solo si el rival puede responder (campo, o Mística Presteza
 *   de la mano que PUEDA pagar). Gate cerrado → resuelve de inmediato.
 * - Los objetivos se eligen ANTES de abrir la ventana.
 * - Un solo uso → Cementerio al resolver (o al negarse), no al declarar.
 *
 * Verificación del orden: el efecto de las cartas de prueba es `draw 1`; el
 * evento carta_robada trae el jugador, así que el orden de los robos delata el
 * orden de resolución.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { statsDe } from '../efectos'
import { etersParaPagar } from '../payments'
import { abrirCadena, respondiblesDe } from '../chain'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const FB021 = 'FB-021' // Marcha: Mística Presteza cost 3, negar 'activacion'
const ETER = 'FB-001'

const base = {
  rarity: 'Común',
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
}
const ROBA_MIST = 'TEST-F5B-ROBA-MIST' // Mística un solo uso, cost 1, hechizo draw 1
const PRESTEZA = 'TEST-F5B-PRESTEZA' // Mística Presteza cost 1, hechizo draw 1
const BUFF_OBJ = 'TEST-F5B-BUFF-OBJ' // Mística cost 1, hechizo buff +1 ATQ sobre un Campeón propio (elección)
const ROBA_ARC = 'TEST-F5B-ROBA-ARC' // Arcana cost 1, recompensa draw 1
const CAMP_ROBA = 'TEST-F5B-CAMP-ROBA' // Campeón: Disparo, paga 1 Éter → draw 1
const CAMP = 'TEST-F5B-CAMP' // Campeón vainilla

registrarCartas([
  { ...base, id: ROBA_MIST, name: 'Roba Mística', type: 'Mística', keywords: [], stats: { cost: 1 },
    efectos: [{ tipo: 'hechizo', efecto: 'draw', cantidad: 1, texto: 'Roba 1.' }] },
  { ...base, id: PRESTEZA, name: 'Roba Presteza', type: 'Mística', keywords: ['Presteza'], stats: { cost: 1 },
    efectos: [{ tipo: 'hechizo', efecto: 'draw', cantidad: 1, texto: 'Roba 1.' }] },
  { ...base, id: BUFF_OBJ, name: 'Buff con objetivo', type: 'Mística', keywords: [], stats: { cost: 1 },
    efectos: [{ tipo: 'hechizo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, texto: '+1 ATQ.' }] },
  { ...base, id: ROBA_ARC, name: 'Roba Arcana', type: 'Arcana', keywords: [], stats: { cost: 1 },
    efectos: [{ tipo: 'hechizo', efecto: 'draw', cantidad: 1, texto: 'Roba 1.' }] },
  { ...base, id: CAMP_ROBA, name: 'Campeón Roba', type: 'Campeón', keywords: [], stats: { cost: 2, poder: 2, resistencia: 2 },
    efectos: [{ tipo: 'disparo', efecto: 'draw', cantidad: 1, costo: { tipo: 'eter', cantidad: 1 }, texto: 'Paga 1 Éter: roba 1.' }] },
  { ...base, id: CAMP, name: 'Campeón vainilla', type: 'Campeón', keywords: [], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [] },
] as unknown as AnyCard[])

function estadoMinimo(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [] as string[],
    mazo: [] as string[],
    cementerio: [] as string[],
    exilio: [] as string[],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
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
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  } as GameState
}

function inst(s: GameState, id: string, cardId: string, owner: PlayerId, extra: Record<string, unknown> = {}): void {
  s.instances[id] = { cardInstanceId: id, cardId, owner, ...extra } as GameState['instances'][string]
}
function conMano(s: GameState, owner: PlayerId, id: string, cardId: string): void {
  inst(s, id, cardId, owner)
  s.players[owner].mano.push(id)
}
function conEteres(s: GameState, owner: PlayerId, n: number): string[] {
  const ids = Array.from({ length: n }, (_, i) => `eter-${owner}-${i}`)
  for (const id of ids) inst(s, id, ETER, owner)
  s.players[owner].eterReserva.push(...ids)
  return ids
}
function conMazo(s: GameState, owner: PlayerId, n = 3): void {
  for (let i = 0; i < n; i++) {
    inst(s, `mz-${owner}-${i}`, ETER, owner)
    s.players[owner].mazo.push(`mz-${owner}-${i}`)
  }
}
function conCampeon(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number): void {
  inst(s, id, cardId, owner)
  s.players[owner].campo.campeones[slot] = id
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
const robos = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'carta_robada').map((e) => (e as { jugador: PlayerId }).jugador)

/** A (turno) con una Mística de robo en mano; ambos con mazo. */
function escenarioMistica(): GameState {
  const s = estadoMinimo()
  conMano(s, 'A', 'roba-1', ROBA_MIST)
  conEteres(s, 'A', 1)
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}
const jugarRoba = { type: 'jugar_mistica', cardInstanceId: 'roba-1', slot: 0, eterIds: ['eter-A-0'] } as const

describe('Mística: el opener resuelve ÚLTIMO (LIFO)', () => {
  it('con Presteza pagable del rival en mano: abre ventana, el efecto sigue pendiente y la Mística sigue en su slot', () => {
    const s0 = escenarioMistica()
    conMano(s0, 'B', 'prest-1', PRESTEZA)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    const s = aplicar(s0, jugarRoba, ctx)

    expect(s.cadena?.opener).toMatchObject({ tipo: 'mistica', jugador: 'A', cardInstanceId: 'roba-1' })
    expect(s.cadena?.efectoActual?.cardInstanceId).toBe('roba-1') // informativo, sigue mostrando al opener
    expect(s.cadena?.prioridad).toBe('B')
    expect(robos(ctx)).toEqual([]) // el efecto NO resolvió al declarar
    // estado "ya aplicado": en su slot, con entradaEsteTurno; el cementerio espera a la resolución
    expect(s.players.A.campo.misticasTacticas[0]).toBe('roba-1')
    expect(s.instances['roba-1'].entradaEsteTurno).toBe(true)
    expect(s.players.A.cementerio).not.toContain('roba-1')
  })

  it('B responde con Presteza: resuelve la respuesta PRIMERO y el opener ÚLTIMO; un solo uso va al Cementerio al resolver', () => {
    const s0 = escenarioMistica()
    conMano(s0, 'B', 'prest-1', PRESTEZA)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, jugarRoba, ctx)

    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'prest-1', eterIds: etersParaPagar(s, 'B', PRESTEZA)! }, ctx)
    expect(s.cadena?.pila).toEqual(['prest-1'])
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // A pasa
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // B pasa → cierra

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['B', 'A']) // LIFO: la respuesta antes que el opener
    expect(s.players.A.cementerio).toContain('roba-1')
    expect(s.players.A.campo.misticasTacticas[0]).toBeNull()
    expect(s.players.B.cementerio).toContain('prest-1')
  })

  it('el opener puede ser NEGADO por la respuesta: no resuelve, el pago se mantiene y la Mística va al Cementerio', () => {
    const s0 = escenarioMistica()
    conMano(s0, 'B', 'marcha-1', FB021)
    conEteres(s0, 'B', 3)
    const ctx = crearCtx()
    let s = aplicar(s0, jugarRoba, ctx)
    expect(s.cadena?.opener).toBeTruthy()

    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'marcha-1', eterIds: etersParaPagar(s, 'B', FB021)! }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual([]) // A no robó: opener negado
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(true)
    expect(s.players.A.cementerio).toContain('roba-1')
    expect(s.players.B.cementerio).toContain('marcha-1')
  })

  it('gate cerrado (el rival no puede responder): resuelve de inmediato y va al Cementerio', () => {
    const ctx = crearCtx()
    const s = aplicar(escenarioMistica(), jugarRoba, ctx)

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['A'])
    expect(s.players.A.cementerio).toContain('roba-1')
    expect(s.players.A.campo.misticasTacticas[0]).toBeNull()
  })

  it('Presteza en mano que el rival NO puede pagar NO abre la ventana', () => {
    const s0 = escenarioMistica()
    conMano(s0, 'B', 'prest-1', PRESTEZA) // cuesta 1 y B no tiene Éter
    const ctx = crearCtx()
    const s = aplicar(s0, jugarRoba, ctx)

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['A'])
  })

  it('el opener no se responde a sí mismo (queda fuera de respondiblesDe)', () => {
    const s0 = escenarioMistica()
    conMano(s0, 'B', 'prest-1', PRESTEZA)
    conEteres(s0, 'B', 1)
    inst(s0, 'campB', CAMP, 'B')
    const ctx = crearCtx()
    const s = aplicar(s0, jugarRoba, ctx)
    expect(respondiblesDe(s, 'A')).not.toContain('roba-1')
  })
})

describe('Mística con objetivo: se elige ANTES de abrir la ventana', () => {
  function escenarioObjetivo(): GameState {
    const s = estadoMinimo()
    conMano(s, 'A', 'buff-1', BUFF_OBJ)
    conEteres(s, 'A', 1)
    // F5d-1: el Éter de pago es INERTE (DS-002): FB-001 arma una elección al-pagar-eter que ahora
    // también es de la acción y ensuciaría el conteo de pendientes de este escenario
    s.instances['eter-A-0']!.cardId = 'DS-002'
    conCampeon(s, 'A', 'cA0', CAMP, 0)
    conCampeon(s, 'A', 'cA1', CAMP, 1)
    conMano(s, 'B', 'prest-1', PRESTEZA)
    conEteres(s, 'B', 1)
    conMazo(s, 'A')
    conMazo(s, 'B')
    return s
  }
  const jugarBuff = { type: 'jugar_mistica', cardInstanceId: 'buff-1', slot: 0, eterIds: ['eter-A-0'] } as const

  it('al declarar queda la elección pendiente (sin ventana); al elegir se abre con el payload completo y resuelve al cierre', () => {
    const ctx = crearCtx()
    let s = aplicar(escenarioObjetivo(), jugarBuff, ctx)

    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener', opener: { tipo: 'mistica', cardInstanceId: 'buff-1' } })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'buff-1', opener: { efectoIdx: 0 } })
    // mientras tanto solo se puede elegir (y rendirse)
    const tipos = new Set(getValidActions(s, 'A').map((a) => a.type))
    expect([...tipos].sort()).toEqual(['elegir_objetivo', 'rendirse'])
    const bloqueada = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(bloqueada.ok).toBe(false)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'cA1' }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena?.opener).toMatchObject({ tipo: 'mistica', objetivos: { 0: 'cA1' } })
    expect(statsDe(s, 'cA1').poder).toBe(2) // el efecto todavía no resolvió

    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // B pasa
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // A pasa → cierra
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'cA1').poder).toBe(3)
    expect(statsDe(s, 'cA0').poder).toBe(2)
    expect(s.players.A.cementerio).toContain('buff-1')
  })

  it('sin ventana (gate cerrado): elegir el objetivo resuelve el efecto de inmediato', () => {
    const s0 = escenarioObjetivo()
    s0.players.B.mano = []
    const ctx = crearCtx()
    let s = aplicar(s0, jugarBuff, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'cA0' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'cA0').poder).toBe(3)
    expect(s.players.A.cementerio).toContain('buff-1')
  })
})

describe('Arcana: el opener resuelve ÚLTIMO', () => {
  function escenarioArcana(): GameState {
    const s = estadoMinimo()
    inst(s, 'arc-1', ROBA_ARC, 'A', { bocaArriba: false })
    s.players.A.campo.arcanasCombate[0] = 'arc-1'
    conEteres(s, 'A', 1)
    conMazo(s, 'A')
    conMazo(s, 'B')
    return s
  }
  const activar = { type: 'activar_arcana', cardInstanceId: 'arc-1', slot: 0, eterIds: ['eter-A-0'] } as const

  it('con ventana abierta: paga y voltea al declarar; la recompensa y el Cementerio llegan al cierre', () => {
    const s0 = escenarioArcana()
    conMano(s0, 'B', 'prest-1', PRESTEZA)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, activar, ctx)

    expect(s.cadena?.opener).toMatchObject({ tipo: 'arcana', jugador: 'A', cardInstanceId: 'arc-1' })
    expect(s.instances['arc-1'].bocaArriba).toBe(true)
    expect(s.players.A.eterPagado).toHaveLength(1)
    expect(s.players.A.campo.arcanasCombate[0]).toBe('arc-1')
    expect(robos(ctx)).toEqual([])

    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'prest-1', eterIds: etersParaPagar(s, 'B', PRESTEZA)! }, ctx)
    // el opener tampoco se ofrece como respuesta propia aunque ya esté boca arriba
    expect(respondiblesDe(s, 'A')).not.toContain('arc-1')
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['B', 'A'])
    expect(s.players.A.cementerio).toContain('arc-1')
    expect(s.players.A.campo.arcanasCombate[0]).toBeNull()
  })

  it('gate cerrado: resuelve de inmediato y la Arcana va al Cementerio', () => {
    const ctx = crearCtx()
    const s = aplicar(escenarioArcana(), activar, ctx)
    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['A'])
    expect(s.players.A.cementerio).toContain('arc-1')
  })
})

describe('Habilidad: el opener resuelve ÚLTIMO', () => {
  function escenarioHabilidad(): GameState {
    const s = estadoMinimo()
    conCampeon(s, 'A', 'cA0', CAMP_ROBA, 0)
    conEteres(s, 'A', 2)
    conMazo(s, 'A')
    conMazo(s, 'B')
    conMano(s, 'B', 'prest-1', PRESTEZA)
    conEteres(s, 'B', 1)
    return s
  }

  it('el efecto de la habilidad se resuelve tras la respuesta (B roba antes que A)', () => {
    const ctx = crearCtx()
    let s = aplicar(escenarioHabilidad(), { type: 'activar_habilidad', cardInstanceId: 'cA0', eterIds: ['eter-A-0'] }, ctx)
    expect(s.cadena?.opener).toMatchObject({ tipo: 'habilidad', jugador: 'A', cardInstanceId: 'cA0' })
    expect(s.players.A.eterPagado).toHaveLength(1) // el pago se aplicó al declarar
    expect(robos(ctx)).toEqual([])

    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'prest-1', eterIds: etersParaPagar(s, 'B', PRESTEZA)! }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)

    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['B', 'A'])
    expect(s.players.A.campo.campeones[0]).toBe('cA0') // la habilidad no consume al Campeón
  })

  it('gate cerrado (Presteza no pagable): resuelve de inmediato', () => {
    const s0 = escenarioHabilidad()
    s0.players.B.eterReserva = []
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'cA0', eterIds: ['eter-A-0'] }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(robos(ctx)).toEqual(['A'])
  })
})

describe('Gate de combate: cuenta la mano Presteza pagable', () => {
  function conCombate(): GameState {
    const s = estadoMinimo()
    s.fase = 'choque'
    s.combate = { paso: 'ataque', atacantes: [], bloqueos: {}, rupturaDisponible: false, rupturaUsadaEsteTurno: false }
    conMano(s, 'B', 'prest-1', PRESTEZA)
    return s
  }
  it('abre si el rival puede pagar su Presteza', () => {
    const s = conCombate()
    conEteres(s, 'B', 1)
    expect(abrirCadena(s, 'B')).toBe(true)
    expect(s.cadena?.origen).toBe('combate')
  })
  it('no abre si no puede pagarla', () => {
    const s = conCombate()
    expect(abrirCadena(s, 'B')).toBe(false)
    expect(s.cadena).toBeUndefined()
  })
})
