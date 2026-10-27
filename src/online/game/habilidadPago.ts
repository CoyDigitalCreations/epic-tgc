/**
 * Pago de la habilidad de un Campeón (Disparo/Continuo), compartido por `activar_habilidad` (en tu turno) y por
 * responder en una cadena con el Disparo de un Campeón (manual §9.6): ambas cobran igual, con una sola fuente de verdad.
 *
 * Dos patrones según el coste del efecto (§7.7, §8.3a):
 *  - «Bloqueado» (costo-bloqueo): los Éteres de la zona de origen pasan a `Campeón.eterBloqueado`; 1/turno; no agota
 *    (salvo un Continuo, que agota).
 *  - «Paga y Agota» (cualquier otro coste): los Éteres van de la Reserva al Éter Pagado (1A); el Disparo agota al Campeón
 *    salvo que la regla `disparoAgota` esté prohibida (Tirador).
 *
 * Módulo sin dependencias de la cadena (evita el ciclo chain ↔ habilidades).
 */
import { esCostoBloqueo, getCardMeta } from './cards'
import { etiquetarEter } from './eter'
import { hastaAlba, registrarEfectoPendiente } from './effectRegistry'
import { reglaBool } from './reglas'
import type { EfectoData } from '../../shared/types'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Los Éteres con que `jugador` paga el efecto `efecto` de un Campeón (los primeros que le sirven), o null si no puede
 * pagarlo. Misma cuenta que validarActivarHabilidad: «Bloqueado» = el coste exacto desde su zona de origen;
 * «Paga y Agota» = el coste (1 si no declara ninguno) desde la Reserva.
 */
export function eterIdsParaHabilidad(state: GameState, jugador: PlayerId, efecto: EfectoData): string[] | null {
  const p = state.players[jugador]
  const costo = efecto.costo?.cantidad ?? 0
  if (esCostoBloqueo(efecto.costo)) {
    const zona = efecto.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
    if (costo <= 0 || zona.length < costo) return null
    return zona.slice(0, costo)
  }
  const necesarios = costo > 0 ? costo : 1
  return p.eterReserva.length >= necesarios ? p.eterReserva.slice(0, necesarios) : null
}

/** Cobra el coste de la habilidad `efectoSel` del Campeón `instId` y aplica lo que el coste implica (bloqueo, 1/turno, agotar). */
export function pagarHabilidad(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  instId: string,
  efectoSel: EfectoData,
  eterIds: readonly string[],
): void {
  const p = s.players[jugador]
  const inst = s.instances[instId]!
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return

  if (esCostoBloqueo(efectoSel.costo)) {
    // Patrón "Bloqueado": mueve éteres de la zona de ORIGEN (Fase 2 (c): 'reserva' 2A default, 'pagado' 1A)
    // → Campeón.eterBloqueado
    const zonaOrigen = efectoSel.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
    for (const eterId of eterIds) {
      const idx = zonaOrigen.indexOf(eterId)
      if (idx !== -1) zonaOrigen.splice(idx, 1)
    }
    inst.eterBloqueado = [...(inst.eterBloqueado ?? []), ...eterIds]
    // Fase 2: filiación — el efecto activado (índice en efectos[]) es la fuente que bloquea; `jugador` lo pagó.
    const idxSel = meta.efectos?.indexOf(efectoSel) ?? -1
    etiquetarEter(s, [...eterIds], instId, idxSel, jugador)
    // Check if effect has reagrupar (Alba) — register pending effect
    const efectoConReagrupar = meta.efectos && 'efectos' in meta
      ? meta.efectos.find((e) => e.reagrupar && esCostoBloqueo(e.costo))
      : undefined
    if (efectoConReagrupar?.reagrupar) {
      registrarEfectoPendiente(s, {
        fuente: instId,
        owner: jugador,
        triggerFase: efectoConReagrupar.reagrupar.fase,
        triggerOwner: efectoConReagrupar.reagrupar.turno === 'propio' ? 'dueño' : 'rival',
        accion: { tipo: 'liberar-eter', eterIds: [...eterIds], destino: 'reserva' },
        duracion: hastaAlba(),
      })
    }
    ctx.emit({ type: 'eter_bloqueado', jugador, eterIds: [...eterIds], campeonId: instId })
    inst.opcionUsadaEsteTurno = true
    if (efectoSel.tipo === 'continuo') inst.agotado = true
    return
  }

  // Patrón "Agota"/Continuo pago: éteres → 1A (pagado) + 1/turno
  for (const eterId of eterIds) {
    const idx = p.eterReserva.indexOf(eterId)
    if (idx !== -1) p.eterReserva.splice(idx, 1)
    p.eterPagado.push(eterId)
  }
  if (eterIds.length > 0) {
    ctx.emit({ type: 'eter_pagado', jugador, eterIds: [...eterIds], costo: eterIds.length, aportado: eterIds.length })
  }
  if (efectoSel.tipo !== 'disparo') inst.opcionUsadaEsteTurno = true
  // Paga y Agota (§5.2, §8.3a): el Disparo con Éter pagado agota al Campeón, salvo que la regla `disparoAgota` esté
  // prohibida (Tirador, §10). El agotamiento es parte del coste: se paga ya.
  if (efectoSel.tipo === 'disparo' && reglaBool(s, 'disparoAgota', { instId })) inst.agotado = true
}
