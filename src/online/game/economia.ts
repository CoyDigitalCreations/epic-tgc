/**
 * Economía de éter — bloquear éter.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 * Fase 3a: targetInstanceId (Campeón o Artefacto en campo).
 */
import type { GameState, Ctx } from './types'
import { validarBloqueo, bloquearEter } from './payments'
import { dispararUmbralBloqueo } from './effectInterpreter'
import type { Action } from './core'

/* ─────────────────────── Validador ─────────────────────── */

export function validarBloquearEter(state: GameState, action: Extract<Action, { type: 'bloquear_eter' }>): string | null {
  if (state.fase !== 'forja') return 'bloquear_eter solo en Forja'
  return validarBloqueo(state, state.turno, action.eterIds, action.targetInstanceId)
}

/* ──────────────────── Ejecución ──────────────────── */

/** Bloqueo: 2A → target.eterBloqueado. Tras bloquear, chequea one-shot de umbral (FB-032). */
export function ejecutarBloquearEter(s: GameState, action: Extract<Action, { type: 'bloquear_eter' }>, ctx: Ctx): void {
  bloquearEter(s, ctx, s.turno, action.eterIds, action.targetInstanceId)
  // Fase 3a Phase D: one-shot al alcanzar umbral de costo-bloqueado
  dispararUmbralBloqueo(s, ctx, action.targetInstanceId)
}
