// @vitest-environment node
/**
 * F5d-1 — la declaración elige SUS objetivos ANTES de abrir la ventana (estilo Yugioh).
 *
 * Toda acción de jugador que arma elecciones de objetivo (triggers de la propia
 * acción, sacrificios con tutor, al-pagar-eter) las resuelve primero; la ventana
 * de respuesta se abre al elegir la última. El elector es el DUEÑO del pendiente
 * (puede ser el rival). Los triggers siguen disparándose INMEDIATOS (apilarlos es F5d-2+).
 * Cartas sintéticas (el motor es genérico, sin cartas reales hardcodeadas).
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions, actorActual } from '../validActions'
import { botTonto, simularPartida } from '../bot'
import { statsDe } from '../efectos'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'

const base = {
  rarity: 'Común',
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
}
const ETER = 'TEST-F5D1-ETER' // Éter inerte (sin efectos)
const CAMP = 'TEST-F5D1-CAMP' // Campeón vainilla cost 1
const INV_OBJ = 'TEST-F5D1-INV' // Campeón: al invocar, un Campeón rival pierde 1 ATQ (elección)
const ATK_OBJ = 'TEST-F5D1-ATK' // Campeón: al atacar, un Campeón rival pierde 1 ATQ (elección)
const CAMP_TUTOR = 'TEST-F5D1-CAMP-TUTOR' // Campeón: al enviarse al Cementerio desde el campo, tutor de mazo (elección)
const SOBERANO = 'TEST-F5D1-SOBERANO' // Campeón que exige 1 sacrificio
const MIST_TUTOR = 'TEST-F5D1-MIST-TUTOR' // Mística: trigger al jugar = tutor (elección) + hechizo draw 1 (opener)
const MIST_DESTROY = 'TEST-F5D1-MIST-DESTROY' // Mística: trigger al jugar = destruir Campeón rival (elección) + hechizo draw 1
const PRESTEZA = 'TEST-F5D1-PRESTEZA' // Mística Presteza cost 1: draw 1

const tutorEfecto = {
  tipo: 'hechizo', trigger: 'al_jugar_mistica', efecto: 'tutor', cantidad: 1,
  objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo', zonaDestino: 'mano', filtros: { costeMax: 2 } },
  texto: 'Tutor.',
}
const roba = { tipo: 'hechizo', efecto: 'draw', cantidad: 1, texto: 'Roba 1.' }
const debuffRival = (trigger: string) => ({
  tipo: 'pasivo', trigger, efecto: 'debuff', stats: { ATQ: 1, RES: 0 },
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' }, texto: 'Un Campeón rival pierde 1 ATQ.',
})

registrarCartas([
  { ...base, id: ETER, name: 'Éter inerte', type: 'Éter', keywords: [], stats: { cost: 1 }, efectos: [] },
  { ...base, id: CAMP, name: 'Campeón', type: 'Campeón', keywords: [], roles: ['Normal'], stats: { cost: 1, poder: 3, resistencia: 3 }, efectos: [] },
  { ...base, id: INV_OBJ, name: 'Invoca con objetivo', type: 'Campeón', keywords: [], roles: ['Normal'], stats: { cost: 1, poder: 3, resistencia: 3 },
    efectos: [debuffRival('al_invocar')] },
  { ...base, id: ATK_OBJ, name: 'Ataca con objetivo', type: 'Campeón', keywords: [], roles: ['Normal'], stats: { cost: 1, poder: 3, resistencia: 3 },
    efectos: [debuffRival('al_atacar')] },
  { ...base, id: CAMP_TUTOR, name: 'Campeón tutor', type: 'Campeón', keywords: [], roles: ['Normal'], stats: { cost: 1, poder: 3, resistencia: 3 },
    efectos: [{ tipo: 'pasivo', efecto: 'tutor', objetivo: { tipo: 'campeon', zonaDestino: 'mano', filtros: { costeMax: 2 } }, stats: { ATQ: 0, RES: 0 },
      trigger: 'al_ser_enviado_al_cementerio', triggerZona: 'campo', zonaOrigen: 'mazo', texto: 'Tutor al morir.' }] },
  { ...base, id: SOBERANO, name: 'Soberano', type: 'Campeón', keywords: [], roles: ['Soberano'], stats: { cost: 1, poder: 4, resistencia: 4 }, efectos: [] },
  { ...base, id: MIST_TUTOR, name: 'Mística tutor', type: 'Mística', keywords: [], stats: { cost: 1 }, efectos: [tutorEfecto, roba] },
  { ...base, id: MIST_DESTROY, name: 'Mística destruir', type: 'Mística', keywords: [], stats: { cost: 1 },
    efectos: [{ tipo: 'hechizo', trigger: 'al_jugar_mistica', efecto: 'destroy', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' }, texto: 'Destruye.' }, roba] },
  { ...base, id: PRESTEZA, name: 'Presteza', type: 'Mística', keywords: ['Presteza'], stats: { cost: 1 }, efectos: [roba] },
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
    version: 1, seed: 7, fase: 'forja' as const, turno: 'A' as const, primerJugador: 'A' as const, primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') }, instances: {},
  } as GameState
}
function inst(s: GameState, id: string, cardId: string, owner: PlayerId): void {
  s.instances[id] = { cardInstanceId: id, cardId, owner } as GameState['instances'][string]
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
function conMazo(s: GameState, owner: PlayerId, ids: string[], cardId = CAMP): void {
  for (const id of ids) {
    inst(s, id, cardId, owner)
    s.players[owner].mazo.push(id)
  }
}
function conCampeon(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number): void {
  inst(s, id, cardId, owner)
  s.players[owner].campo.campeones[slot] = id
}
function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}
function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}
const tipos = (s: GameState, j: PlayerId): string[] => [...new Set(getValidActions(s, j).map((a) => a.type))].sort()

/** B tiene una Presteza pagable en la mano: la ventana SIEMPRE puede abrirse (gate abierto). */
function rivalConPresteza(s: GameState): void {
  conMano(s, 'B', 'prest-B', PRESTEZA)
  conEteres(s, 'B', 1)
}

