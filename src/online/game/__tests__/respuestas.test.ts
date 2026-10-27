// @vitest-environment node
/**
 * F5e — modelo de respuestas. Toda respuesta (jugar_respuesta desde la mano, responder_cadena con
 * una carta del campo) con objetivo lo ELIGE AL RESPONDER, antes de entrar a la pila (decisión 8,
 * estilo Yugioh); el elector es quien responde. La Arcana respondida paga su coste; global y combate
 * comparten UN resolvedor (LIFO); la velocidad (normal < Presteza < Fugaz) la define el meta de
 * cualquier tipo de carta. Usa el set de prueba PR-xxx (helpers/cartasPrueba.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { cadenaActiva, motivoNoResponde, respondiblesDe, respuestasDeMano } from '../chain'
import { etersParaPagar } from '../payments'
import { statsDe, velocidadDe } from '../efectos'
import { visibleState } from '../visibleState'
import { botTonto, simularPartida } from '../bot'
import { verificarInvariantes, verificarZonaUnica } from '../invariants'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'
import type { Action } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  PR, cargarCartasPrueba, mazoPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
  conMistica, conArcana,
} from './helpers/cartasPrueba'
import { createInitialState } from '../initialState'

beforeAll(() => {
  cargarCartasPrueba()
})

const evs = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const tipos = (s: GameState, j: 'A' | 'B') => getValidActions(s, j).map((a) => a.type)
const pagoDe = (s: GameState, j: 'A' | 'B', cardId: string) => etersParaPagar(s, j, cardId)!

function base(fase: GameState['fase'] = 'forja'): GameState {
  const s = escenaVacia(fase)
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/** A juega Rayo (PR-040) sobre b0 (ventana abierta, prioridad de B); a0 es de A. B tiene `resp` en mano. */
function rayoVs(respuesta: string, eteresB: number, extra?: (s: GameState) => void): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'A', 'a0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conMano(s0, 'B', 'resp', respuesta)
  conEteres(s0, 'B', eteresB)
  extra?.(s0)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
  return { s, ctx }
}

/** B responde con la Presteza con objetivo (PR-042) y queda eligiendo. */
function respondiendoDebil(): { s: GameState; ctx: Ctx } {
  const { s: s1, ctx } = rayoVs(PR.PRESTEZA_DEBIL, 1)
  const s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s1, 'B', PR.PRESTEZA_DEBIL) }, ctx)
  return { s, ctx }
}

