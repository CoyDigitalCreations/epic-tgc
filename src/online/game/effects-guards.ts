/**
 * Guards de resolución de efectos — infraestructura de registro genérico.
 *
 * FASE 2: los guards de Arcanas por cardId (FB-023, DS-024, DS-032, DS-033,
 * FB-024) fueron ELIMINADOS — las condiciones se evalúan desde el JSON vía
 * `condicionCumple` (efectos.ts) en validarActivarArcana y dispararTrigger.
 *
 * Este módulo se mantiene como infraestructura para requisitos de gameplay
 * registrados por tests o features futuras (registrarRequisito/validarRequisito).
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