describe('al-jugar-mistica con elección: se elige ANTES de la ventana', () => {
  function escenario(): GameState {
    const s = estadoMinimo()
    conMano(s, 'A', 'mist', MIST_TUTOR)
    conEteres(s, 'A', 1)
    conMazo(s, 'A', ['tA1', 'tA2', 'tA3'])
    rivalConPresteza(s)
    return s
  }
  const jugar = { type: 'jugar_mistica', cardInstanceId: 'mist', slot: 0, eterIds: ['eter-A-0'] } as const

  it('tras jugar solo queda elegir; al elegir se abre la ventana con el opener al fondo', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), jugar, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener', jugador: 'A', pendientes: 1 })
    expect(actorActual(s)).toBe('A')
    expect(tipos(s, 'A')).toEqual(['elegir_objetivo', 'rendirse'])
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
    expect(applyAction(s, { type: 'pasar_turno' }, ctx).ok).toBe(false)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'tA2' }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.players.A.mano).toEqual(['tA2']) // el trigger resolvió INMEDIATO (no se apila todavía)
    expect(s.cadena?.opener).toMatchObject({ tipo: 'mistica', cardInstanceId: 'mist' })
    expect(s.cadena?.prioridad).toBe('B')
    expect(s.players.A.mazo).toHaveLength(2) // solo el tutor; el hechizo (draw) aún no resolvió
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.players.A.mazo).toHaveLength(1) // el hechizo resuelve ÚLTIMO
  })

  it('sin ventana posible (gate cerrado) elegir resuelve todo de inmediato', () => {
    const s0 = escenario()
    s0.players.B.mano = []
    const ctx = crearCtx()
    let s = aplicar(s0, jugar, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'tA1' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.players.A.mazo).toHaveLength(1) // tutor + hechizo
    expect(s.players.A.cementerio).toContain('mist')
  })

  it('rendirse durante la elección termina la partida', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), jugar, ctx)
    s = aplicar(s, { type: 'rendirse' }, ctx)
    expect(s.fase).toBe('terminada')
    expect(actorActual(s)).toBeNull()
  })
})

