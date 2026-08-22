/**
 * Flujo de partida — mulligan, turnos, fases, descartes, rendición.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 */
import type { GameState, Ctx, PlayerId, FaseNombre } from './types'
import { shuffleFisherYates } from './rng'
import { purgarEfectosTemporales, purgarKeywordsTemporales, dispararTrigger } from './efectos'
import { resolverFaseEfectos } from './effectRegistry'
import { limpiarCombate, resolverAlba } from './phases'
import { enviarAlCementerio } from './replacements'
import type { Action } from './core'

/* ─────────────────────── Validadores ─────────────────────── */

export function validarMulligan(state: GameState): string | null {
  if (state.fase !== 'pre_partida') return 'mulligan solo en pre_partida'
  // Manual §2: "Solo una vez por jugador" — cada jugador decide su mulligan
  // independientemente del rival (fiel al físico, #1212).
  const activo = state.players[state.turno]
  if (activo.mulliganUsado) return 'el mulligan ya se usó'
  return null
}

/**
 * Pasar de fase (C4): forja→choque→ocaso→alba del rival (auto-resuelta).
 * En Ocaso solo se puede pasar con mano ≤ 6 (manual §8).
 */
export function validarPasarTurno(state: GameState): string | null {
  const p = state.players[state.turno]
  switch (state.fase) {
    case 'forja':
      return null
    case 'choque':
      // ADR-11: solo se pasa con el combate RESUELTO (paso 'resolucion');
      // la limpieza del estado ocurre en la transición choque→ocaso.
      return state.combate && state.combate.paso !== 'resolucion'
        ? 'resuelve el combate antes de pasar el turno'
        : null
    case 'ocaso':
      return p.mano.length > 6 ? 'no puedes pasar el turno con más de 6 cartas en mano' : null
    case 'pre_partida':
      return 'pasar_turno solo durante la partida'
    case 'terminada':
      return 'la partida terminó'
  }
}

/** Descartar en Ocaso (manual §8): cartas propias en mano, sin duplicados. */
export function validarDescartarCarta(state: GameState, action: Extract<Action, { type: 'descartar_carta' }>): string | null {
  if (state.fase !== 'ocaso') return 'descartar_carta solo en Ocaso'
  if (action.cardInstanceIds.length === 0) return 'no indicaste cartas para descartar'
  if (new Set(action.cardInstanceIds).size !== action.cardInstanceIds.length) {
    return 'no puedes descartar cartas duplicadas'
  }
  const p = state.players[state.turno]
  for (const id of action.cardInstanceIds) {
    if (!p.mano.includes(id)) return `la carta no está en tu mano: ${id}`
  }
  return null
}

/* ──────────────────── Ejecución ──────────────────── */

/** Cede el turno de mulligan (A luego B); cuando ambos deciden, la partida inicia. */
export function avanzarMulligan(s: GameState, ctx: Ctx): void {
  const decisor = s.turno
  s.turno = decisor === 'A' ? 'B' : 'A'
  if (decisor === 'B') iniciarPartida(s, ctx)
}

/**
 * Secuencia de arranque (ADR-5): partida_iniciada, turno_iniciado,
 * fase_iniciada{alba}, Alba auto-resuelta (robar 1), fase_iniciada{forja}.
 */
export function iniciarPartida(s: GameState, ctx: Ctx): void {
  const pj = s.primerJugador
  s.fase = 'forja'
  s.turno = pj
  s.primerTurno = true
  ctx.emit({ type: 'partida_iniciada', primerJugador: pj })
  ctx.emit({ type: 'turno_iniciado', jugador: pj })
  ctx.emit({ type: 'fase_iniciada', fase: 'alba', jugador: pj })
  resolverAlba(s, ctx, pj)
  // Si el primer robo agotó el mazo (defensivo), la partida ya terminó y no hay forja
  if (s.fase === 'forja') {
    ctx.emit({ type: 'fase_iniciada', fase: 'forja', jugador: pj })
  }
}

/**
 * Transiciones de fase (C4): forja→choque→ocaso→alba del rival (auto-resuelta).
 * Al pasar Ocaso el turno cambia al rival y su Alba se resuelve DENTRO de la
 * misma acción (ADR-3): turno_iniciado, fase_iniciada{alba}, Alba, fase_iniciada{forja}.
 */
export function ejecutarPasarTurno(s: GameState, ctx: Ctx): void {
  if (s.fase === 'forja' || s.fase === 'choque') {
    const siguiente: FaseNombre = s.fase === 'forja' ? 'choque' : 'ocaso'
    if (s.fase === 'choque') {
      limpiarCombate(s) // ADR-11: limpieza defensiva al salir de Choque
      // Effect Registry: resolver efectos de fase 'ocaso' antes de la purga legacy
      resolverFaseEfectos(s, ctx, 'ocaso', s.turno)
      // C1 (ADR-22): al llegar el Ocaso expiran los efectos 'ocaso' del turno
      // en curso (ambos jugadores) y las keywordsTemporales otorgadas.
      purgarEfectosTemporales(s, 'ocaso', undefined, ctx)
      purgarKeywordsTemporales(s)
    }
    if (s.fase === 'forja') {
      // C2 (ADR-24): al inicio del Choque del jugador activo se disparan
      // efectos de inicio-choque: Éteres en Reserva (FB-002/DS-003) Y Arcanas
      // propias en campo (DS-032 al-inicio-choque, change 4).
      const p = s.players[s.turno]
      const arcanas = p.campo.arcanasCombate.filter((x): x is string => x !== null)
      if (p.eterReserva.length > 0 || arcanas.length > 0) {
        dispararTrigger(s, ctx, 'al-inicio-choque', s.turno, [...p.eterReserva, ...arcanas])
      }
    }
    s.fase = siguiente
    ctx.emit({ type: 'fase_iniciada', fase: siguiente, jugador: s.turno })
    return
  }
  // Ocaso: fin del turno del jugador activo
  const rival: PlayerId = s.turno === 'A' ? 'B' : 'A'
  if (s.primerTurno && s.turno === s.primerJugador) s.primerTurno = false
  s.turno = rival
  ctx.emit({ type: 'turno_iniciado', jugador: rival })
  ctx.emit({ type: 'fase_iniciada', fase: 'alba', jugador: rival })
  resolverAlba(s, ctx, rival)
  if (s.fase !== 'terminada') {
    s.fase = 'forja'
    ctx.emit({ type: 'fase_iniciada', fase: 'forja', jugador: rival })
  }
}

/** Descarta en Ocaso: mano → cementerio; un solo evento con todos los ids (eventos.ts). */
export function ejecutarDescartarCarta(s: GameState, action: Extract<Action, { type: 'descartar_carta' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const descartadas: string[] = []
  for (const id of action.cardInstanceIds) {
    const idx = p.mano.indexOf(id)
    if (idx === -1) continue // validado antes (defensivo)
    p.mano.splice(idx, 1)
    // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
    enviarAlCementerio(s, ctx, id)
    descartadas.push(id)
  }
  if (descartadas.length > 0) {
    ctx.emit({ type: 'carta_descartada', jugador: s.turno, cardInstanceIds: descartadas })
  }
}
