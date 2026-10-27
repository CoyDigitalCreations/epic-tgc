// @vitest-environment node
/**
 * Scry de «Al inicio del Alba» (decisión del usuario, 2026-10-27): el efecto mira y ordena el mazo ANTES de robar. El Alba
 * se detiene tras sus efectos de inicio y el robo ocurre al ordenar (antes el robo tomaba la carta de arriba sin haber
 * ordenado, y el jugador ordenaba después). Es el único caso en que el Alba es observable (ADR-3).
 * Carta SINTÉTICA.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { scryActual } from '../scry'
import { actorActual, getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conCampeon, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, efectos: unknown[]): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([campeon('T-SCRY', [{ tipo: 'pasivo', trigger: 'inicio_alba', efecto: 'scry', cantidad: 2 }])])
})

/** Fin del turno de A (Ocaso): empieza el Alba de B, que tiene un Campeón con Scry de inicio de Alba y un mazo de 5. */
function albaDeBConScry(conScry = true): { s: GameState; mazoB: string[] } {
  const s0 = escenaVacia('ocaso'); conMazo(s0, 'A')
  const mazoB = conMazo(s0, 'B', 5)
  if (conScry) conCampeon(s0, 'B', 'sc', 'T-SCRY', 0)
  const s = aplicar(s0, { type: 'pasar_turno' }, crearCtx())
  return { s, mazoB }
}

describe('el Alba espera al Scry antes de robar', () => {
  it('control: sin Scry el Alba roba de inmediato, como siempre', () => {
    const { s, mazoB } = albaDeBConScry(false)
    expect(s.albaPendiente).toBeUndefined()
    expect(s.players.B.mano).toEqual([mazoB[0]])
  })
  it('con Scry, el Alba se detiene: todavía NO robó y quien mira es el único actor', () => {
    const { s, mazoB } = albaDeBConScry()
    expect(s.turno).toBe('B')
    expect(s.albaPendiente).toBe('B')
    expect(scryActual(s)?.cartas).toEqual([mazoB[0], mazoB[1]]) // mira las 2 del tope
    expect(s.players.B.mano).toEqual([]) // el robo espera
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').map((a) => a.type).filter((t) => t !== 'rendirse')).toEqual(['ordenar_mazo']) // rendirse siempre se puede
  })
  it('al ordenar, roba la carta que dejaste ARRIBA (no la que estaba antes del Scry)', () => {
    const { s: s1, mazoB } = albaDeBConScry()
    const s = aplicar(s1, { type: 'ordenar_mazo', arriba: [mazoB[1], mazoB[0]], fondo: [] }, crearCtx())
    expect(s.albaPendiente).toBeUndefined()
    expect(s.players.B.mano).toEqual([mazoB[1]]) // robó la que antes era la segunda
    expect(s.players.B.mazo[0]).toBe(mazoB[0])
  })
  it('mandar la primera al fondo: el robo toma la siguiente', () => {
    const { s: s1, mazoB } = albaDeBConScry()
    const s = aplicar(s1, { type: 'ordenar_mazo', arriba: [mazoB[1]], fondo: [mazoB[0]] }, crearCtx())
    expect(s.players.B.mano).toEqual([mazoB[1]])
    expect(s.players.B.mazo[s.players.B.mazo.length - 1]).toBe(mazoB[0])
  })
  it('tras ordenar la partida sigue en la Forja de B, sin Alba pendiente', () => {
    const { s: s1, mazoB } = albaDeBConScry()
    const s = aplicar(s1, { type: 'ordenar_mazo', arriba: [mazoB[0], mazoB[1]], fondo: [] }, crearCtx())
    expect(s.fase).toBe('forja')
    expect(s.turno).toBe('B')
    expect(getValidActions(s, 'B').some((a) => a.type === 'pasar_turno')).toBe(true)
  })
})