describe('respuesta con objetivo: se elige al responder (F5e)', () => {
  it('el rival ve la pila con el objetivo YA fijado, y la respuesta visible antes de entrar', () => {
    const { s: enEleccion, ctx } = respondiendoDebil()
    // mientras elige, A ya ve la carta declarada (pagada y fuera de la mano), aún sin estar en la pila
    expect(visibleState(enEleccion, 'A').instances['resp'].cardId).toBe(PR.PRESTEZA_DEBIL)
    const s = aplicar(enEleccion, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    const vistaA = visibleState(s, 'A')
    expect(vistaA.cadena?.pila).toEqual(['resp'])
    expect(vistaA.instances['resp'].cardId).toBe(PR.PRESTEZA_DEBIL)
    expect(vistaA.cadena?.respuestas?.['resp']?.objetivos).toEqual({ 0: 'a0' })
    expect(vistaA.cadena?.prioridad).toBe('A') // ahora A decide si responde o pasa
    expect(actorActual(s)).toBe('A')
  })

  it('el elector es quien responde: actorActual, getValidActions y validación', () => {
    const { s, ctx } = respondiendoDebil()
    expect(s.cadena?.prioridad).toBe('B') // la prioridad no alterna hasta que la respuesta entre
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').map((a) => a.type).sort()).toEqual(['elegir_objetivo', 'rendirse'])
    expect(getValidActions(s, 'B').find((a) => a.type === 'elegir_objetivo')).toEqual({ type: 'elegir_objetivo', objetivoId: 'a0' })
    expect(tipos(s, 'A')).toEqual(['rendirse']) // A (el activo) no puede hacer nada
    // nada de responder, pasar ni seguir jugando hasta elegir
    for (const accion of [
      { type: 'pasar_prioridad' }, { type: 'responder_cadena', cardInstanceId: 'x' },
      { type: 'jugar_respuesta', cardInstanceId: 'x', eterIds: [] }, { type: 'pasar_turno' },
    ] as Action[]) {
      const r = applyAction(s, accion, ctx)
      expect(r.ok, accion.type).toBe(false)
    }
    // un objetivo fuera de las opciones se rechaza
    expect(applyAction(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx).ok).toBe(false)
    expect(applyAction(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx).ok).toBe(true)
  })

  it('rendirse durante la elección: lo decide quien se rinde (el rival activo también puede)', () => {
    const { s, ctx } = respondiendoDebil()
    const rindeB = aplicar(s, { type: 'rendirse', jugador: 'B' }, ctx)
    expect(rindeB).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'rendicion' })
    const rindeA = aplicar(s, { type: 'rendirse', jugador: 'A' }, crearCtx())
    expect(rindeA).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
  })

  it('objetivo que desaparece antes de resolver: el efecto se pierde y nada se atasca', () => {
    const { s: enEleccion, ctx } = respondiendoDebil()
    let s = aplicar(enEleccion, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    // a0 sale del campo antes de resolver (p. ej. otro efecto)
    s.players.A.campo.campeones[0] = null
    s.players.A.cementerio.push('a0')
    s = cerrar(s, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.instances['a0'].modificadores ?? []).toHaveLength(0) // nada se aplicó al caído
    expect(s.players.B.cementerio).toContain('resp') // la Mística se consume igual
    expect(s.fase).toBe('forja')
    expect(tipos(s, 'A')).toContain('pasar_turno')
  })

  it('sin objetivos disponibles al responder: la respuesta entra de inmediato y su efecto se pierde (sin pendiente tardío)', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s, 'B', PR.PRESTEZA_DEBIL) }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined() // A no tiene Campeones: no hay nada que elegir
    expect(s.cadena?.pila).toEqual(['resp'])
    // llega un Campeón de A antes de resolver: NO se abre una elección tardía
    conCampeon(s, 'A', 'a1', PR.PEON, 0)
    s = cerrar(s, ctx)
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(statsDe(s, 'a1').poder).toBe(2)
  })

  it('el pago de la respuesta dispara al-pagar-eter de inmediato: sus elecciones van ANTES de la del objetivo de la respuesta', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
    conEteres(s0, 'B', 1, PR.ETER_BUFF) // al pagar: buff a un Campeón propio
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s, 'B', PR.PRESTEZA_DEBIL) }, ctx)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta', pendientes: 2 })
    expect(s.objetivosPendientes?.map((p) => p.instId)).toEqual(['eter-B-0', 'resp']) // el del Éter pagado primero, luego el de la respuesta
    expect(s.objetivosPendientes?.map((p) => p.trigger)).toEqual(['al-pagar-eter', 'ninguno'])
    expect(s.cadena?.pila).toEqual([])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // gatillo del Éter
    expect(s.cadena?.pila).toEqual([]) // todavía falta el objetivo de la respuesta
    expect(statsDe(s, 'b0').poder).toBe(3)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx) // objetivo de la respuesta
    expect(s.cadena?.pila).toEqual(['resp'])
    s = cerrar(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0)
  })

  it('dos respuestas con objetivo en cadena: cada una elige al responder y resuelven en LIFO (la última primero)', () => {
    const { s: s1, ctx } = rayoVs(PR.PRESTEZA_DEBIL, 1, (s0) => {
      conMano(s0, 'A', 'resA', PR.PRESTEZA_DEBIL) // A también tiene una Presteza con objetivo y un Éter libre
      conEteres(s0, 'A', 1)
    })
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s1, 'B', PR.PRESTEZA_DEBIL) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx) // B debilita a a0
    expect(s.cadena).toMatchObject({ pila: ['resp'], prioridad: 'A' })
    // A responde a la Presteza de B con la suya: elige SU objetivo (b0) antes de que entre
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resA', eterIds: pagoDe(s, 'A', PR.PRESTEZA_DEBIL) }, ctx)
    expect(actorActual(s)).toBe('A')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'resA', opciones: ['b0'] })
    expect(s.cadena?.pila).toEqual(['resp'])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.cadena).toMatchObject({ pila: ['resp', 'resA'], prioridad: 'B' })
    expect(s.cadena?.respuestas).toMatchObject({ resp: { objetivos: { 0: 'a0' } }, resA: { objetivos: { 0: 'b0' } } })
    s = cerrar(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0)
    // b0 murió por el Rayo (la jugada que abrió la cadena, la última en resolver). Al llegar al Cementerio vuelve a ser una
    // carta nueva: ya no arrastra el debuff de resA (antes se leía el 0 de una carta muerta)
    expect(s.players.B.cementerio).toContain('b0')
    expect(statsDe(s, 'b0').poder).toBe(2)
    expect(s.players.A.cementerio).toEqual(expect.arrayContaining(['resA', 'rayo']))
    expect(s.players.B.cementerio).toContain('resp')
  })
})

