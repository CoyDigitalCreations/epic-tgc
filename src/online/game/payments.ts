import { esEter, faccionesCompartidas, getCardMeta } from './cards'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Economía de Éter (manual §7.3 + bloqueo facción v2.1):
 * - Aporte base 2: un Éter que comparte facción con la carta pagada vale 1 (2),
 *   el de facción ajena vale ½ (1). Se paga cuando Σ(base 2) ≥ coste × 2.
 * - No hay vuelto: el excedente se pierde (eter_pagado.excedente, manual 7.3).
 * - Bloquear (v2.1): solo Éter de facción compartida con el Campeón; 2A → Campeón.
 * - Reagrupar: en tu Alba, 1A → 2A; el Éter bloqueado permanece en el Campeón.
 *
 * Las funciones mutan el estado YA clonado (ADR-5) y devuelven `s` para encadenar;
 * `validarPago` es read-only y no muta ni consume RNG.
 */

export interface ResultadoPago {
  ok: boolean
  error?: string
  /** Σ aportes en unidades reales (1 propio / ½ ajeno). */
  aportado?: number
  /** Excedente desperdiciado (manual 7.3: "no hay vuelto"). */
  excedente?: number
}

/** Aporte de un Éter en base 2: 2 si comparte facción con la carta pagada (1), 1 si no (½). */
export function aporteDe(eterCardId: string, objetivoCardId: string): number {
  const eter = getCardMeta(eterCardId)
  const objetivo = getCardMeta(objetivoCardId)
  if (!eter || !objetivo) return 0
  return faccionesCompartidas(eter.facciones, objetivo.facciones) ? 2 : 1
}

/** Validación read-only (sin mutar, sin RNG): eterIds en 2A, sin duplicados, Σ ≥ coste × 2. */
export function validarPago(
  state: GameState,
  jugador: PlayerId,
  eterIds: string[],
  objetivoCardId: string,
): ResultadoPago {
  if (eterIds.length === 0) return { ok: false, error: 'no indicaste Éteres para pagar' }
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return { ok: false, error: `carta objetivo desconocida: ${objetivoCardId}` }
  const p = state.players[jugador]
  const vistos = new Set<string>()
  let suma = 0
  for (const id of eterIds) {
    if (vistos.has(id)) return { ok: false, error: `Éter duplicado: ${id}` }
    vistos.add(id)
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!inst || !meta || !esEter(meta)) return { ok: false, error: `no es un Éter: ${id}` }
    if (!p.eterReserva.includes(id)) return { ok: false, error: `el Éter no está en tu Reserva: ${id}` }
    suma += aporteDe(meta.id, objetivoCardId)
  }
  if (suma < objetivo.stats.cost * 2) return { ok: false, error: 'pago insuficiente' }
  const aportado = suma / 2
  return { ok: true, aportado, excedente: aportado - objetivo.stats.cost }
}

/** Paga: mueve eterIds 2A → 1A y emite eter_pagado {jugador, eterIds, costo, aportado, excedente}. */
export function aplicarPago(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  objetivoCardId: string,
): GameState {
  const validado = validarPago(s, jugador, eterIds, objetivoCardId)
  if (!validado.ok || validado.aportado === undefined || validado.excedente === undefined) return s
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return s // defensivo: validarPago ya lo comprobó
  const p = s.players[jugador]
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
    p.eterPagado.push(id)
  }
  ctx.emit({
    type: 'eter_pagado',
    jugador,
    eterIds,
    costo: objetivo.stats.cost,
    aportado: validado.aportado,
    excedente: validado.excedente,
  })
  return s
}

/**
 * Éteres de la Reserva (en orden) que cubren el coste de la carta objetivo,
 * o null si la Reserva completa no alcanza. Base 2 (aporteDe). Read-only.
 * Usado por getValidActions/bot para generar pagos "nunca fallarán".
 */
export function etersParaPagar(state: GameState, jugador: PlayerId, objetivoCardId: string): string[] | null {
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return null
  const p = state.players[jugador]
  const elegidos: string[] = []
  let suma = 0
  for (const id of p.eterReserva) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    elegidos.push(id)
    suma += aporteDe(meta.id, objetivoCardId)
    if (suma >= objetivo.stats.cost * 2) return elegidos
  }
  return null
}

/** Validación read-only del bloqueo: null = válido, string = motivo de rechazo. */
export function validarBloqueo(state: GameState, jugador: PlayerId, eterIds: string[], campeonSlot: number): string | null {
  const p = state.players[jugador]
  const campeonId = p.campo.campeones[campeonSlot]
  if (!campeonId) return 'el slot de Campeón está vacío'
  const instCampeon = state.instances[campeonId]
  const campeon = instCampeon?.cardId ? getCardMeta(instCampeon.cardId) : null
  if (!campeon) return 'Campeón desconocido'
  if (eterIds.length === 0) return 'no indicaste Éteres para bloquear'
  for (const id of eterIds) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!inst || !meta || !esEter(meta)) return `no es un Éter: ${id}`
    if (!p.eterReserva.includes(id)) return `el Éter no está en tu Reserva: ${id}`
    if (!faccionesCompartidas(meta.facciones, campeon.facciones)) {
      return `el Éter no comparte facción con el Campeón: ${id}`
    }
  }
  return null
}

/**
 * Bloqueo facción v2.1: valida TODO (sin mutar) y luego mueve 2A → Campeón.eterBloqueado.
 * Devuelve null si fue válido, o el motivo de rechazo.
 */
export function bloquearEter(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  campeonSlot: number,
): string | null {
  const error = validarBloqueo(s, jugador, eterIds, campeonSlot)
  if (error) return error
  const p = s.players[jugador]
  const campeonId = p.campo.campeones[campeonSlot]!
  const instCampeon = s.instances[campeonId]
  instCampeon.eterBloqueado = [...(instCampeon.eterBloqueado ?? []), ...eterIds]
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
  }
  ctx.emit({ type: 'eter_bloqueado', jugador, eterIds, campeonId })
  return null
}

/** Alba del dueño: 1A → 2A (eter_reagrupado). El Éter bloqueado permanece en el Campeón. */
export function reagruparEter(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]
  if (p.eterPagado.length === 0) return
  const reagrupados = p.eterPagado
  p.eterReserva.push(...reagrupados)
  p.eterPagado = []
  ctx.emit({ type: 'eter_reagrupado', jugador, eterIds: reagrupados })
}