describe('jugar_campeon: sacrificio que arma un tutor elige ANTES de la ventana de la invocación', () => {
  function escenario(): GameState {
    const s = estadoMinimo()
    conMano(s, 'A', 'sob', SOBERANO)
    conEteres(s, 'A', 1)
    conCampeon(s, 'A', 'muere', CAMP_TUTOR, 0)
    conMazo(s, 'A', ['tA1', 'tA2'])
    rivalConPresteza(s)
    return s
  }
  const invocar = { type: 'jugar_campeon', cardInstanceId: 'sob', slot: 0, eterIds: ['eter-A-0'], sacrificios: ['muere'] } as const

  it('el tutor del sacrificado se elige antes; la ventana cuenta Presteza de mano pagable', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), invocar, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'invocacion', cardInstanceId: 'sob', pendientes: 1 })
    expect(s.players.A.campo.campeones[0]).toBe('sob') // la invocación ya ocurrió
    expect(tipos(s, 'A')).toEqual(['elegir_objetivo', 'rendirse'])

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'tA1' }, ctx)
    expect(s.players.A.mano).toEqual(['tA1'])
    expect(s.declaracionEnEleccion).toBeUndefined()
    // B solo tiene Presteza en la mano (nada en campo): antes de F5d-1 no habría ventana
    expect(s.cadena).toMatchObject({ origen: 'global', prioridad: 'B', efectoActual: { cardInstanceId: 'sob' } })
    expect(s.cadena?.opener).toBeUndefined()
  })

  it('sin pendientes el flujo no cambia: abre (o no) la ventana de inmediato', () => {
    const s0 = estadoMinimo()
    conMano(s0, 'A', 'c1', CAMP)
    conEteres(s0, 'A', 1)
    rivalConPresteza(s0)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'c1', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena?.prioridad).toBe('B')

    const sinRival = estadoMinimo()
    conMano(sinRival, 'A', 'c1', CAMP)
    conEteres(sinRival, 'A', 1)
    const s2 = aplicar(sinRival, { type: 'jugar_campeon', cardInstanceId: 'c1', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, crearCtx())
    expect(s2.cadena).toBeUndefined()
  })
})

describe('al-invocar con elección (Campeón sintético)', () => {
  function escenario(): GameState {
    const s = estadoMinimo()
    conMano(s, 'A', 'inv', INV_OBJ)
    conEteres(s, 'A', 1)
    conCampeon(s, 'B', 'b1', CAMP, 0)
    conCampeon(s, 'B', 'b2', CAMP, 1)
    rivalConPresteza(s)
    return s
  }
  const invocar = { type: 'jugar_campeon', cardInstanceId: 'inv', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] } as const

  it('el objetivo se elige antes de abrir la ventana; el efecto aplica al elegir', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), invocar, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'invocacion', pendientes: 1 })
    expect(getValidActions(s, 'A').filter((a) => a.type === 'elegir_objetivo')).toHaveLength(2)
    expect(statsDe(s, 'b2').poder).toBe(3)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b2' }, ctx)
    expect(statsDe(s, 'b2').poder).toBe(2)
    expect(s.cadena).toMatchObject({ origen: 'global', prioridad: 'B', efectoActual: { cardInstanceId: 'inv' } })
  })
})

describe('al-atacar con elección: antes de la ventana de combate', () => {
  function escenario(conRespuesta = true): GameState {
    const s = estadoMinimo()
    s.fase = 'choque'
    conCampeon(s, 'A', 'atk', ATK_OBJ, 0)
    conCampeon(s, 'B', 'b1', CAMP, 0)
    conCampeon(s, 'B', 'b2', CAMP, 1)
    if (conRespuesta) rivalConPresteza(s)
    return s
  }

  it('el trigger arma la elección; la ventana del defensor se abre al elegir', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), { type: 'declarar_ataque', atacanteIds: ['atk'] }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.combate?.paso).toBe('bloqueo')
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'ataque', jugador: 'A', pendientes: 1 })
    // el defensor NO puede declarar el bloqueo mientras tanto
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
    expect(tipos(s, 'A')).toEqual(['elegir_objetivo', 'rendirse'])

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(statsDe(s, 'b1').poder).toBe(2)
    expect(s.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' })
  })

  it('sin ventana posible reanuda el combate (bloqueo) al elegir', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(false), { type: 'declarar_ataque', atacanteIds: ['atk'] }, ctx)
    expect(s.declaracionEnEleccion).toBeDefined()
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.combate?.paso).toBe('bloqueo')
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(true)
  })
})

