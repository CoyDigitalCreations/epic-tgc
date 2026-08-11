import type { GameEvent } from './events'
import { resolverAlba } from './phases'
import { shuffleFisherYates } from './rng'
import type { Ctx, FaseNombre, GameState, PlayerId } from './types'

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

/**
 * Aplica una acción de forma pura y ATÓMICA (ADR-5):
 * 1. valida READ-ONLY sobre el estado de entrada (sin mutar, sin RNG);
 * 2. si es válida: structuredClone → ejecuta (consume RNG, emite events);
 * 3. si no: { ok:false, state } devuelve el MISMO estado sin cambios.
 * El actor implícito es `state.turno` (jugador activo); toda carta referenciada
 * debe ser del jugador activo (así una acción de B durante el turno de A falla).
 */
export function applyAction(state: GameState, action: Action, ctx: Ctx): ApplyActionResult {
  ctx.events.length = 0 // eventos acumulados de la acción anterior (ADR-5)
  const error = validarAccion(state, action)
  if (error) return { ok: false, state, error }
  const s = structuredClone(state)
  ejecutarAccion(s, action, ctx)
  return { ok: true, state: s, events: [...ctx.events] }
}

function validarAccion(state: GameState, action: Action): string | null {
  switch (action.type) {
    case 'rendirse':
      return state.fase === 'terminada' ? 'la partida ya terminó' : null
    case 'mulligan':
      return validarMulligan(state)
    case 'pasar_mulligan':
      return state.fase !== 'pre_partida' ? 'pasar_mulligan solo en pre_partida' : null
    case 'pasar_turno':
      return validarPasarTurno(state)
    case 'descartar_carta':
      return validarDescartarCarta(state, action)
    default:
      return 'acción no disponible en esta fase'
  }
}

/**
 * Pasar de fase (C4): forja→choque→ocaso→alba del rival (auto-resuelta).
 * En Ocaso solo se puede pasar con mano ≤ 6 (manual §8).
 */
function validarPasarTurno(state: GameState): string | null {
  const p = state.players[state.turno]
  switch (state.fase) {
    case 'forja':
    case 'choque':
      return null
    case 'ocaso':
      return p.mano.length > 6 ? 'no puedes pasar el turno con más de 6 cartas en mano' : null
    case 'pre_partida':
      return 'pasar_turno solo durante la partida'
    case 'terminada':
      return 'la partida terminó'
  }
}

/** Descartar en Ocaso (manual §8): cartas propias en mano, sin duplicados. */
function validarDescartarCarta(state: GameState, action: Extract<Action, { type: 'descartar_carta' }>): string | null {
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

function validarMulligan(state: GameState): string | null {
  if (state.fase !== 'pre_partida') return 'mulligan solo en pre_partida'
  // Manual §2: "Solo una vez por jugador" — cada jugador decide su mulligan
  // independientemente del rival (fiel al físico, #1212).
  const activo = state.players[state.turno]
  if (activo.mulliganUsado) return 'el mulligan ya se usó'
  return null
}

function ejecutarAccion(s: GameState, action: Action, ctx: Ctx): void {
  switch (action.type) {
    case 'rendirse': {
      ctx.emit({ type: 'rendicion', jugador: s.turno })
      const ganador: PlayerId = s.turno === 'A' ? 'B' : 'A'
      s.fase = 'terminada'
      s.ganador = ganador
      s.motivo = 'rendicion'
      ctx.emit({ type: 'partida_terminada', ganador, motivo: 'rendicion' })
      return
    }
    case 'mulligan': {
      const jugador = s.turno
      const p = s.players[jugador]
      // Devuelve la mano al mazo (40) y baraja: consume 39 extracciones
      const mazoReconstruido = shuffleFisherYates(ctx, [...p.mano, ...p.mazo])
      p.mano = mazoReconstruido.slice(0, 5)
      p.mazo = mazoReconstruido.slice(5)
      p.mulliganUsado = true
      ctx.emit({ type: 'mulligan_realizado', jugador })
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_mulligan': {
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_turno': {
      ejecutarPasarTurno(s, ctx)
      return
    }
    case 'descartar_carta': {
      ejecutarDescartarCarta(s, action, ctx)
      return
    }
  }
}

/** Cede el turno de mulligan (A luego B); cuando ambos deciden, la partida inicia. */
function avanzarMulligan(s: GameState, ctx: Ctx): void {
  const decisor = s.turno
  s.turno = decisor === 'A' ? 'B' : 'A'
  if (decisor === 'B') iniciarPartida(s, ctx)
}

/**
 * Secuencia de arranque (ADR-5): partida_iniciada, turno_iniciado,
 * fase_iniciada{alba}, Alba auto-resuelta (robar 1), fase_iniciada{forja}.
 */
function iniciarPartida(s: GameState, ctx: Ctx): void {
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
function ejecutarPasarTurno(s: GameState, ctx: Ctx): void {
  if (s.fase === 'forja' || s.fase === 'choque') {
    const siguiente: FaseNombre = s.fase === 'forja' ? 'choque' : 'ocaso'
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
function ejecutarDescartarCarta(s: GameState, action: Extract<Action, { type: 'descartar_carta' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const descartadas: string[] = []
  for (const id of action.cardInstanceIds) {
    const idx = p.mano.indexOf(id)
    if (idx === -1) continue // validado antes (defensivo)
    p.mano.splice(idx, 1)
    p.cementerio.push(id)
    descartadas.push(id)
  }
  if (descartadas.length > 0) {
    ctx.emit({ type: 'carta_descartada', jugador: s.turno, cardInstanceIds: descartadas })
  }
}