describe('respuesta con Arcana: paga su coste y resuelve en la pila (F5e)', () => {
  function conPacto(eteres: number, mazo = 4): { s: GameState; ctx: Ctx } {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conArcana(s0, 'B', 'pacto', PR.PACTO, 0)
    conMano(s0, 'B', 'relleno', PR.PEON) // F5f: PR-060 exige ≥1 carta en mano para activarse (también al responder)
    if (eteres > 0) conEteres(s0, 'B', eteres)
    conMazo(s0, 'B', mazo)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    return { s, ctx }
  }

  it('sin Éter para pagar su coste la Arcana no es respondible (ni cuenta para abrir la ventana)', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conArcana(s0, 'B', 'pacto', PR.PACTO, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    expect(s.declaracionEnEleccion).toBeDefined()
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.cadena).toBeUndefined() // gate cerrado: el rival no puede responder
    expect(s.players.B.campo.campeones[0]).toBeNull() // el Rayo resolvió
  })

  it('responder_cadena con eterIds paga exactamente esos Éteres; un pago inválido se rechaza', () => {
    const { s, ctx } = conPacto(3)
    const eteres = s.players.B.eterReserva
    expect(applyAction(s, { type: 'responder_cadena', cardInstanceId: 'pacto', eterIds: [eteres[0]] }, ctx).ok).toBe(false) // insuficiente
    expect(applyAction(s, { type: 'responder_cadena', cardInstanceId: 'pacto', eterIds: eteres }, ctx).ok).toBe(false) // sobrepago
    const r = applyAction(s, { type: 'responder_cadena', cardInstanceId: 'pacto', eterIds: [eteres[2], eteres[1]] }, ctx)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.players.B.eterPagado).toEqual([eteres[2], eteres[1]])
      expect(r.state.players.B.eterReserva).toEqual([eteres[0]])
    }
  })

  it('la Arcana paga al responder, su recompensa resuelve al cerrar (LIFO, antes que el Rayo) y va a 2G', () => {
    const { s: s1, ctx } = conPacto(2)
    const mano = s1.players.B.mano.length
    let s = aplicar(s1, { type: 'responder_cadena', cardInstanceId: 'pacto' }, ctx)
    expect(evs(ctx, 'eter_pagado')).toHaveLength(1)
    expect(s.players.B.eterPagado).toHaveLength(2)
    expect(s.cadena).toMatchObject({ pila: ['pacto'], prioridad: 'A', respuestas: { pacto: { jugador: 'B', origen: 'campo' } } })
    s = cerrar(s, ctx)
    const e = ctx.events.map((x) => x.type)
    expect(e.indexOf('carta_robada')).toBeGreaterThanOrEqual(0)
    expect(e.indexOf('carta_robada')).toBeLessThan(e.indexOf('destruccion')) // la respuesta resuelve primero
    expect(s.players.B.mano.length).toBe(mano + 2)
    expect(s.players.B.cementerio).toEqual(expect.arrayContaining(['pacto', 'b0']))
    expect(s.players.A.cementerio).toContain('rayo')
  })

  it('getValidActions ofrece responder_cadena con la Arcana pagable y el bot (que pasa) no se atasca', () => {
    const { s } = conPacto(2)
    expect(getValidActions(s, 'B').some((a) => a.type === 'responder_cadena' && a.cardInstanceId === 'pacto')).toBe(true)
    expect(botTonto(s, 'B')).toEqual({ type: 'pasar_prioridad' })
  })

  it('una Arcana ya boca arriba no es respondible (ya se activó)', () => {
    const { s } = conPacto(2)
    s.instances['pacto'].bocaArriba = true
    expect(respondiblesDe(s, 'B')).toEqual([])
  })
})