describe('el elector es el dueño del pendiente (puede ser el rival)', () => {
  /** A juega una Mística que destruye un Campeón de B con tutor al morir: A elige el objetivo, B elige el tutor. */
  function escenario(): GameState {
    const s = estadoMinimo()
    conMano(s, 'A', 'mist', MIST_DESTROY)
    conEteres(s, 'A', 1)
    conMazo(s, 'A', ['tA1'])
    conCampeon(s, 'B', 'bT', CAMP_TUTOR, 0)
    conMazo(s, 'B', ['tB1', 'tB2'])
    rivalConPresteza(s)
    return s
  }
  const jugar = { type: 'jugar_mistica', cardInstanceId: 'mist', slot: 0, eterIds: ['eter-A-0'] } as const

  it('actorActual y getValidActions siguen al dueño de cada pendiente; la ventana espera a ambos', () => {
    const ctx = crearCtx()
    let s = aplicar(escenario(), jugar, ctx)
    expect(actorActual(s)).toBe('A')
    expect(s.cadena).toBeUndefined()
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'bT' }, ctx) // A destruye bT → arma el tutor de B

    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener', pendientes: 1 })
    expect(s.cadena).toBeUndefined()
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', trigger: 'al-ser-enviado-al-cementerio' })
    expect(actorActual(s)).toBe('B')
    expect(tipos(s, 'B')).toEqual(['elegir_objetivo', 'rendirse'])
    expect(getValidActions(s, 'A').map((a) => a.type)).toEqual(['rendirse'])
    // B (no el turno del activo) puede elegir: la validación sigue al dueño del pendiente
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'tB2' }, ctx)
    expect(s.players.B.mano).toContain('tB2')
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena?.opener).toMatchObject({ tipo: 'mistica', cardInstanceId: 'mist' })
  })

  it('visibleState muestra al rival elector las opciones de su pendiente', async () => {
    const { visibleState } = await import('../visibleState')
    const ctx = crearCtx()
    let s = aplicar(escenario(), jugar, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'bT' }, ctx)
    const vistaB = visibleState(s, 'B')
    for (const id of s.objetivosPendientes![0].opciones) expect(vistaB.instances[id].cardId).not.toBeNull()
    const vistaA = visibleState(s, 'A')
    for (const id of s.objetivosPendientes![0].opciones) expect(vistaA.instances[id].cardId).toBeNull()
  })
})

