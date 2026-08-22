/**
 * Barrel re-export: actions.ts
 * Todo el logic fue extraido a modulos de dominio (change: refactor-engine).
 * Este archivo solo re-exporta para mantener backward compatibility.
 */
export type { Action, ApplyActionResult } from './core'
export { applyAction } from './core'
export { generarAccionesForja } from './movimientos'
export { validarActivarArcana, validarActivarHabilidad } from './habilidades'
