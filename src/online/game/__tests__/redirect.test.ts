// @vitest-environment node
/**
 * F9d — `redirect`: una respuesta cambia el objetivo del efecto que está JUSTO DEBAJO en la pila. Quien la juega elige
 * el nuevo objetivo al responder; el nuevo objetivo debe ser candidato del efecto redirigido (sus mismos filtros).
 * Cartas SINTÉTICAS («Dummy») sobre el set de prueba: Rayo (PR-040: destruye un Campeón RES ≤ 3 del rival) y la
 * Presteza debilitadora (PR-042).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { etersParaPagar } from '../payments'
import { statsDe } from '../efectos'
import type { AnyCard } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'
import {
  PR, cargarCartasPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
} from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
/** Presteza que redirige: el nuevo objetivo lo elige quien la juega, entre cualquier Campeón del campo. */
const REDIR: AnyCard = {
  ...base, id: 'T-REDIR', name: 'Redirección', type: 'Mística', keywords: ['Presteza'], facciones: ['Mutación'], stats: { cost: 1 },
  efectos: [{ tipo: 'hechizo', efecto: 'redirect', objetivo: { tipo: 'campeon', controlador: 'ambos', zona: 'campo' } }],
} as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([REDIR])
})

const pagoDe = (s: GameState, j: PlayerId, cardId: string) => etersParaPagar(s, j, cardId)!
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const eventos = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)

function base0(): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A'); conMazo(s, 'B')
  return s
}

/** A juega Rayo sobre b0; B tiene b1 (RES 2) y b2 (RES 4, fuera del filtro de Rayo) y la Redirección en mano. */
function rayoSobreB0(): { s: GameState; ctx: Ctx } {
  const s0 = base0()
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'A', 'a0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b1', PR.PEON, 1)
  conCampeon(s0, 'B', 'b2', PR.COMANDANTE, 2) // RES impresa 4: fuera del filtro de Rayo (resMax filtra por la RES impresa)
  conMano(s0, 'B', 'redir', 'T-REDIR')
  conEteres(s0, 'B', 1)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
  return { s, ctx }
}

/** B responde con la Redirección y elige `nuevo` como nuevo objetivo. */
function redirigirA(nuevo: string): { s: GameState; ctx: Ctx } {
  const { s: s1, ctx } = rayoSobreB0()
  let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'redir', eterIds: pagoDe(s1, 'B', 'T-REDIR') }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: nuevo }, ctx)
  return { s, ctx }
}
const vivo = (s: GameState, id: string) => s.players.B.campo.campeones.includes(id) || s.players.A.campo.campeones.includes(id)

describe('F9d — redirect sobre el opener', () => {
  it('sin redirect, Rayo destruye a b0 (control)', () => {
    const { s: s1, ctx } = rayoSobreB0()
    const s = cerrar(s1, ctx)
    expect(vivo(s, 'b0')).toBe(false)
    expect(vivo(s, 'b1')).toBe(true)
  })
  it('B redirige Rayo a b1: muere b1 y b0 se salva', () => {
    const { s: enPila, ctx } = redirigirA('b1')
    expect(enPila.cadena?.pila).toEqual(['redir'])
    const s = cerrar(enPila, ctx)
    expect(vivo(s, 'b0')).toBe(true)
    expect(vivo(s, 'b1')).toBe(false)
    expect(eventos(ctx, 'objetivo_redirigido')).toEqual([{ type: 'objetivo_redirigido', jugador: 'B', cardInstanceId: 'rayo', objetivoId: 'b1' }])
  })
  it('el nuevo objetivo debe ser candidato de Rayo: un Campeón de A (no es «rival de A») no vale', () => {
    const { s: enPila, ctx } = redirigirA('a0')
    const s = cerrar(enPila, ctx)
    expect(vivo(s, 'a0')).toBe(true)
    expect(vivo(s, 'b0')).toBe(false) // Rayo siguió con su objetivo original
    expect(eventos(ctx, 'objetivo_redirigido')).toEqual([])
  })
  it('respeta los filtros del efecto original: b2 tiene RES 4 y Rayo solo golpea RES ≤ 3', () => {
    const { s: enPila, ctx } = redirigirA('b2')
    const s = cerrar(enPila, ctx)
    expect(vivo(s, 'b2')).toBe(true)
    expect(vivo(s, 'b0')).toBe(false)
    expect(eventos(ctx, 'objetivo_redirigido')).toEqual([])
  })
  it('la Redirección se consume (Mística de la mano) aunque no cambie nada', () => {
    const { s: enPila, ctx } = redirigirA('a0')
    const s = cerrar(enPila, ctx)
    expect(s.players.B.cementerio).toContain('redir')
  })
})

describe('F9d — redirect sobre una respuesta', () => {
  it('A redirige la Debilitadora de B: el debuff cae en el nuevo objetivo, no en el original', () => {
    const s0 = base0()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 4)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'A', 'a1', PR.PEON, 1)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'A', 'redir', 'T-REDIR')
    conMano(s0, 'B', 'debil', PR.PRESTEZA_DEBIL)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago.slice(0, 2) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    // B responde con la Debilitadora sobre a0
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'debil', eterIds: pagoDe(s, 'B', PR.PRESTEZA_DEBIL) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(s.cadena?.respuestas?.debil?.objetivos).toEqual({ 0: 'a0' })
    // A responde con la Redirección: la Debilitadora pasa a a1
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'redir', eterIds: pago.slice(2, 3) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a1' }, ctx)
    expect(s.cadena?.pila).toEqual(['debil', 'redir'])
    s = cerrar(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(2) // sin debuff
    expect(statsDe(s, 'a1').poder).toBe(0) // PEON 2 − 2
    expect(eventos(ctx, 'objetivo_redirigido')).toEqual([{ type: 'objetivo_redirigido', jugador: 'A', cardInstanceId: 'debil', objetivoId: 'a1' }])
  })
})

describe('F9d — casos sin efecto', () => {
  it('fuera de la pila (efecto directo) no hay nada que redirigir y no falla', () => {
    const s = base0()
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-REDIR', owner: 'B' }
    const ctx = crearCtx()
    // sin cadena ni paso en curso: se ignora
    expect(() =>
      interpretEffect(s, ctx, s.instances.fuente, REDIR.efectos![0], { jugador: 'B', contextoUso: 'objetivo-elegido', objetivoId: 'b0' }),
    ).not.toThrow()
    expect(ctx.events).toEqual([])
  })
})
