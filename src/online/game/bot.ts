import { applyAction } from './actions'
import type { Action } from './actions'
import { getValidActions } from './validActions'
import { createInitialState } from './initialState'
import type { GameEvent } from './events'
import type { GameState, PlayerId } from './types'
import { botFacil, botMedio, botDificil, elegirPrevenicion, type Dificultad } from './botStrategies'

export type { Dificultad }

/**
 * Bot principal: delega a la estrategia según la dificultad.
 * Determinista por seed. Mismas excepciones que botTonto:
 * - Checkpoint prevenición (Fase 2c) → responder_prevenicion con heurística
 * - Cadena abierta → pasar_prioridad
 * - Paso bloqueo → actor es el DEFENSOR
 * - No usa usar_transmutar (sacrifica su propia carta)
 */
export function botTonto(state: GameState, playerId: PlayerId, dificultad: Dificultad = 'facil'): Action | null {
  // Checkpoint prevent_destroy: si el frente de la cola es de este jugador,
  // responde con la heurística (prevenir solo si es el último vínculo vivo).
  const preven = state.preventivosPendientes?.[0]
  if (preven) {
    if (preven.jugador !== playerId) return null
    return { type: 'responder_prevenicion', prevenir: elegirPrevenicion(state, playerId) }
  }
  // Cadena (combate 9.6 O global): el bot nunca encadena cartas
  const cadena = state.combate?.cadena ?? state.cadena
  if (cadena) {
    return cadena.prioridad === playerId ? { type: 'pasar_prioridad' } : null
  }
  const esDefensor = state.fase === 'choque' && state.combate?.paso === 'bloqueo' && playerId !== state.turno
  if (state.turno !== playerId && !esDefensor) return null

  let accion: Action | null
  switch (dificultad) {
    case 'dificil':
      accion = botDificil(state, playerId)
      break
    case 'medio':
      accion = botMedio(state, playerId)
      break
    case 'facil':
    default:
      accion = botFacil(state, playerId)
      break
  }

  // Filtro de seguridad: nunca rendirse ni usar transmutar
  if (accion && (accion.type === 'rendirse' || accion.type === 'usar_transmutar')) {
    const acciones = getValidActions(state, playerId)
    return acciones.find((a) => a.type !== 'rendirse' && a.type !== 'usar_transmutar') ?? null
  }

  return accion
}

export interface ResultadoSimulacion {
  estado: GameState
  /** Cantidad de turnos jugados (eventos turno_iniciado emitidos). */
  turnos: number
  /** Todos los eventos de la partida, en orden (contrato ADR-10). */
  eventos: GameEvent[]
}

/**
 * Simula una partida completa con dos bots: mulligan de ambos,
 * y luego cada turno el jugador activo ejecuta su primera acción legal.
 * La partida termina por mazo_vacio o al llegar a maxTurnos (defensivo).
 * Consume el MISMO ctx del estado inicial (reproducibilidad por seed).
 */
export function simularPartida(
  deckA: string[],
  deckB: string[],
  seed: number,
  maxTurnos = 500,
  dificultadA: Dificultad = 'facil',
  dificultadB: Dificultad = 'facil',
): ResultadoSimulacion {
  const { state, ctx } = createInitialState(deckA, deckB, seed)
  const eventos: GameEvent[] = []
  let iteraciones = 0
  let estado = state
  while (estado.fase !== 'terminada' && iteraciones < maxTurnos) {
    // Checkpoint prevent_destroy: el actor es el jugador que debe elegir (Fase 2c)
    const preven = estado.preventivosPendientes?.[0]
    const cadena = estado.combate?.cadena ?? estado.cadena
    const actor: PlayerId = preven
      ? preven.jugador
      : cadena
        ? cadena.prioridad
        : estado.fase === 'choque' && estado.combate?.paso === 'bloqueo'
          ? (estado.turno === 'A' ? 'B' : 'A')
          : estado.turno
    const dif = actor === 'A' ? dificultadA : dificultadB
    const accion = botTonto(estado, actor, dif)
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
