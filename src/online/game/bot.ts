import { applyAction } from './actions'
import type { Action } from './actions'
import { getValidActions } from './validActions'
import { createInitialState } from './initialState'
import type { GameEvent } from './events'
import type { GameState, PlayerId } from './types'

/**
 * Bot TONTO para simulación (5.7): elige la primera acción legal no-rendirse
 * de getValidActions, o null si no es el turno del jugador. Determinista:
 * decide solo con el estado, que a su vez depende solo del seed.
 */
export function botTonto(state: GameState, playerId: PlayerId): Action | null {
  if (state.turno !== playerId) return null
  const acciones = getValidActions(state, playerId)
  return acciones.find((a) => a.type !== 'rendirse') ?? null
}

export interface ResultadoSimulacion {
  estado: GameState
  /** Cantidad de turnos jugados (eventos turno_iniciado emitidos). */
  turnos: number
  /** Todos los eventos de la partida, en orden (contrato ADR-10). */
  eventos: GameEvent[]
}

/**
 * Simula una partida completa con dos bots tontos (5.7): mulligan de ambos,
 * y luego cada turno el jugador activo ejecuta su primera acción legal.
 * La partida termina por mazo_vacio o al llegar a maxTurnos (defensivo).
 * Consume el MISMO ctx del estado inicial (reproducibilidad por seed).
 */
export function simularPartida(deckA: string[], deckB: string[], seed: number, maxTurnos = 500): ResultadoSimulacion {
  const { state, ctx } = createInitialState(deckA, deckB, seed)
  const eventos: GameEvent[] = []
  let iteraciones = 0
  let estado = state
  while (estado.fase !== 'terminada' && iteraciones < maxTurnos) {
    const accion = botTonto(estado, estado.turno)
    if (!accion) throw new Error('el bot no encontró acción válida (sin progreso)')
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) throw new Error(`la acción del bot falló (${accion.type}): ${r.error}`)
    eventos.push(...r.events)
    estado = r.state
    iteraciones++
  }
  const turnos = eventos.filter((e) => e.type === 'turno_iniciado').length
  return { estado, turnos, eventos }
}