describe('resolvedor único de la pila: combate y global (F5e)', () => {
  /** A ataca con a0; B (con la Presteza `resp` en mano y mazo) puede responder desde la mano. */
  function ataqueVs(respuesta: string): { s: GameState; ctx: Ctx } {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', respuesta)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    return { s, ctx }
  }

  it('una respuesta de la mano en la ventana del ATAQUE elige objetivo, resuelve y va al Cementerio; el combate sigue', () => {
    const { s: s1, ctx } = ataqueVs(PR.PRESTEZA_DEBIL)
    expect(s1.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' })
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s1, 'B', PR.PRESTEZA_DEBIL) }, ctx)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta' })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'resp', opciones: ['a0'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    s = cerrar(s, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'a0').poder).toBe(0)
    expect(s.players.B.cementerio).toContain('resp')
    expect(s.combate?.paso).toBe('bloqueo') // el combate se reanudó
    // B bloquea: el atacante (ATQ 0) no mata al bloqueador y el bloqueador (ATQ 2) mata a a0
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } }, ctx)
    expect(s.players.B.campo.campeones[0]).toBe('b0')
    expect(s.players.A.cementerio).toContain('a0')
  })

  it('en la ventana del BLOQUEO (antes del daño) la respuesta de la mano también resuelve y la Arcana va a 2G', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conArcana(s0, 'B', 'tr', PR.TRAMPA, 0)
    conEteres(s0, 'B', 2)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    s = cerrar(s, ctx)
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } }, ctx)
    expect(s.combate?.danoPendiente).toBe(true)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'tr' }, ctx)
    expect(s.players.B.eterPagado).toHaveLength(2)
    s = cerrar(s, ctx)
    expect(s.players.B.cementerio).toContain('tr')
    expect(s.players.B.campo.arcanasCombate[0]).toBeNull()
    expect(s.players.B.campo.campeones[0]).toBe('b0') // el ATQ del atacante cayó a 0 antes del daño
  })

  it('un Campeón con Disparo (al_resolver_cadena) y una Táctica en campo responden en combate sin salir del campo', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'rea', PR.REACTIVO, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(respondiblesDe(s, 'B')).toEqual(['rea'])
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'rea' }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    s = cerrar(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0)
    expect(s.players.B.campo.campeones[0]).toBe('rea')
    expect(s.combate?.paso).toBe('bloqueo')
  })

  it('Mística en el campo (Eco) NO responde (manual §5.3: las Místicas solo se juegan desde la mano): sin respondedores no hay ventana', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMistica(s0, 'B', 'eco', PR.ECO, 0)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(respondiblesDe(s, 'B')).toEqual([])
    expect(s.cadena).toBeUndefined() // el gate no abre: nadie puede responder
    expect(s.combate?.paso).toBe('bloqueo')
    expect(motivoNoResponde(s, 'B', 'eco', 'campo')).toMatch(/solo se juegan desde la mano/)
  })

  it('Eco (Presteza, al_resolver_cadena) jugada DESDE LA MANO como respuesta: roba al resolver y va al Cementerio', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'eco', PR.ECO)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(respuestasDeMano(s, 'B')).toEqual(['eco'])
    const mano = s.players.B.mano.length
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'eco', eterIds: pagoDe(s, 'B', PR.ECO) }, ctx)
    s = cerrar(s, ctx)
    expect(s.players.B.mano.length).toBe(mano) // salió 'eco' (-1) y robó 1 (+1)
    expect(s.players.B.cementerio).toContain('eco')
    expect(s.players.B.campo.misticasTacticas).not.toContain('eco')
  })
})

