// @vitest-environment node
/**
 * Purga y Mutación jugando solas (bot contra bot): ninguna partida se congela, revienta ni rompe las invariantes de zonas y Éter.
 * Cubre la integración completa (elecciones de esencia, descartes, observadores, sostenidos) que las pruebas de escena no ven.
 */
import { describe, expect, it } from 'vitest'
import { PURGA_CARDS, MUTACION_CARDS, ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida } from '../bot'
import { verificarInvariantes } from '../invariants'
import { expandirMazo } from './helpers'

const purga = expandirMazo(PURGA_CARDS)
const mutacion = expandirMazo(MUTACION_CARDS)
const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

describe('Purga vs Mutación — bot contra bot', () => {
  it.each(seeds)('seed %i: termina, sin pendientes colgados y con invariantes', (seed) => {
    const { estado, turnos } = simularPartida(purga, mutacion, seed)
    expect(turnos).toBeGreaterThan(0)
    expect(turnos).toBeLessThan(500)
    expect(estado.fase).toBe('terminada')
    expect(verificarInvariantes(estado)).toEqual([])
  })

  it.each(seeds.slice(0, 6))('seed %i (Mutación primero): termina con invariantes', (seed) => {
    const { estado } = simularPartida(mutacion, purga, seed)
    expect(estado.fase).toBe('terminada')
    expect(verificarInvariantes(estado)).toEqual([])
  })
})

describe('mazos cruzados con los clásicos — bot contra bot', () => {
  it.each([1, 2, 3, 4])('seed %i: Purga vs Estásis y Mutación vs Disonancia terminan con invariantes', (seed) => {
    for (const [a, b] of [[purga, expandirMazo(ESTASIS_CARDS)], [mutacion, expandirMazo(DISONANCIA_CARDS)]] as const) {
      const { estado } = simularPartida(a, b, seed)
      expect(estado.fase).toBe('terminada')
      expect(verificarInvariantes(estado)).toEqual([])
    }
  })
})
