// @vitest-environment node
/**
 * F9b — `direct_attack`: «este Campeón no puede ser bloqueado». Es una modificación de la regla `puedeSerBloqueado`
 * (§9.3), no un caso suelto del combate. Cartas SINTÉTICAS («Dummy»). La Ruptura sigue siendo UNA por turno (§9.4).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { registrarCartas } from '../cards'
import { ataquesBloqueables, asignacionForzada } from '../combat'
import { interpretEffect } from '../effectInterpreter'
import { reglaBool } from '../reglas'
import { getValidActions } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const,
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '3' as const,
}
const campeon = (id: string, efectos: unknown[] = []) => ({
  ...base, id, name: id, type: 'Campeón' as const, keywords: [], efectos,
  facciones: ['Orden' as const], stats: { cost: 1, poder: 2, resistencia: 2 },
}) as never
const VINCULO = 'FB-025' // Vínculo real del paquete (como combat.test.ts)

beforeAll(() => {
  registrarCartas([
    campeon('T-DIR', [{ tipo: 'pasivo', efecto: 'direct_attack', objetivo: { tipo: 'self' } }]),
    campeon('T-NORM'),
    campeon('T-DEF'),
    campeon('T-HECHIZO'),
  ])
})

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
function estado(): GameState {
  return { version: 1, seed: 7, fase: 'choque', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} }
}
const ctx = (): Ctx => { const events: Ctx['events'] = []; return { next: () => 0, emit: (e) => { events.push(e) }, events } }

function campo(s: GameState, id: string, cardId: string, owner: PlayerId, slot: number) {
  s.instances[id] = { cardInstanceId: id, cardId, owner }
  s.players[owner].campo.campeones[slot] = id
}
function vinculos(s: GameState, n: number) {
  for (let i = 0; i < n; i++) {
    s.instances[`v${i}`] = { cardInstanceId: `v${i}`, cardId: VINCULO, owner: 'B' }
    s.players.B.vinculos[i] = `v${i}`
  }
}
function aplicar(s: GameState, a: Action, c: Ctx): GameState {
  const r = applyAction(s, a, c)
  if (!r.ok) throw new Error(`${a.type} falló: ${r.error}`)
  return r.state
}
const tipos = (s: GameState, j: PlayerId) => getValidActions(s, j).map((a) => a.type)

describe('F9b — la regla puedeSerBloqueado', () => {
  it('base: se puede bloquear a cualquier atacante', () => {
    const s = estado(); campo(s, 'n', 'T-NORM', 'A', 0)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'n' })).toBe(true)
  })
  it('un Campeón con el efecto direct_attack en el campo no puede ser bloqueado; sus compañeros sí', () => {
    const s = estado(); campo(s, 'd', 'T-DIR', 'A', 0); campo(s, 'n', 'T-NORM', 'A', 1)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'd' })).toBe(false)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'n' })).toBe(true)
  })
  it('fuera del campo (en la mano) el efecto no está vigente', () => {
    const s = estado(); s.instances.d = { cardInstanceId: 'd', cardId: 'T-DIR', owner: 'A' }; s.players.A.mano.push('d')
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'd' })).toBe(true)
  })
})

describe('F9b — el combate respeta el ataque directo', () => {
  it('atacante directo y defensor enderezado: no hay bloqueo, pasa a resolución y la Ruptura queda pendiente', () => {
    const s0 = estado(); campo(s0, 'd', 'T-DIR', 'A', 0); campo(s0, 'def', 'T-DEF', 'B', 0); vinculos(s0, 2)
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['d'] }, ctx())
    expect(s.combate?.paso).toBe('resolucion')
    expect(s.combate?.bloqueos).toEqual({})
    expect(s.combate?.rupturaDisponible).toBe(true)
    expect(tipos(s, 'B')).not.toContain('declarar_bloqueo')
    expect(tipos(s, 'A')).toContain('elegir_ruptura')
  })
  it('la Ruptura rompe 1 Vínculo y no más de 1 por turno (§9.4)', () => {
    const s0 = estado(); campo(s0, 'd', 'T-DIR', 'A', 0); campo(s0, 'd2', 'T-DIR', 'A', 1); campo(s0, 'def', 'T-DEF', 'B', 0); vinculos(s0, 3)
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['d', 'd2'] }, ctx())
    s = aplicar(s, { type: 'elegir_ruptura', atacanteId: 'd', vinculoSlot: 0 }, ctx())
    expect(s.instances.v0.bocaArriba).toBe(true)
    expect(s.instances.v1.bocaArriba).toBeFalsy()
    expect(tipos(s, 'A')).not.toContain('elegir_ruptura')
  })
  it('mixto: solo el atacante normal es bloqueable; el directo queda sin bloquear y rompe', () => {
    const s0 = estado(); campo(s0, 'd', 'T-DIR', 'A', 0); campo(s0, 'n', 'T-NORM', 'A', 1); campo(s0, 'def', 'T-DEF', 'B', 0); vinculos(s0, 2)
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['d', 'n'] }, ctx())
    expect(s.combate?.paso).toBe('bloqueo')
    expect(ataquesBloqueables(s)).toEqual(['n'])
    expect(asignacionForzada(s)).toEqual({ n: 'def' })
    // bloquear al directo se rechaza
    const mala = applyAction(s, { type: 'declarar_bloqueo', asignaciones: { d: 'def' } }, ctx())
    expect(mala.ok).toBe(false)
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { n: 'def' } }, ctx())
    expect(s.combate?.bloqueos).toEqual({ n: 'def' })
    expect(s.combate?.rupturaDisponible).toBe(true)
    const rupturas = getValidActions(s, 'A').filter((a) => a.type === 'elegir_ruptura')
    expect(rupturas.length).toBeGreaterThan(0)
    expect(rupturas.every((a) => a.type === 'elegir_ruptura' && a.atacanteId === 'd')).toBe(true)
  })
  it('un atacante normal sigue siendo bloqueable (sin regresión)', () => {
    const s0 = estado(); campo(s0, 'n', 'T-NORM', 'A', 0); campo(s0, 'def', 'T-DEF', 'B', 0); vinculos(s0, 2)
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['n'] }, ctx())
    expect(s.combate?.paso).toBe('bloqueo')
    expect(tipos(s, 'B')).toContain('declarar_bloqueo')
  })
})

describe('F9b — direct_attack como efecto de resolución (hechizo/disparo)', () => {
  const lanzar = (s: GameState, objetivoId: string, extra: Record<string, unknown> = {}) => {
    s.instances.f = { cardInstanceId: 'f', cardId: 'T-HECHIZO', owner: 'A' }
    interpretEffect(s, ctx(), s.instances.f, {
      tipo: 'disparo', efecto: 'direct_attack', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, ...extra,
    } as never, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId })
  }
  it('el Campeón elegido no puede ser bloqueado mientras dure el efecto', () => {
    const s = estado(); campo(s, 'n', 'T-NORM', 'A', 0); campo(s, 'm', 'T-NORM', 'A', 1)
    lanzar(s, 'n', { duracion: 'turno' })
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'n' })).toBe(false)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'm' })).toBe(true)
  })
  it('en combate: el Campeón marcado por el hechizo ataca sin ser bloqueado', () => {
    const s0 = estado(); campo(s0, 'n', 'T-NORM', 'A', 0); campo(s0, 'def', 'T-DEF', 'B', 0); vinculos(s0, 2)
    lanzar(s0, 'n', { duracion: 'turno' })
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['n'] }, ctx())
    expect(s.combate?.paso).toBe('resolucion')
    expect(tipos(s, 'A')).toContain('elegir_ruptura')
  })
  it('con duración «turno» la marca queda registrada para expirar en el Ocaso', () => {
    const s = estado(); campo(s, 'n', 'T-NORM', 'A', 0)
    lanzar(s, 'n', { duracion: 'turno' })
    expect(s.reglasTemporales?.[0]).toMatchObject({ regla: 'puedeSerBloqueado', operacion: 'prohibir', expira: 'ocaso' })
  })
})
