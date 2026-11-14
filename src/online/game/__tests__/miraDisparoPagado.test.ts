// @vitest-environment node
/**
 * Lote 0 del motor de Estásis — Disparo con coste PAGADO de Mira (FB-012, carta REAL):
 *  - «hasta 2»: el jugador ELIGE cuáles 2 Éteres de la zona de pago devuelve (antes devolvía solo 1, y luego los primeros 2 sin elegir).
 *  - `una_por_turno` aplica a un Disparo pagado: se consume al pagar y no se ofrece ni se acepta una segunda vez
 *    (sin esto, un Disparo que no agota se repetía en bucle de Éter).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conCampeon, conEteres, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

function escena(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
  conCampeon(s, 'A', 'mira', 'FB-012', 0)
  conEteres(s, 'A', 3)
  // 3 Éteres ya pagados (1A): de ahí devuelve Mira
  const pagados = conEteres(s, 'A', 3).map((id) => { s.players.A.eterReserva.splice(s.players.A.eterReserva.indexOf(id), 1); return id })
  s.players.A.eterPagado.push(...pagados)
  return s
}
const activar = (s: GameState) => getValidActions(s, 'A').find((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'mira')

describe('Mira (FB-012) — Disparo pagado', () => {
  it('«hasta 2»: el jugador elige uno a uno qué 2 Éteres de la zona de pago vuelven a la Reserva', () => {
    const s0 = escena()
    const accion = activar(s0); expect(accion, 'debe poder activarse').toBeDefined()
    const ctx = crearCtx()
    const s1 = aplicar(s0, accion!, ctx)
    // pagó 1 (Reserva → 1A): 4 pagados; aún no devolvió nada: espera la elección
    expect(s1.players.A.eterPagado).toHaveLength(4)
    expect(s1.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', restantes: 1 })
    const opciones1 = [...s1.objetivosPendientes![0].opciones]
    expect(opciones1).toHaveLength(4)
    // elige el ÚLTIMO de la lista (no el primero): el motor respeta la elección
    const primero = opciones1[3]
    const s2 = aplicar(s1, { type: 'elegir_objetivo', objetivoId: primero }, ctx)
    expect(s2.players.A.eterReserva).toContain(primero)
    expect(s2.objetivosPendientes?.[0].opciones).not.toContain(primero)
    expect(s2.objetivosPendientes?.[0].opciones).toHaveLength(3)
    const segundo = s2.objetivosPendientes![0].opciones[2]
    const s3 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: segundo }, ctx)
    expect(s3.objetivosPendientes ?? []).toEqual([])
    // devolvió exactamente los 2 elegidos: 2 pagados; Reserva 2 + 2 = 4
    expect(s3.players.A.eterPagado).toHaveLength(2)
    expect(s3.players.A.eterReserva).toHaveLength(4)
    expect(s3.players.A.eterReserva).toEqual(expect.arrayContaining([primero, segundo]))
  })
  it('con 2 o menos Éteres pagados no hay nada que elegir: devuelve los que haya', () => {
    const s0 = escena()
    s0.players.A.eterReserva.push(...s0.players.A.eterPagado.splice(0, 2)) // quedan 1 pagado + el que paga = 2
    const s = aplicar(s0, activar(s0)!, crearCtx())
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.players.A.eterPagado).toHaveLength(0)
  })
  it('una_por_turno: aunque quede enderezada, no se ofrece ni se acepta otra activación en el mismo turno', () => {
    const s = aplicar(escena(), activar(escena())!, crearCtx())
    s.instances.mira.agotado = false // p. ej. un efecto que la endereza: el límite NO depende de agotar
    expect(activar(s)).toBeUndefined()
    const intento = applyAction(s, { type: 'activar_habilidad', cardInstanceId: 'mira', eterIds: [s.players.A.eterReserva[0]] }, crearCtx())
    expect(intento.ok).toBe(false)
  })
  it('el límite se reinicia al empezar el turno', () => {
    const s = aplicar(escena(), activar(escena())!, crearCtx())
    expect(s.instances.mira.efectosUsadosEsteTurno).toEqual([1])
    let e = s; const ctx = crearCtx()
    // termina el turno de A y el de B (Forja → Choque → Ocaso, cada uno): vuelve a ser el turno de A
    for (let i = 0; i < 6; i++) e = aplicar(e, getValidActions(e, e.turno).find((x) => x.type === 'pasar_turno')!, ctx)
    expect(e.turno).toBe('A')
    expect(e.instances.mira.efectosUsadosEsteTurno).toBeUndefined()
    expect(activar(e)).toBeDefined()
  })
})
