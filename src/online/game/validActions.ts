import type { Action } from './actions'
import type { GameState, PlayerId } from './types'

/**
 * getValidActions(state, playerId) — acciones legales del jugador ACTIVO
 * (state.turno) en la fase activa; `rendirse` siempre (ADR-5: nunca acciones
 * que fallarán por validación; operan sobre el estado interno completo,
 * anti-cheat: los payloads solo referencian ids visibles al jugador, 6.2).
 *
 * Alcance C3: pre_partida (mulligan/pasar_mulligan del decisor, orden A→B)
 * + rendirse. C4: forja/choque → pasar_turno; ocaso → pasar_turno (mano ≤ 6)
 * + descartar_carta por carta en mano. El resto de acciones llega en C5.
 */
export function getValidActions(state: GameState, playerId: PlayerId): Action[] {
  if (state.fase === 'terminada') return []
  const acciones: Action[] = [{ type: 'rendirse' }]

  if (state.turno === playerId && state.fase === 'pre_partida') {
    const p = state.players[playerId]
    // Mulligan opcional, 1 vez POR JUGADOR (manual §2) — el rival no afecta
    // tu derecho a mulliganear.
    if (!p.mulliganUsado) acciones.push({ type: 'mulligan' })
    acciones.push({ type: 'pasar_mulligan' })
  }

  if (state.turno === playerId) {
    if (state.fase === 'forja' || state.fase === 'choque') {
      acciones.push({ type: 'pasar_turno' })
    } else if (state.fase === 'ocaso') {
      const p = state.players[playerId]
      if (p.mano.length <= 6) acciones.push({ type: 'pasar_turno' })
      for (const id of p.mano) {
        acciones.push({ type: 'descartar_carta', cardInstanceIds: [id] })
      }
    }
  }

  return acciones
}
