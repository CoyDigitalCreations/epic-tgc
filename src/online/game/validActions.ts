import { getCardMeta, faccionesCompartidas } from './cards'
import type { Action } from './actions'
import { generarAccionesForja } from './actions'
import type { GameState, PlayerId } from './types'

/**
 * getValidActions(state, playerId) — acciones legales del jugador ACTIVO
 * (state.turno) en la fase activa; `rendirse` siempre (ADR-5: nunca acciones
 * que fallarán por validación; operan sobre el estado interno completo,
 * anti-cheat: los payloads solo referencian ids visibles al jugador, 6.2).
 *
 * Alcance C3: pre_partida (mulligan/pasar_mulligan del decisor, orden A→B).
 * C4: forja/choque → pasar_turno; ocaso → pasar_turno (mano ≤ 6) + descartar.
 * C5: forja → jugar/colocar por carta en mano (generador de payloads que
 * NUNCA fallan) + bloquear_eter por Campeón propio con Éter compartido.
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
    const p = state.players[playerId]
    if (state.fase === 'forja') {
      // Jugadas por carta en mano (el generador garantiza payloads válidos)
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id)
        if (accion) acciones.push(accion)
      }
      // Bloqueo de Éter: por cada Campeón propio con un Éter de facción
      // compartida disponible en la Reserva (faccionesCompartidas).
      p.campo.campeones.forEach((campeonId, slot) => {
        if (!campeonId) return
        const inst = state.instances[campeonId]
        const campeon = inst?.cardId ? getCardMeta(inst.cardId) : null
        if (!campeon) return
        const eterId = p.eterReserva.find((id) => {
          const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
          return meta !== null && faccionesCompartidas(meta.facciones, campeon.facciones)
        })
        if (eterId !== undefined) {
          acciones.push({ type: 'bloquear_eter', eterIds: [eterId], campeonSlot: slot })
        }
      })
      acciones.push({ type: 'pasar_turno' })
    } else if (state.fase === 'choque') {
      acciones.push({ type: 'pasar_turno' })
    } else if (state.fase === 'ocaso') {
      if (p.mano.length <= 6) acciones.push({ type: 'pasar_turno' })
      for (const id of p.mano) {
        acciones.push({ type: 'descartar_carta', cardInstanceIds: [id] })
      }
    }
  }

  return acciones
}
