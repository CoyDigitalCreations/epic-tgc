// @vitest-environment node
/**
 * INEGABLE (§10): los efectos de la carta no pueden ser negados ni contrarrestados por efectos del rival.
 * Es la regla `puedeSerNegada` (carta, base sí) que apaga la keyword. La consultan `negar` y `redirect`.
 * Cartas SINTÉTICAS («Dummy») sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { reglaBool } from '../reglas'
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
const efectoBuff = [{ tipo: 'disparo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 } }]
/** Campeón con un Disparo (buff +1 ATQ a sí mismo) con y sin INEGABLE. */
const VICTIMA = (id: string, keywords: string[]): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords, facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: efectoBuff }) as never
/** Mística normal y con INEGABLE: destruyen un Campeón rival RES ≤ 3 (como Rayo). */
const RAYO = (id: string, keywords: string[]): AnyCard =>
  ({ ...base, id, name: id, type: 'Mística', keywords, facciones: ['Mutación'], stats: { cost: 2 },
    efectos: [{ tipo: 'hechizo', efecto: 'destroy', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo', filtros: { resMax: 3 } } }] }) as never
const REDIR: AnyCard = {
  ...base, id: 'T-REDIR', name: 'Redirección', type: 'Mística', keywords: ['Presteza'], facciones: ['Mutación'], stats: { cost: 1 },
  efectos: [{ tipo: 'hechizo', efecto: 'redirect', objetivo: { tipo: 'campeon', controlador: 'ambos', zona: 'campo' } }],
} as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([VICTIMA('T-VIC', []), VICTIMA('T-VIC-INEG', ['Inegable']), RAYO('T-RAYO', []), RAYO('T-RAYO-INEG', ['Inegable']), REDIR])
})

const pagoDe = (s: GameState, j: PlayerId, cardId: string) => etersParaPagar(s, j, cardId)!
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const vivo = (s: GameState, id: string) => [...s.players.A.campo.campeones, ...s.players.B.campo.campeones].includes(id)

function base0(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A'); conMazo(s, 'B'); return s
}

describe('INEGABLE — la regla', () => {
  it('base: todo puede ser negado; la keyword apaga puedeSerNegada', () => {
    const s = base0(); conCampeon(s, 'A', 'n', 'T-VIC', 0); conCampeon(s, 'A', 'i', 'T-VIC-INEG', 1)
    expect(reglaBool(s, 'puedeSerNegada', { instId: 'n' })).toBe(true)
    expect(reglaBool(s, 'puedeSerNegada', { instId: 'i' })).toBe(false)
  })
})

/** B activa la habilidad de su Campeón `cardId`; A tiene Marcha (negar) en mano. Devuelve el estado con la ventana abierta. */
function activacionVsMarcha(cardId: string): { s: GameState; ctx: Ctx } {
  const s0 = base0()
  s0.turno = 'B'
  conCampeon(s0, 'B', 'v', cardId, 0)
  const eterB = conEteres(s0, 'B', 2)
  conMano(s0, 'A', 'marcha', PR.MARCHA)
  conEteres(s0, 'A', 3)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'v', eterIds: eterB.slice(0, 1) }, ctx)
  s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'marcha', eterIds: pagoDe(s, 'A', PR.MARCHA) }, ctx)
  return { s, ctx }
}

describe('INEGABLE — negar', () => {
  it('control: Marcha niega la activación de un Campeón normal (el buff no se aplica)', () => {
    const { s: enPila, ctx } = activacionVsMarcha('T-VIC')
    const s = cerrar(enPila, ctx)
    expect(statsDe(s, 'v').poder).toBe(2)
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(true)
  })
  it('un Campeón INEGABLE no puede ser negado: su activación resuelve y la Marcha se consume', () => {
    const { s: enPila, ctx } = activacionVsMarcha('T-VIC-INEG')
    const s = cerrar(enPila, ctx)
    expect(statsDe(s, 'v').poder).toBe(3)
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(false)
    expect(s.players.A.cementerio).toContain('marcha')
  })
})

/** A juega `rayo` sobre b0; B responde con la Redirección hacia b1. */
function rayoYRedireccion(rayoId: string): { s: GameState; ctx: Ctx } {
  const s0 = base0()
  conMano(s0, 'A', 'rayo', rayoId)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b1', PR.PEON, 1)
  conMano(s0, 'B', 'redir', 'T-REDIR')
  conEteres(s0, 'B', 1)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
  s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'redir', eterIds: pagoDe(s, 'B', 'T-REDIR') }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
  return { s, ctx }
}

describe('INEGABLE — redirect', () => {
  it('control: el rival redirige a un Rayo normal', () => {
    const { s: enPila, ctx } = rayoYRedireccion('T-RAYO')
    const s = cerrar(enPila, ctx)
    expect(vivo(s, 'b0')).toBe(true)
    expect(vivo(s, 'b1')).toBe(false)
  })
  it('un Rayo INEGABLE no puede ser redirigido por el rival: sigue a su objetivo', () => {
    const { s: enPila, ctx } = rayoYRedireccion('T-RAYO-INEG')
    const s = cerrar(enPila, ctx)
    expect(vivo(s, 'b0')).toBe(false)
    expect(vivo(s, 'b1')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'objetivo_redirigido')).toBe(false)
  })
})