describe('velocidad: normal < Presteza < Fugaz (F5e, manual: PRESTEZA solo se responde con PRESTEZA o FUGAZ; FUGAZ no se responde)', () => {
  /**
   * B tiene una Arcana normal y un Campeón con Disparo (normal) en el campo, y tres Místicas en la MANO (Presteza,
   * Presteza/Eco y Fugaz), todo pagable. Las Místicas solo responden desde la mano (manual §5.3).
   */
  function escenaDeRespuestas(): GameState {
    const s = base()
    conCampeon(s, 'B', 'rea', PR.REACTIVO, 0) // Disparo, normal
    conMano(s, 'B', 'pre', PR.PRESTEZA_ROBA) // Presteza
    conMano(s, 'B', 'eco', PR.ECO) // Presteza (Eco)
    conMano(s, 'B', 'fug', PR.FUGAZ) // Fugaz
    conArcana(s, 'B', 'arc', PR.PACTO, 0) // normal
    conMano(s, 'B', 'relleno', PR.PEON) // F5f: PR-060 exige ≥1 carta en mano para activarse
    conEteres(s, 'B', 2)
    return s
  }

  it('con la pila vacía y un opener normal (Rayo) cualquier velocidad responde', () => {
    const s0 = escenaDeRespuestas()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rea' }, ctx)
    expect([...respondiblesDe(s, 'B')].sort()).toEqual(['arc', 'rea']) // en el campo: la Arcana y el Disparo
    expect([...respuestasDeMano(s, 'B')].sort()).toEqual(['eco', 'fug', 'pre']) // en la mano: las tres Místicas
  })

  it('un opener Presteza solo se responde con Presteza/Fugaz', () => {
    const s0 = escenaDeRespuestas()
    conMano(s0, 'A', 'deb', PR.PRESTEZA_DEBIL)
    const pago = conEteres(s0, 'A', 1)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'deb', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rea' }, ctx)
    expect(velocidadDe(s, 'deb')).toBe('presteza')
    expect(respondiblesDe(s, 'B')).toEqual([]) // la Arcana y el Disparo son normales: no responden a una Presteza
    expect([...respuestasDeMano(s, 'B')].sort()).toEqual(['eco', 'fug', 'pre'])
  })

  it('tras una respuesta Presteza solo Presteza/Fugaz; tras una Fugaz, nadie (ni siquiera la Presteza de la mano)', () => {
    const s0 = escenaDeRespuestas()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conMano(s0, 'A', 'preA', PR.PRESTEZA_ROBA)
    conMano(s0, 'A', 'fugA', PR.FUGAZ)
    conArcana(s0, 'A', 'arcA', PR.PACTO, 0)
    conMano(s0, 'A', 'manoPre', PR.PRESTEZA_ROBA)
    conEteres(s0, 'A', 3)
    conMano(s0, 'B', 'manoB', PR.PRESTEZA_ROBA)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 2, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rea' }, ctx)
    // B responde con su Presteza jugada desde la mano (no tiene objetivo: entra directo)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'pre', eterIds: pagoDe(s, 'B', PR.PRESTEZA_ROBA) }, ctx)
    expect(s.cadena?.velocidadActual).toBe('presteza')
    expect(respondiblesDe(s, 'A')).toEqual([]) // la Arcana de A es normal: no responde a una Presteza
    expect([...respuestasDeMano(s, 'A')].sort()).toEqual(['fugA', 'manoPre', 'preA']) // las de la mano sí (Presteza/Fugaz)
    // Con una Fugaz en el tope NADIE responde (tampoco la Presteza de la mano). F5f: responder con una Fugaz cierra la
    // pila al instante, así que el estado "Fugaz en el tope" se arma a mano para comprobar la regla de velocidad.
    s = structuredClone(s)
    s.cadena!.pila.push('fugA')
    s.cadena!.velocidadActual = 'fugaz'
    s.cadena!.prioridad = 'B'
    expect(respondiblesDe(s, 'B')).toEqual([])
    expect(respuestasDeMano(s, 'B')).toEqual([]) // B tiene una Presteza pagable en la mano, pero no puede responder a una Fugaz
    expect(tipos(s, 'B')).toEqual(['rendirse', 'pasar_prioridad'])
    expect(applyAction(s, { type: 'responder_cadena', cardInstanceId: 'eco' }, ctx).ok).toBe(false)
  })

  it('la Presteza de la mano no puede responder a una Fugaz (validarJugarRespuesta)', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'fug', PR.FUGAZ) // B puede responder con una Fugaz desde la mano: la ventana abre
    conEteres(s0, 'B', 1)
    conMano(s0, 'A', 'manoPre', PR.PRESTEZA_ROBA)
    conEteres(s0, 'A', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    // F5f: responder con la Fugaz cierra la pila al instante; el estado "Fugaz en el tope" se arma a mano
    s = structuredClone(s)
    s.cadena!.pila.push('fug')
    s.cadena!.prioridad = 'A'
    expect(s.cadena).toMatchObject({ pila: ['fug'], prioridad: 'A' })
    const r = applyAction(s, { type: 'jugar_respuesta', cardInstanceId: 'manoPre', eterIds: pagoDe(s, 'A', PR.PRESTEZA_ROBA) }, ctx)
    expect(r.ok).toBe(false)
    expect(getValidActions(s, 'A').some((a) => a.type === 'jugar_respuesta')).toBe(false)
  })

  it('Fugaz proactiva (PR-043): resuelve sin ventana aunque el rival tenga respondibles en el campo', () => {
    const s0 = escenaDeRespuestas()
    conMano(s0, 'A', 'fugM', PR.FUGAZ)
    const pago = conEteres(s0, 'A', 1)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'fugM', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'a0').poder).toBe(4)
    expect(s.players.A.cementerio).toContain('fugM')
  })
})