describe('varias elecciones seguidas, pendientes obsoletos y al-pagar-eter', () => {
  it('pendientes viejos de la cola NO bloquean la apertura de la ventana', () => {
    const s0 = estadoMinimo()
    conMano(s0, 'A', 'inv', INV_OBJ)
    conEteres(s0, 'A', 1)
    conCampeon(s0, 'B', 'b1', CAMP, 0)
    rivalConPresteza(s0)
    // obsoleto: pendiente viejo de otro turno que nadie eligió
    s0.objetivosPendientes = [{ jugador: 'A', instId: 'viejo', trigger: 'al-atacar', opciones: ['b1'] }]
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'inv', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, ctx)
    expect(s.objetivosPendientes).toHaveLength(2)
    expect(s.declaracionEnEleccion?.pendientes).toBe(1)
    expect(s.objetivosPendientes![0].instId).toBe('inv') // el de la acción va al frente
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.cadena).toBeDefined() // la ventana abre aunque el obsoleto siga en la cola
    expect(s.objetivosPendientes).toHaveLength(1)
    expect(s.objetivosPendientes![0].instId).toBe('viejo')
  })

  it('sin pendientes nuevos (solo obsoletos) la ventana abre de inmediato', () => {
    const s0 = estadoMinimo()
    conMano(s0, 'A', 'c1', CAMP)
    conEteres(s0, 'A', 1)
    rivalConPresteza(s0)
    s0.objetivosPendientes = [{ jugador: 'A', instId: 'viejo', trigger: 'al-atacar', opciones: ['c1'] }]
    const s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'c1', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, crearCtx())
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toBeDefined()
  })

  it('dos elecciones seguidas (al-pagar-eter + al-invocar): la ventana abre tras la última', () => {
    const s0 = estadoMinimo()
    conMano(s0, 'A', 'inv', INV_OBJ)
    conEteres(s0, 'A', 1)
    conCampeon(s0, 'A', 'a1', CAMP, 1)
    conCampeon(s0, 'B', 'b1', CAMP, 0)
    rivalConPresteza(s0)
    // Éter de pago con trigger al-pagar-eter (buff a un Campeón propio): elección DE LA ACCIÓN
    registrarCartas([{ ...base, id: 'TEST-F5D1-ETER-PAGO', name: 'Éter con gatillo', type: 'Éter', keywords: [], stats: { cost: 1 },
      efectos: [{ tipo: 'pago', trigger: 'al_pagar_eter', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, duracion: 'turno',
        objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, texto: 'Buff.' }] }] as unknown as AnyCard[])
    s0.instances['eter-A-0']!.cardId = 'TEST-F5D1-ETER-PAGO'
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'inv', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, ctx)
    expect(s.declaracionEnEleccion?.pendientes).toBe(2)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a1' }, ctx)
    expect(statsDe(s, 'a1').poder).toBe(4)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion?.pendientes).toBe(1)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toBeDefined()
  })

  it('pendiente sin opciones vivas: se ofrece igual (no atasca) y la ventana abre', () => {
    const s0 = estadoMinimo()
    conMano(s0, 'A', 'inv', INV_OBJ)
    conEteres(s0, 'A', 1)
    conCampeon(s0, 'B', 'b1', CAMP, 0)
    rivalConPresteza(s0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'inv', slot: 0, eterIds: ['eter-A-0'], sacrificios: [] }, ctx)
    delete s.instances['b1'] // la opción desaparece antes de elegir
    const acciones = getValidActions(s, 'A').filter((a) => a.type === 'elegir_objetivo')
    expect(acciones).toEqual([{ type: 'elegir_objetivo', objetivoId: 'b1' }])
    expect(botTonto(s, 'A')).toEqual(acciones[0])
    s = aplicar(s, acciones[0], ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
  })

  it('equiparPendiente conserva su prioridad (la declaración empieza al resolver el equipo)', () => {
    const s0 = estadoMinimo()
    s0.equiparPendiente = { artefactoId: 'x', jugador: 'A', contexto: 'jugar_mistica' }
    expect(s0.declaracionEnEleccion).toBeUndefined()
    expect(actorActual(s0)).toBe('A')
  })
})

describe('el bot no se atasca con declaraciones en elección', () => {
  it.each([1, 7, 42, 66099, 66676])('seed %i: la partida simulada termina sin "sin progreso"', (seed) => {
    const r = simularPartida(expandirMazo(ESTASIS_CARDS), expandirMazo(DISONANCIA_CARDS), seed)
    expect(r.estado.fase).toBe('terminada')
  })

  it('botTonto elige con el actor correcto (el dueño del pendiente), no con state.turno', () => {
    const s0 = estadoMinimo()
    s0.declaracionEnEleccion = { tipo: 'opener', jugador: 'A', pendientes: 1, opener: { tipo: 'mistica', jugador: 'A', cardInstanceId: 'm' } }
    s0.objetivosPendientes = [{ jugador: 'B', instId: 'x', trigger: 'al-ser-enviado-al-cementerio', opciones: ['o1'] }]
    inst(s0, 'o1', CAMP, 'B')
    expect(botTonto(s0, 'A')).toBeNull()
    expect(botTonto(s0, 'B')).toEqual({ type: 'elegir_objetivo', objetivoId: 'o1' })
  })
})
