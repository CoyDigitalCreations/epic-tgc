import { esEter, faccionesCompartidas, getCardMeta } from './cards'
import { dispararTrigger } from './efectos'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Economía de Éter (manual §7.3 + bloqueo facción v2.1):
 * - Aporte real: un Éter que comparte facción con la carta pagada vale 1,
 *   el de facción ajena vale ½. Se paga cuando Σ aporte ≥ coste.
 * - NO hay sobrepago: el jugador debe seleccionar exactamente el coste.
 * - Bloquear (v2.1): solo Éter de facción compartida con el Campeón; 2A → Campeón.
 *   Límite por campeón según efecto (máx 2 para FB/DS-008, máx 3 para FB/DS-015).
 * - Reagrupar: en tu Alba, 1A → 2A; el Éter bloqueado permanece en el Campeón.
 *
 * Las funciones mutan el estado YA clonado (ADR-5) y devuelven `s` para encadenar;
 * `validarPago` es read-only y no muta ni consume RNG.
 */

/** Contexto de uso del Éter pagado (C2): gatillos dependen de cómo se pagó. */
export interface ContextoUso {
  tipo: 'invocar' | 'jugar' | 'habilidad'
  /** Instancia del Campeón/Mística/Arcana que se está invocando/jugando. */
  cardInstanceId?: string
}

export interface ResultadoPago {
  ok: boolean
  error?: string
  /** Σ aportes en unidades reales (1 propio / ½ ajeno). */
  aportado?: number
}

/** Resultado de validación de pago (sin sobrepago). */
export interface ResultadoPago {
  ok: boolean
  error?: string
  /** Σ aportes en unidades reales (1 propio / ½ ajeno). */
  aportado?: number
}

/** Aporte de un Éter en unidades reales: 1 si comparte facción con la carta pagada, ½ si no. */
export function aporteDe(eterCardId: string, objetivoCardId: string): number {
  const eter = getCardMeta(eterCardId)
  const objetivo = getCardMeta(objetivoCardId)
  if (!eter || !objetivo) return 0
  return faccionesCompartidas(eter.facciones, objetivo.facciones) ? 1 : 0.5
}

/** Validación read-only: exactamente el coste, sin sobrepago. */
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
  if (suma < objetivo.stats.cost) return { ok: false, error: 'pago insuficiente' }
  if (suma > objetivo.stats.cost) return { ok: false, error: 'sobrepago no permitido — selecciona exactamente el coste' }
  return { ok: true, aportado: suma }
}

/** Paga: mueve eterIds 2A → 1A, emite eter_pagado y dispara gatillos al-pagar-eter (C2). */
export function aplicarPago(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  objetivoCardId: string,
  contextoUso?: ContextoUso,
): GameState {
  const validado = validarPago(s, jugador, eterIds, objetivoCardId)
  if (!validado.ok || validado.aportado === undefined) return s
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
  })

  // C2 (ADR-25): gatillos al-pagar-eter por cada Éter con variantePago='Gatillo'
  const gatillos = eterIds.filter((id) => {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    return meta !== null && esEter(meta) && meta.variantePago === 'Gatillo'
  })
  for (const id of gatillos) {
    dispararTrigger(s, ctx, 'al-pagar-eter', jugador, [id], {
      contextoUso: contextoUso?.tipo,
      objetivoId: contextoUso?.cardInstanceId,
    })
  }
  return s
}

/**
 * Éteres de la Reserva (en orden) que cubren el coste de la carta objetivo,
 * o null si la Reserva completa no alcanza (aporteDe). Read-only.
 * Usado por getValidActions/bot para generar pagos "nunca fallarán".
 */
/**
 * Selecciona Éteres de la Reserva que sumen EXACTAMENTE el coste (sin sobrepago).
 * Busca la combinación más pequeña que sume exactamente el coste.
 */
export function etersParaPagar(state: GameState, jugador: PlayerId, objetivoCardId: string): string[] | null {
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return null
  const p = state.players[jugador]
  const coste = objetivo.stats.cost

  // Preparar éteres con su contribución
  const eteres: { id: string; contrib: number }[] = []
  for (const id of p.eterReserva) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    eteres.push({ id, contrib: aporteDe(meta.id, objetivoCardId) })
  }

  // Buscar combinación que sume exactamente el coste (backtrack)
  function buscar(start: number, sumaActual: number, seleccionados: string[]): string[] | null {
    if (sumaActual === coste) return seleccionados
    if (sumaActual > coste) return null
    for (let i = start; i < eteres.length; i++) {
      const resultado = buscar(i + 1, sumaActual + eteres[i].contrib, [...seleccionados, eteres[i].id])
      if (resultado) return resultado
    }
    return null
  }

  return buscar(0, 0, [])
}

/** Límite máximo de Éteres bloqueados por Campeón (balance v2.1). */
const MAX_ETHERS_PER_CHAMPION = 2

/** Validación read-only del bloqueo: null = válido, string = motivo de rechazo. */
export function validarBloqueo(state: GameState, jugador: PlayerId, eterIds: string[], campeonSlot: number): string | null {
  const p = state.players[jugador]
  const campeonId = p.campo.campeones[campeonSlot]
  if (!campeonId) return 'el slot de Campeón está vacío'
  const instCampeon = state.instances[campeonId]
  const campeon = instCampeon?.cardId ? getCardMeta(instCampeon.cardId) : null
  if (!campeon) return 'Campeón desconocido'
  if (eterIds.length === 0) return 'no indicaste Éteres para bloquear'
  // Límite de éteres por campeón
  const actuales = instCampeon.eterBloqueado?.length ?? 0
  if (actuales + eterIds.length > MAX_ETHERS_PER_CHAMPION) {
    return `máximo ${MAX_ETHERS_PER_CHAMPION} Éteres bloqueados por Campeón (tiene ${actuales})`
  }
  for (const id of eterIds) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!inst || !meta || !esEter(meta)) return `no es un Éter: ${id}`
    if (!p.eterReserva.includes(id)) return `el Éter no está en tu Reserva: ${id}`
    if (!faccionesCompartidas(meta.facciones, campeon.facciones)) {
      return `el Éter no comparte facción con el Campeón: ${id}`
    }
    // Defense-in-depth: solo éteres con efecto de bloqueo pueden bloquearse
    if (!meta.efectoBloqueo) {
      return `el Éter no tiene efecto de bloqueo: ${id}`
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
