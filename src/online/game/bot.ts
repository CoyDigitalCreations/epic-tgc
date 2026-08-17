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
 * Excepción (9.3, ADR-11): en paso bloqueo el actor es el DEFENSOR (rival del
 * activo) — el bot del rival decide el bloqueo forzoso.
 * Excepción (9.6, ADR-19): con la cadena abierta el bot NUNCA responde — si
 * tiene la prioridad, pasa (pasar_prioridad directo); si no, null.
 * Excepción (C3d, D4): no activa habilidades opcionales que SACRIFICAN su
 * propia carta (usar_transmutar) — consistente con elegir_ruptura, donde
 * elige la variante null ("no romper").
 */
export function botTonto(state: GameState, playerId: PlayerId): Action | null {
  // Cadena (combate 9.6 O global): el bot nunca encadena cartas
  const cadena = state.combate?.cadena ?? state.cadena
  if (cadena) {
    return cadena.prioridad === playerId ? { type: 'pasar_prioridad' } : null
  }
  const esDefensor = state.fase === 'choque' && state.combate?.paso === 'bloqueo' && playerId !== state.turno
  if (state.turno !== playerId && !esDefensor) return null
  const acciones = getValidActions(state, playerId)
  return acciones.find((a) => a.type !== 'rendirse' && a.type !== 'usar_transmutar') ?? null
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
    // Cadena (combate 9.6 O global): el actor es el jugador con prioridad — sin esta
    // excepción simularPartida deadlockea pidiendo acciones a quien no puede.
    // En paso bloqueo el actor es el DEFENSOR (9.3, ADR-11): sin esta
    // excepción simularPartida deadlockea pidiendo acciones al activo.
    const cadena = estado.combate?.cadena ?? estado.cadena
    const actor: PlayerId =
      cadena
        ? cadena.prioridad
        : estado.fase === 'choque' && estado.combate?.paso === 'bloqueo'
          ? (estado.turno === 'A' ? 'B' : 'A')
          : estado.turno
    const accion = botTonto(estado, actor)
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
