import { describe, expect, it } from 'vitest'
import { createInitialState } from '../online/game'
import type { GameState, PlayerId } from '../online/game'
import { DISONANCIA_CARDS, ESTASIS_CARDS } from '../shared/data/paquetes'
import { evaluar, PESOS, PESOS_ANTES } from './evaluar'

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const inicial = (): GameState => createInitialState(expandir(ESTASIS_CARDS), expandir(DISONANCIA_CARDS), 1).state

/** `ladron` arrebata `n` Éter de la Reserva de `victima` (igual que `steal_ether`: cambia de Reserva, NO de dueño). */
function arrebatar(s: GameState, ladron: PlayerId, victima: PlayerId, n: number): GameState {
  const ids = s.players[victima].eterReserva.splice(0, n)
  s.players[ladron].eterReserva.push(...ids)
  return s
}

describe('evaluar · Éter arrebatado (cuenta por dueño, no por zona)', () => {
  it('sin Éter arrebatado en juego, los pesos nuevos y los de antes dan lo mismo', () => {
    const s = inicial()
    expect(evaluar(s, 'A', PESOS)).toBeCloseTo(evaluar(s, 'A', PESOS_ANTES), 9)
  })

  it('antes arrebatar Éter mejoraba la evaluación del ladrón por completo; ahora solo una fracción (es prestado)', () => {
    const base = evaluar(inicial(), 'B', PESOS)
    const antes = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'B', PESOS_ANTES) - evaluar(inicial(), 'B', PESOS_ANTES)
    const ahora = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'B', PESOS) - base
    expect(antes).toBeGreaterThan(0)
    expect(ahora).toBeGreaterThan(0) // gastarlo este turno sigue valiendo algo
    expect(ahora).toBeLessThan(antes / 2)
  })

  it('el dueño no da por perdido el Éter que le arrebataron: vuelve en su Alba', () => {
    const antes = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'A', PESOS_ANTES) - evaluar(inicial(), 'A', PESOS_ANTES)
    const ahora = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'A', PESOS) - evaluar(inicial(), 'A', PESOS)
    expect(antes).toBeLessThan(0) // antes lo contaba como pérdida
    // Ahora no pierde nada propio: solo cede lo que el ladrón puede GASTAR este turno (3 Éter prestados × su fracción)
    expect(ahora).toBeCloseTo(-3 * PESOS.eterPrestado * PESOS.eter, 9)
    expect(ahora).toBeGreaterThan(antes / 2)
  })

  it('el Éter arrebatado que ya está en la zona de pago del ladrón tampoco cuenta como suyo', () => {
    const s = arrebatar(inicial(), 'B', 'A', 2)
    s.players.B.eterPagado.push(...s.players.B.eterReserva.splice(-2, 2))
    const base = evaluar(inicial(), 'B', PESOS)
    expect(evaluar(s, 'B', PESOS) - base).toBeLessThan(0.4 * 2) // menos de 2 Éter propios
    // A conserva lo suyo (vuelve en su Alba); solo cede el valor de gasto inmediato de los 2 prestados
    expect(evaluar(s, 'A', PESOS)).toBeCloseTo(evaluar(inicial(), 'A', PESOS) - 2 * PESOS.eterPrestado * PESOS.eter, 9)
  })
})
