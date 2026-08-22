/**
 * Economía de éter — bloquear éter.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 */
import type { GameState, Ctx } from './types'
import { validarBloqueo } from './payments'
import type { Action } from './core'

/* ─────────────────────── Validador ─────────────────────── */

export function validarBloquearEter(state: GameState, action: Extract<Action, { type: 'bloquear_eter' }>): string | null {
  if (state.fase !== 'forja') return 'bloquear_eter solo en Forja'
  return validarBloqueo(state, state.turno, action.eterIds, action.campeonSlot)
}

/* ──────────────────── Ejecución ──────────────────── */

/** Bloqueo facción v2.1: 2A → Campeón.eterBloqueado (el clon ya fue validado). */
export function ejecutarBloquearEter(s: GameState, action: Extract<Action, { type: 'bloquear_eter' }>, ctx: Ctx): void {
  const error = validarBloqueo(s, s.turno, action.eterIds, action.campeonSlot)
  if (error) return // defensivo: ya validado en validarAccion
  const p = s.players[s.turno]
  const campeonId = p.campo.campeones[action.campeonSlot]!
  const instCampeon = s.instances[campeonId]
  instCampeon.eterBloqueado = [...(instCampeon.eterBloqueado ?? []), ...action.eterIds]
  for (const id of action.eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
  }
  ctx.emit({ type: 'eter_bloqueado', jugador: s.turno, eterIds: action.eterIds, campeonId })
}
