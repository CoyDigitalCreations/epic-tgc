/**
 * Guards de resolución de efectos (perfeccionamiento-tablero):
 * registro declarativo de requisitos por cardId, consumido por
 * generarAccionesForja y validadores para bloquear activaciones
 * cuyo efecto no puede resolverse con el estado actual.
 */
import type { GameState, PlayerId } from './types'

export type RequisitoFn = (s: GameState, jugador: PlayerId) => string | null

const requisitos = new Map<string, RequisitoFn>()

export function registrarRequisito(cardId: string, fn: RequisitoFn): void {
  requisitos.set(cardId, fn)
}

/** Devuelve null si el efecto puede resolverse, o un string de error si no. */
export function validarRequisito(s: GameState, jugador: PlayerId, cardId: string): string | null {
  const fn = requisitos.get(cardId)
  return fn ? fn(s, jugador) : null
}
