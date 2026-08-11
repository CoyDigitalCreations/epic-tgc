import type { GameEvent } from './events'
import type { GameState } from './types'

/**
 * Acciones atómicas del jugador (superficie de applyAction/getValidActions).
 * `elegir_opcion` es un stub reservado para game-handlers (change 3): nunca
 * válida en el core.
 */
export type Action =
  | { type: 'mulligan' }
  | { type: 'pasar_mulligan' }
  | { type: 'rendirse' }
  | { type: 'pasar_turno' }
  | {
      type: 'jugar_campeon'
      cardInstanceId: string
      slot: number
      eterIds: string[]
      /** Sacrificios Soberano (1) / Emperador (2): ids de Campeones propios. */
      sacrificios?: string[]
    }
  | { type: 'jugar_mistica'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'colocar_tactica'; cardInstanceId: string; slot: number }
  | { type: 'colocar_arcana'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'colocar_combate'; cardInstanceId: string; slot: number }
  | { type: 'bloquear_eter'; eterIds: string[]; campeonSlot: number }
  | { type: 'descartar_carta'; cardInstanceIds: string[] }
  | { type: 'elegir_opcion'; opcionId: string }

export type ApplyActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; state: GameState; error: string }
