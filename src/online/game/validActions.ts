import { getCardMeta, faccionesCompartidas } from './cards'
import type { Action } from './actions'
import { generarAccionesForja } from './actions'
import { atacantesElegibles, asignacionForzada, rivalDe } from './combat'
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
 * C2: choque → sub-máquina (9.1): paso ataque (declarar_ataque del activo),
 * paso bloqueo (declarar_bloqueo FORZOSO del DEFENSOR — excepción al "solo
 * jugador activo": en paso bloqueo el actor es el RIVAL, ADR-11), paso
 * resolución (pasar_turno con limpieza). (R12, R15)
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
      const combate = state.combate
      if (!combate) {
        // Paso ataque (9.2): 1 acción "todos los elegibles" + 1 por Campeón
        // (el payload mínimo nunca falla; primerTurno/cansados ya excluidos).
        const elegibles = atacantesElegibles(state)
        if (elegibles.length > 0) {
          acciones.push({ type: 'declarar_ataque', atacanteIds: elegibles })
          for (const id of elegibles) {
            acciones.push({ type: 'declarar_ataque', atacanteIds: [id] })
          }
        }
        acciones.push({ type: 'pasar_turno' })
      } else if (combate.paso === 'resolucion') {
        // Resolución completada (9.4): se puede pasar; la limpieza del
        // combate ocurre en la transición choque→ocaso (ADR-11).
        acciones.push({ type: 'pasar_turno' })
      }
      // Paso bloqueo: el actor es el DEFENSOR (rival) — el activo no tiene
      // acciones propias hasta resolver el bloqueo (R15).
    } else if (state.fase === 'ocaso') {
      if (p.mano.length <= 6) acciones.push({ type: 'pasar_turno' })
      for (const id of p.mano) {
        acciones.push({ type: 'descartar_carta', cardInstanceIds: [id] })
      }
    }
  } else if (state.fase === 'choque' && playerId === rivalDe(state) && state.combate?.paso === 'bloqueo') {
    // Bloqueo forzoso (9.3): 1 greedy determinista para el DEFENSOR — no hay
    // variante "no bloquear" (ej.2) ni sub-asignaciones (ej.6, ADR-19).
    const asignaciones = asignacionForzada(state)
    if (asignaciones) acciones.push({ type: 'declarar_bloqueo', asignaciones })
  }

  return acciones
}