describe('simulación con bots: sin freeze con el nuevo modelo de respuestas (F5e)', () => {
  const deckA = expandirMazo(ESTASIS_CARDS)
  const deckB = expandirMazo(DISONANCIA_CARDS)
  const seeds = [66099, 66676, 1, 2, 3, 7, 42, 12345]

  it.each(seeds)('seed %i (mazos reales): simularPartida avanza sin freeze y sin violar invariantes', (seed) => {
    const { estado } = simularPartida(deckA, deckB, seed, 600)
    if (!cadenaActiva(estado) && !estado.declaracionEnEleccion) expect(verificarInvariantes(estado)).toEqual([])
  })

  /**
   * Jugador "respondón": prefiere responder (responder_cadena / jugar_respuesta) y siempre elige el
   * primer objetivo; ejercita las rutas nuevas con el set PR (Presteza, Arcanas, Disparos, Fugaz).
   * Cada estado debe tener un actor con al menos una acción legal y el motor no debe rechazarla.
   */
  let respuestasTotales = 0
  let eleccionesDeRespuesta = 0
  it.each([1, 2, 3, 66099, 66676])('seed %i (set PR, bot respondón): sin freeze, acciones siempre aplicables', (seed) => {
    cargarCartasPrueba()
    const { state, ctx } = createInitialState(mazoPrueba(), mazoPrueba(), seed)
    let estado = state
    for (let i = 0; i < 1500 && estado.fase !== 'terminada'; i++) {
      const actor = actorActual(estado) ?? estado.turno
      const acciones = getValidActions(estado, actor)
      const propia =
        acciones.find((a) => a.type === 'responder_cadena') ??
        acciones.find((a) => a.type === 'jugar_respuesta') ??
        null
      const accion = propia ?? botTonto(estado, actor)
      expect(accion, `sin acción para ${actor} en fase ${estado.fase} (iter ${i})`).not.toBeNull()
      if (accion!.type === 'responder_cadena' || accion!.type === 'jugar_respuesta') respuestasTotales++
      const r = applyAction(estado, accion!, ctx)
      expect(r.ok, `${accion!.type} rechazada: ${r.ok ? '' : r.error}`).toBe(true)
      if (!r.ok) return
      estado = r.state
      expect(verificarZonaUnica(estado), `${seed}: iter ${i} tras ${JSON.stringify(accion)}`).toEqual([]) // F5h: una instancia, una zona
      if (estado.declaracionEnEleccion?.tipo === 'respuesta') eleccionesDeRespuesta++
    }
  })

  it('el bot respondón ejercitó respuestas y elecciones de respuesta (la simulación no es vacua)', () => {
    expect(respuestasTotales).toBeGreaterThan(0)
    expect(eleccionesDeRespuesta).toBeGreaterThan(0)
  })
})
