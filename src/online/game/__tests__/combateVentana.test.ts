// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { cadenaActiva } from '../chain'
import { actorActual, getValidActions } from '../validActions'
import { simularPartida } from '../bot'
import { verificarInvariantes } from '../invariants'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'
import type { Ctx, GameState, PlayerId } from '../types'

// F5c: declarar ataque y declarar bloqueo respetan la pila (§9.6).
// Cartas reales: FB-011 Vaela 5/3 · FB-015 Elena 5/4 · FB-016 Cassandra 3/5 · FB-023 El Reino Perdido (Arcana)
// · FB-025 Primer Juramento (Vínculo).
const VAELA = 'FB-011'
const ELENA = 'FB-015'
const CASSANDRA = 'FB-016'
const ARCANA = 'FB-023'
const VINCULO = 'FB-025'

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
    fase: 'choque',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conCarta(
  s: GameState,
  cardId: string,
  grupo: 'campeones' | 'misticasTacticas' | 'arcanasCombate',
  slot: number,
  owner: PlayerId,
): string {
  const id = `c-${cardId}-${grupo}-${slot}-${owner}`
  s.instances[id] = { cardInstanceId: id, cardId, owner }
  s.players[owner].campo[grupo][slot] = id
  return id
}

function conVinculos(s: GameState, n: number): void {
  for (let i = 0; i < n; i++) {
    const id = `vin-${i}`
    s.instances[id] = { cardInstanceId: id, cardId: VINCULO, owner: 'B' }
    s.players.B.vinculos[i] = id
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Bitácora acumulada por ctx: applyAction entrega los eventos de cada acción en `r.events`. */
const bitacoras = new WeakMap<Ctx, Ctx['events']>()
const eventosDe = (ctx: Ctx): Ctx['events'] => bitacoras.get(ctx) ?? []

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  bitacoras.set(ctx, [...eventosDe(ctx), ...r.events])
  return r.state
}

function pasarHastaCerrar(s: GameState, ctx: Ctx): GameState {
  let estado = s
  for (let i = 0; i < 8 && cadenaActiva(estado); i++) estado = aplicar(estado, { type: 'pasar_prioridad' }, ctx)
  expect(cadenaActiva(estado)).toBeUndefined()
  return estado
}

/** Saca un Campeón del campo (simula el efecto de una respuesta: muerte, rebote, exilio). */
function sacarDelCampo(s: GameState, id: string): void {
  for (const j of ['A', 'B'] as PlayerId[]) {
    s.players[j].campo.campeones = s.players[j].campo.campeones.map((c) => (c === id ? null : c))
  }
}

const idx = (ctx: Ctx, tipo: string): number => eventosDe(ctx).findIndex((e) => e.type === tipo)

/** A ataca con Vaela; B bloquea con Cassandra y tiene una Arcana respondible (gate abierto). */
function escenarioBloqueo(conArcanaB = true) {
  const s = estadoMinimo()
  const atacante = conCarta(s, VAELA, 'campeones', 0, 'A')
  const bloqueador = conCarta(s, CASSANDRA, 'campeones', 0, 'B')
  const arcana = conARCANA(s, conArcanaB)
  return { s, atacante, bloqueador, arcana }
}
/**
 * F5e: responder con la Arcana la PAGA — B recibe `n` Éteres inertes (FB-007) en la Reserva — y su
 * recompensa (robar) ya resuelve: se le da mazo para que robar no lo deje sin cartas y termine la partida.
 */
function conEteresB(s: GameState, n: number): void {
  for (let i = 0; i < n; i++) {
    const id = `eter-B-${i}`
    s.instances[id] = { cardInstanceId: id, cardId: 'FB-007', owner: 'B' }
    s.players.B.eterReserva.push(id)
  }
  for (let i = 0; i < 4; i++) {
    const id = `mz-B-${i}`
    s.instances[id] = { cardInstanceId: id, cardId: 'FB-007', owner: 'B' }
    s.players.B.mazo.push(id)
  }
}
function conARCANA(s: GameState, poner: boolean): string | null {
  if (!poner) return null
  conEteresB(s, 2)
  return conCarta(s, ARCANA, 'arcanasCombate', 0, 'B')
}

describe('declarar ataque abre ventana (F5c)', () => {
  it('la prioridad es del defensor; el ataque sigue vigente y el bloqueo espera a que cierre', () => {
    const ctx = crearCtx()
    const { s, atacante, arcana } = escenarioBloqueo()
    let e = aplicar(s, { type: 'declarar_ataque', atacanteIds: [atacante] }, ctx)
    expect(cadenaActiva(e)?.prioridad).toBe('B')
    expect(actorActual(e)).toBe('B')
    expect(e.combate?.paso).toBe('bloqueo')
    // B responde con su Arcana, A pasa, B pasa: cierra la ventana
    e = aplicar(e, { type: 'responder_cadena', cardInstanceId: arcana! }, ctx)
    expect(getValidActions(e, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(false)
    e = pasarHastaCerrar(e, ctx)
    // tras cerrar, el defensor declara el bloqueo
    expect(actorActual(e)).toBe('B')
    expect(getValidActions(e, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(true)
  })

  it('si una respuesta saca a todos los atacantes, el ataque se anula y el combate se cierra', () => {
    const ctx = crearCtx()
    const { s, atacante } = escenarioBloqueo()
    let e = aplicar(s, { type: 'declarar_ataque', atacanteIds: [atacante] }, ctx)
    sacarDelCampo(e, atacante) // efecto de la respuesta
    e = pasarHastaCerrar(e, ctx)
    expect(e.combate).toBeUndefined()
    expect(idx(ctx, 'bloqueo_declarado')).toBe(-1)
  })

  it('si sobrevive algún atacante el combate sigue con los vigentes', () => {
    const ctx = crearCtx()
    const s = estadoMinimo()
    const a1 = conCarta(s, VAELA, 'campeones', 0, 'A')
    const a2 = conCarta(s, ELENA, 'campeones', 1, 'A')
    conCarta(s, CASSANDRA, 'campeones', 0, 'B')
    conCarta(s, ARCANA, 'arcanasCombate', 0, 'B')
    conEteresB(s, 2)
    let e = aplicar(s, { type: 'declarar_ataque', atacanteIds: [a1, a2] }, ctx)
    sacarDelCampo(e, a1)
    e = pasarHastaCerrar(e, ctx)
    expect(e.combate?.atacantes).toEqual([a2])
    expect(e.combate?.paso).toBe('bloqueo')
  })

  it('gate cerrado (defensor sin respondibles): sin ventana, bloqueo directo como antes', () => {
    const ctx = crearCtx()
    const { s, atacante } = escenarioBloqueo(false)
    const e = aplicar(s, { type: 'declarar_ataque', atacanteIds: [atacante] }, ctx)
    expect(cadenaActiva(e)).toBeUndefined()
    expect(e.combate?.paso).toBe('bloqueo')
    expect(actorActual(e)).toBe('B')
  })
})

describe('declarar bloqueo abre ventana ANTES del daño (F5c)', () => {
  function hastaBloqueo(conArcana = true) {
    const ctx = crearCtx()
    const esc = escenarioBloqueo(conArcana)
    let e = aplicar(esc.s, { type: 'declarar_ataque', atacanteIds: [esc.atacante] }, ctx)
    e = pasarHastaCerrar(e, ctx)
    e = aplicar(e, { type: 'declarar_bloqueo', asignaciones: { [esc.atacante]: esc.bloqueador } }, ctx)
    return { ...esc, e, ctx }
  }

  it('el daño queda pendiente: nadie muere hasta cerrar la cadena; prioridad inicial del defensor (F3)', () => {
    const { e, atacante, bloqueador, ctx } = hastaBloqueo()
    expect(cadenaActiva(e)?.prioridad).toBe('B')
    expect(actorActual(e)).toBe('B')
    expect(e.combate?.paso).toBe('resolucion')
    expect(e.combate?.danoPendiente).toBe(true)
    expect(idx(ctx, 'bloqueo_declarado')).toBeGreaterThan(-1)
    expect(idx(ctx, 'carta_muerta')).toBe(-1)
    expect(e.players.A.campo.campeones).toContain(atacante)
    expect(e.players.B.campo.campeones).toContain(bloqueador)
    // con la ventana abierta no se puede pasar el turno ni romper
    const r = applyAction(e, { type: 'pasar_turno' }, crearCtx())
    expect(r.ok).toBe(false)
  })

  it('orden de eventos: bloqueo_declarado → respuestas/pases → daño', () => {
    const { e, arcana, ctx } = hastaBloqueo()
    const f = pasarHastaCerrar(aplicar(e, { type: 'responder_cadena', cardInstanceId: arcana! }, ctx), ctx)
    const iBloqueo = idx(ctx, 'bloqueo_declarado')
    const iResp = idx(ctx, 'respuesta_encadenada')
    const iMuerte = idx(ctx, 'carta_muerta')
    expect(iBloqueo).toBeLessThan(iResp)
    expect(iResp).toBeLessThan(iMuerte)
    expect(eventosDe(ctx).slice(iBloqueo, iMuerte).some((x) => x.type === 'prioridad_pasada')).toBe(true)
    expect(f.combate?.danoPendiente).toBeUndefined()
  })

  it('sin respuestas, al cerrar la ventana el daño es simultáneo (ambos mueren, 5>=5 y 3>=3)', () => {
    const { e, atacante, bloqueador, ctx } = hastaBloqueo()
    const f = pasarHastaCerrar(e, ctx)
    expect(f.players.A.campo.campeones).not.toContain(atacante)
    expect(f.players.B.campo.campeones).not.toContain(bloqueador)
  })

  it('si una respuesta saca al bloqueador, el atacante no recibe daño y sigue vivo', () => {
    const { e, atacante, bloqueador, ctx } = hastaBloqueo()
    sacarDelCampo(e, bloqueador)
    const f = pasarHastaCerrar(e, ctx)
    expect(f.players.A.campo.campeones).toContain(atacante)
    expect(eventosDe(ctx).some((x) => x.type === 'carta_muerta')).toBe(false)
  })

  it('si una respuesta saca al atacante, el bloqueador no recibe daño y sigue vivo', () => {
    const { e, atacante, bloqueador, ctx } = hastaBloqueo()
    sacarDelCampo(e, atacante)
    const f = pasarHastaCerrar(e, ctx)
    expect(f.players.B.campo.campeones).toContain(bloqueador)
    expect(eventosDe(ctx).some((x) => x.type === 'carta_muerta')).toBe(false)
  })

  it('gate cerrado: sin ventana, el daño se resuelve al declarar el bloqueo (flujo previo)', () => {
    const { e, atacante, bloqueador, ctx } = hastaBloqueo(false)
    expect(cadenaActiva(e)).toBeUndefined()
    expect(e.combate?.danoPendiente).toBeUndefined()
    expect(e.players.A.campo.campeones).not.toContain(atacante)
    expect(e.players.B.campo.campeones).not.toContain(bloqueador)
    expect(idx(ctx, 'bloqueo_declarado')).toBeLessThan(idx(ctx, 'carta_muerta'))
  })

  it('la Ruptura sigue pendiente tras cerrar la ventana y solo se hace una por turno', () => {
    const ctx = crearCtx()
    const s = estadoMinimo()
    const a1 = conCarta(s, VAELA, 'campeones', 0, 'A')
    const a2 = conCarta(s, ELENA, 'campeones', 1, 'A')
    const bloq = conCarta(s, CASSANDRA, 'campeones', 0, 'B')
    conCarta(s, ARCANA, 'arcanasCombate', 0, 'B')
    conEteresB(s, 2)
    conVinculos(s, 3)
    let e = aplicar(s, { type: 'declarar_ataque', atacanteIds: [a1, a2] }, ctx)
    e = pasarHastaCerrar(e, ctx)
    e = aplicar(e, { type: 'declarar_bloqueo', asignaciones: { [a1]: bloq } }, ctx)
    expect(cadenaActiva(e)).toBeDefined()
    expect(getValidActions(e, 'A').some((a) => a.type === 'elegir_ruptura')).toBe(false) // ventana abierta
    e = pasarHastaCerrar(e, ctx)
    const rupturas = getValidActions(e, 'A').filter((a) => a.type === 'elegir_ruptura')
    expect(rupturas.length).toBeGreaterThan(0)
    expect(getValidActions(e, 'A').some((a) => a.type === 'pasar_turno')).toBe(false) // forzosa
    e = aplicar(e, rupturas[0], ctx)
    expect(eventosDe(ctx).filter((x) => x.type === 'ruptura_realizada')).toHaveLength(1)
    expect(getValidActions(e, 'A').some((a) => a.type === 'elegir_ruptura')).toBe(false) // una por turno
    expect(getValidActions(e, 'A').some((a) => a.type === 'pasar_turno')).toBe(true)
  })
})

describe('sin freeze con bots tras F5c', () => {
  const deckA = expandirMazo(ESTASIS_CARDS)
  const deckB = expandirMazo(DISONANCIA_CARDS)
  const seeds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 66099, 66676]

  it.each(seeds)('seed %i: la simulación termina sin error ni invariantes rotas', (seed) => {
    const { estado } = simularPartida(deckA, deckB, seed)
    expect(verificarInvariantes(estado)).toEqual([])
  })

  it.each([21, 22, 23])('seed %i: bots medio/difícil terminan sin error', (seed) => {
    const { estado } = simularPartida(deckA, deckB, seed, 1000, 'medio', 'dificil')
    expect(verificarInvariantes(estado)).toEqual([])
  })
})
