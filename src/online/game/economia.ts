/**
 * Economía de éter — bloquear éter.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 * Fase 3a: targetInstanceId (Campeón o Artefacto en campo).
 */
import type { GameState, Ctx } from './types'
import { validarBloqueo, bloquearEter } from './payments'
import { dispararUmbralBloqueo } from './effectInterpreter'
import type { Action } from './core'
import { cadenaActiva } from './chain'

/* ─────────────────────── Validador ─────────────────────── */

/**
 * Actor del bloqueo: en una cadena abierta, la PRIORIDAD (puede ser el rival
 * del turno — A9: el bloqueo de Éter es una activación de continuo válida
 * COMO RESPUESTA, §8.3a); fuera de cadena, el jugador activo.
 */
function actorDeBloqueo(state: GameState): GameState['turno'] {
  const cadena = cadenaActiva(state)
  return cadena ? cadena.prioridad : state.turno
}

export function validarBloquearEter(state: GameState, action: Extract<Action, { type: 'bloquear_eter' }>): string | null {
  // §8.3a + decisión A9 (2026-10-22): cualquier fase EXCEPTO Alba — incluido
  // Choque y como respuesta dentro de una cadena. (La Alba es auto-resuelta
  // y nunca es estado observable, ADR-3.)
  if (state.fase !== 'forja' && state.fase !== 'choque' && state.fase !== 'ocaso') {
    return 'bloquear_eter solo en Forja/Choque/Ocaso (§8.3a: nunca en Alba)'
  }
  // Decisión del usuario (2026-10-26): un efecto continuo (bloquear Éter) solo puede usarse COMO RESPUESTA
  // dentro de una cadena durante la Forja; no agota al Campeón (eso mantiene útiles a los efectos Disparo)
  if (cadenaActiva(state) && state.fase !== 'forja') return 'un efecto continuo solo puede responder en la Forja (§8.3a)'
  return validarBloqueo(state, actorDeBloqueo(state), action.eterIds, action.targetInstanceId, action.efectoIdx)
}

/* ──────────────────── Ejecución ──────────────────── */

/** Bloqueo: 2A → target.eterBloqueado. Tras bloquear, chequea one-shot de umbral (FB-032). */
export function ejecutarBloquearEter(s: GameState, action: Extract<Action, { type: 'bloquear_eter' }>, ctx: Ctx): void {
  bloquearEter(s, ctx, actorDeBloqueo(s), action.eterIds, action.targetInstanceId, action.efectoIdx)
  // Fase 3a Phase D: one-shot al alcanzar umbral de costo-bloqueado
  dispararUmbralBloqueo(s, ctx, action.targetInstanceId)
}
