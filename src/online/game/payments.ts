import { esEter, getCardMeta, cartaNecesitaEterBloqueado } from './cards'
import type { AnyCard } from '../../shared/types'
import { dispararTrigger } from './efectos'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Economía de Éter (manual §7.3 + bloqueo facción v2.1):
 * - Aporte real: un Éter que comparte facción con la carta pagada vale 1,
 *   el de facción ajena vale ½. Se paga cuando Σ aporte ≥ coste.
 * - NO hay sobrepago: el jugador debe seleccionar exactamente el coste.
 * - Bloquear (v2.1 + Fase 3a): 2A → targetInstanceId.eterBloqueado.
 *   Targets: Campeones (2B-2F) y — Fase 3a Phase B — Artefactos (3A-3F)
 *   con costo-bloqueado en efectos[]. Límite por carta según efecto.
 * - Reagrupar: en tu Alba, 1A → 2A; el Éter bloqueado permanece en la carta.
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

/** Aporte de un Éter: siempre 1 (v2.0 — sin reglas de facción). */
export function aporteDe(eterCardId: string, _objetivoCardId: string): number {
  const eter = getCardMeta(eterCardId)
  if (!eter) return 0
  return 1
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

  // C2 (ADR-25): gatillos al-pagar-eter por cada Éter con trigger='al_pagar_eter' en sus efectos
  const gatillos = eterIds.filter((id) => {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta || !esEter(meta)) return false
    // Check efectos[] with trigger='al_pagar_eter' (JSON interpreter path)
    if ('efectos' in meta && meta.efectos) {
      return meta.efectos.some((e) => e.trigger === 'al_pagar_eter')
    }
    return false
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

/**
 * Validación read-only del bloqueo: null = válido, string = motivo de rechazo.
 * Fase 3a: targetInstanceId — Campeón (2B-2F) o Artefacto (3A-3F, Fase 3a Phase B).
 * El Éter bloqueado vive en `inst.eterBloqueado` de CUALQUIER carta en campo.
 */
export function validarBloqueo(state: GameState, jugador: PlayerId, eterIds: string[], targetInstanceId: string): string | null {
  const inst = state.instances[targetInstanceId]
  if (!inst) return 'la carta no existe'
  const p = state.players[jugador]
  // El target debe estar en el campo del jugador (campeones + artefactos)
  const enCampo =
    p.campo.campeones.includes(targetInstanceId) ||
    p.campo.misticasTacticas.includes(targetInstanceId) ||
    p.campo.arcanasCombate.includes(targetInstanceId)
  if (!enCampo) return 'la carta no está en tu campo'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  // Fase 3a: Campeones siempre; Artefactos (Místicas/Arcanas) solo si tienen
  // efecto con costo-bloqueado en efectos[] (manual §7.7 — soporte continua).
  if (!p.campo.campeones.includes(targetInstanceId)) {
    if (!cartaNecesitaEterBloqueado(meta)) {
      return 'esta carta no tiene efecto que use Éter bloqueado'
    }
  }
  if (eterIds.length === 0) return 'no indicaste Éteres para bloquear'

  // Límite máximo de éteres bloqueados por carta (parseado del efecto)
  const maxEter = maxEterBloqueado(meta)
  const actuales = inst.eterBloqueado?.length ?? 0
  if (actuales + eterIds.length > maxEter) {
    return `máximo ${maxEter} Éter(es) bloqueado(s) en esta carta (ya tiene ${actuales})`
  }

  for (const id of eterIds) {
    const eterInst = state.instances[id]
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
    if (!eterInst || !eterMeta || !esEter(eterMeta)) return `no es un Éter: ${id}`
    if (!p.eterReserva.includes(id)) return `el Éter no está en tu Reserva: ${id}`
    // Verificar que el éter no esté ya bloqueado en esta carta ni en ninguna otra del jugador
    if (inst.eterBloqueado?.includes(id)) return `el Éter ya está bloqueado en esta carta`
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      for (const cid of p.campo[grupo]) {
        if (cid && cid !== targetInstanceId) {
          const ci = state.instances[cid]
          if (ci?.eterBloqueado?.includes(id)) return `el Éter ya está bloqueado en otra carta`
        }
      }
    }
  }
  return null
}

/** Extrae el máximo de éteres bloqueados desde efectos[]. Exportado (Fase 3a) — usado por validActions. */
export function maxEterBloqueado(card: AnyCard): number {
  if ('efectos' in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costo?.tipo === 'eter_bloqueado' && e.costo.cantidad !== undefined) {
        return e.costo.cantidad
      }
      if (e.costo?.tipo === 'bloqueo_fijo' && e.costo.cantidad !== undefined) {
        return e.costo.cantidad
      }
    }
  }
  return 1 // default: 1 Éter
}

/**
 * Bloqueo facción v2.1: valida TODO (sin mutar) y luego mueve 2A → target.eterBloqueado.
 * Fase 3a: targetInstanceId — Campeón o (Phase B) Artefacto en campo.
 * Devuelve null si fue válido, o el motivo de rechazo.
 */
export function bloquearEter(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  targetInstanceId: string,
): string | null {
  const error = validarBloqueo(s, jugador, eterIds, targetInstanceId)
  if (error) return error
  const p = s.players[jugador]
  const instTarget = s.instances[targetInstanceId]
  instTarget.eterBloqueado = [...(instTarget.eterBloqueado ?? []), ...eterIds]
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
  }
  // campeonId = id de instancia target (Campeón o Artefacto) — ver events.ts
  ctx.emit({ type: 'eter_bloqueado', jugador, eterIds, campeonId: targetInstanceId })
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
