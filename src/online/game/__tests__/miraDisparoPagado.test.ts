// @vitest-environment node
/**
 * Lote 0 del motor de Estásis — Disparo con coste PAGADO de Mira (FB-012, carta REAL):
 *  - «hasta 2»: devuelve los primeros 2 Éteres de la zona de pago (antes devolvía solo 1).
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
  it('«hasta 2»: devuelve 2 Éteres de la zona de pago a la Reserva', () => {
    const s0 = escena()
    const accion = activar(s0); expect(accion, 'debe poder activarse').toBeDefined()
    const s = aplicar(s0, accion!, crearCtx())
    // pagó 1 (Reserva → 1A): 3 + 1 = 4 pagados; devuelve 2 → 2 pagados; Reserva 2 + 2 = 4
    expect(s.players.A.eterPagado).toHaveLength(2)
    expect(s.players.A.eterReserva).toHaveLength(4)
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
