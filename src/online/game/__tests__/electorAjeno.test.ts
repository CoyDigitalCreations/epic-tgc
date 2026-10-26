// @vitest-environment node
/**
 * H4 (decisión 8: cualquier jugador puede ser elector) — el pendiente que nace al RESOLVER una pila y cuyo dueño NO es el
 * jugador del turno (el tutor del rival al morir su Campeón) lo elige su dueño de inmediato: `actorActual` lo señala,
 * `getValidActions` se lo ofrece, `elegir_objetivo` acepta `jugador` (el servidor lo fija) y el resto del juego espera.
 * Antes se perdía: el activo no podía elegirlo y se descartaba al Ocaso. Ver `electorAjeno` (pendientes.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { electorAjeno } from '../pendientes'
import { botTonto } from '../bot'
import { visibleState } from '../visibleState'
import { verificarZonaUnica } from '../invariants'
import type { Action } from '../actions'
import type { GameState } from '../types'
import {
  PR, cargarCartasPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon, enCementerio,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
})

const elegir = (objetivoId: string, jugador?: 'A' | 'B'): Action => ({ type: 'elegir_objetivo', objetivoId, ...(jugador ? { jugador } : {}) })

/** A mata con el Rayo a la Última Voluntad de B: al morir, B arma su tutor (pendiente de B en el turno de A). */
function hastaTutorDeB(): { s: GameState; ctx: ReturnType<typeof crearCtx> } {
  const s0 = escenaVacia('forja')
  conMazo(s0, 'A')
  conMazo(s0, 'B')
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'B', 'uv', PR.ULTIMA_VOLUNTAD, 0)
  enCementerio(s0, 'B', 'vieja', PR.PEON)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, elegir('uv'), ctx)
  return { s, ctx }
}

describe('H4: el dueño ajeno al turno elige su pendiente de inmediato', () => {
  it('el tutor de B nace en el turno de A: el actor es B, solo B recibe la elección y A queda congelado', () => {
    const { s } = hastaTutorDeB()
    expect(s.turno).toBe('A')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', trigger: 'al-ser-enviado-al-cementerio' })
    expect(electorAjeno(s)).toBe(s.objetivosPendientes![0])
    expect(actorActual(s)).toBe('B')
    const deB = getValidActions(s, 'B').filter((a) => a.type === 'elegir_objetivo')
    expect(deB.length).toBeGreaterThan(0)
    expect(deB).toContainEqual(elegir('vieja'))
    // A (el del turno) no puede hacer nada salvo rendirse mientras B no elija
    expect(getValidActions(s, 'A').map((a) => a.type)).toEqual(['rendirse'])
    const r = applyAction(s, { type: 'pasar_turno' }, crearCtx())
    expect(r).toMatchObject({ ok: false, error: 'el rival debe elegir un objetivo antes de continuar' })
  })

  it('B elige y el tutor resuelve (ya no se pierde); el turno vuelve a A', () => {
    const { s: s1, ctx } = hastaTutorDeB()
    const s = aplicar(s1, elegir('vieja'), ctx)
    expect(s.players.B.mano).toContain('vieja')
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(electorAjeno(s)).toBeUndefined()
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'A').some((a) => a.type === 'pasar_turno')).toBe(true)
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('`jugador` en elegir_objetivo: debe ser el dueño del pendiente (el servidor lo fija); omitido también vale', () => {
    const { s, ctx } = hastaTutorDeB()
    expect(applyAction(s, elegir('vieja', 'A'), ctx)).toMatchObject({ ok: false, error: 'el objetivo lo elige el dueño del pendiente' })
    expect(applyAction(s, elegir('vieja', 'B'), crearCtx()).ok).toBe(true)
    expect(applyAction(s, elegir('vieja'), crearCtx()).ok).toBe(true)
  })

  it('el que NO es dueño ni turno no puede elegir aunque llegue la acción (la validación no se salta con getValidActions)', () => {
    const { s } = hastaTutorDeB()
    // forzamos un pendiente de B con el turno en A y verificamos que el validador exige al dueño
    expect(applyAction(s, elegir('vieja', 'A'), crearCtx()).ok).toBe(false)
  })

  it('B puede rendirse en vez de elegir', () => {
    const { s, ctx } = hastaTutorDeB()
    expect(aplicar(s, { type: 'rendirse', jugador: 'B' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'rendicion' })
  })

  it('visibleState: B ve las opciones de su pendiente', () => {
    const { s } = hastaTutorDeB()
    const vistaB = visibleState(s, 'B')
    for (const id of s.objetivosPendientes![0].opciones) expect(vistaB.instances[id].cardId).not.toBeNull()
  })

  it('el bot elige por el dueño ajeno (sin freeze)', () => {
    const { s } = hastaTutorDeB()
    expect(botTonto(s, 'B')).toEqual(elegir('vieja'))
    expect(botTonto(s, 'A')).toBeNull() // A espera
  })
})

describe('H4: lo que NO cambia', () => {
  it('un pendiente de UMBRAL de un jugador ajeno al turno no congela el juego: espera al turno de su dueño', () => {
    const s = escenaVacia('forja')
    conMazo(s, 'A')
    conMazo(s, 'B')
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    s.objetivosPendientes = [{ jugador: 'B', instId: 'b0', trigger: 'al-bloquear-eter', opciones: ['b0'] }]
    expect(s.turno).toBe('A')
    expect(electorAjeno(s)).toBeUndefined()
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'A').some((a) => a.type === 'pasar_turno')).toBe(true)
  })

  it('el pendiente del jugador del turno sigue siendo opcional (no congela a nadie)', () => {
    const s = escenaVacia('forja')
    conMazo(s, 'A')
    conMazo(s, 'B')
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    s.objetivosPendientes = [{ jugador: 'A', instId: 'a0', trigger: 'al-invocar', opciones: ['a0'] }]
    expect(electorAjeno(s)).toBeUndefined()
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'A').some((a) => a.type === 'pasar_turno')).toBe(true)
  })

  it('un pendiente ajeno sin opciones vigentes no atasca: no hay elector y se descarta', () => {
    const { s } = hastaTutorDeB()
    const t = structuredClone(s)
    t.players.B.cementerio = [] // la única opción ('vieja') ya no está
    delete t.instances['vieja']
    expect(electorAjeno(t)).toBeUndefined()
    expect(actorActual(t)).toBe('A')
  })
})
