// @vitest-environment node
/**
 * «Selecciona hasta N Éter que controla el rival en su zona de pago» (Runa de Ancla, FB-033): el jugador ELIGE cuáles. Antes el
 * motor anclaba solos los primeros N (decisión del Lote 3), así que la carta decía «selecciona» y no dejaba seleccionar nada.
 *
 * Reglas (genéricas para los efectos de Éter «hasta N» con elección):
 *   - Con MÁS candidatos que el tope se elige uno por uno (N elecciones); la elegida ya no es candidata en la siguiente.
 *   - Con N candidatos o menos no hay nada que decidir: se aplican a todos, sin pedir elección.
 *   - Funciona también cuando la carta es una Mística que pasa por la cadena (opener), que antes solo guardaba un objetivo.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getValidActions } from '../validActions'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conEteres, conMano, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const RUNA = 'FB-033'

beforeAll(() => {
  cargarCartasPrueba()
})

/** A tiene la Runa y Éter; B tiene `n` Éter en su zona de pago (1A). Devuelve el estado y los ids del Éter de B. */
function escena(n: number): { s: GameState; eterB: string[] } {
  const s = escenaVacia('forja')
  conMazo(s, 'A'); conMazo(s, 'B')
  conMano(s, 'A', 'runa', RUNA); conEteres(s, 'A', 5)
  const eterB = conEteres(s, 'B', n)
  s.players.B.eterReserva = []
  s.players.B.eterPagado = [...eterB]
  return { s, eterB }
}

const jugarRuna = (s: GameState) => aplicar(s, getValidActions(s, 'A').find((a) => a.type === 'jugar_mistica' && a.cardInstanceId === 'runa')!, crearCtx())

describe('Runa de Ancla: el jugador elige cuáles Éter ancla', () => {
  it('con más Éter que el tope pide elegir: ofrece todos los candidatos', () => {
    const { s: s0, eterB } = escena(5)
    const s = jugarRuna(s0)
    const p = s.objetivosPendientes?.[0]
    expect(p, 'debe quedar una elección pendiente').toBeDefined()
    expect(p!.jugador).toBe('A')
    expect([...p!.opciones].sort()).toEqual([...eterB].sort())
  })

  it('anclan EXACTAMENTE los dos elegidos (no los dos primeros)', () => {
    const { s: s0, eterB } = escena(5)
    const ctx = crearCtx()
    let s = jugarRuna(s0)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eterB[3] }, ctx)
    // la segunda elección ya no ofrece el Éter elegido
    expect(s.objetivosPendientes?.[0]?.opciones).not.toContain(eterB[3])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eterB[4] }, ctx)
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect([...(s.players.B.eterAnclado ?? [])].sort()).toEqual([eterB[3], eterB[4]].sort())
    expect(s.players.A.cementerio).toContain('runa') // la Mística se consume al resolver
  })

  it('con solo 2 Éter (el tope) no hay nada que decidir: se anclan los dos sin pedir elección', () => {
    const { s: s0, eterB } = escena(2)
    const s = jugarRuna(s0)
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect([...(s.players.B.eterAnclado ?? [])].sort()).toEqual([...eterB].sort())
  })

  it('con 3 Éter: se eligen 2 y queda sin anclar el que no se eligió', () => {
    const { s: s0, eterB } = escena(3)
    const ctx = crearCtx()
    let s = jugarRuna(s0)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eterB[2] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eterB[0] }, ctx)
    expect([...(s.players.B.eterAnclado ?? [])].sort()).toEqual([eterB[0], eterB[2]].sort())
    expect(s.players.B.eterAnclado).not.toContain(eterB[1])
  })
})
