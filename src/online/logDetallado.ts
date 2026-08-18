import { getCardMeta } from './game'
import type { GameEvent, GameState } from './game'

/**
 * Log DETALLADO para debugging: muestra TODOS los eventos del motor
 * con información completa (cartas, zonas, estados, etc.).
 * A diferencia de formatearEvento, NO filtra nada.
 */
export function formatearEventoDetallado(estado: GameState, e: GameEvent): string {
  const ts = `[${String(estado.turno)}]`
  switch (e.type) {
    case 'partida_iniciada':
      return `${ts} PARTIDA INICIADA — primer jugador: ${e.primerJugador}`
    case 'turno_iniciado':
      return `${ts} ▶ TURNO DE ${e.jugador}`
    case 'fase_iniciada':
      return `${ts} ── Fase: ${e.fase.toUpperCase()} (${e.jugador})`
    case 'carta_robada': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   Roba: ${nombre} [${e.cardInstanceId}]`
    }
    case 'carta_invocada': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      const owner = estado.instances[e.cardInstanceId]?.owner ?? '?'
      return `${ts}   ★ Invoca: ${nombre} (${e.tipo}) slot ${e.slot} [${owner}]`
    }
    case 'carta_descartada': {
      const nombres = e.cardInstanceIds.map((id) => nombreCarta(estado, id)).join(', ')
      return `${ts}   Descarta ${e.cardInstanceIds.length}: ${nombres}`
    }
    case 'eter_pagado': {
      const nombres = e.eterIds.map((id) => nombreCorto(estado, id)).join(', ')
      return `${ts}   💰 Paga ${e.costo} Éter (aportado: ${e.aportado}): [${nombres}]`
    }
    case 'eter_bloqueado': {
      const campeon = nombreCarta(estado, e.campeonId)
      const nombres = e.eterIds.map((id) => nombreCorto(estado, id)).join(', ')
      return `${ts}   🔒 Bloquea Éter en ${campeon} [${e.campeonId}]: [${nombres}]`
    }
    case 'eter_reagrupado': {
      const nombres = e.eterIds.map((id) => nombreCorto(estado, id)).join(', ')
      return `${ts}   ↩ Reagrupa Éter: [${nombres}]`
    }
    case 'mazo_agotado':
      return `${ts}   ⚠¡MAZO AGOTADO de ${e.jugador}!`
    case 'mulligan_realizado':
      return `${ts}   ${e.jugador} hace mulligan`
    case 'rendicion':
      return `${ts}   🏳 ${e.jugador} SE RINDE`
    case 'partida_terminada':
      return `${ts}   🏆 FIN: ${e.ganador} gana por ${e.motivo}`
    case 'ataque_declarado': {
      const nombres = e.atacanteIds.map((id) => nombreCarta(estado, id)).join(', ')
      return `${ts}   ⚔ Ataque con ${nombres}`
    }
    case 'bloqueo_declarado': {
      const asig = Object.entries(e.asignaciones)
        .map(([atac, def]) => `${nombreCarta(estado, atac)} ← ${nombreCarta(estado, def)}`)
        .join(', ')
      return `${ts}   🛡 Bloqueo: ${asig}`
    }
    case 'carta_muerta': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   💀 ${nombre} MUERE (${e.causa})`
    }
    case 'destruccion': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   🔥 ${nombre} DESTRUIDA (${e.causa})`
    }
    case 'destruccion_prevenida': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ✨ ${nombre} SOBREVIVE (destrucción prevenida)`
    }
    case 'ruptura_realizada': {
      const atacante = nombreCarta(estado, e.atacanteId)
      const vinculo = nombreCarta(estado, e.vinculoId)
      return `${ts}   💥 RUPTURA: ${atacante} rompe ${vinculo} (slot ${e.vinculoSlot})`
    }
    case 'respuesta_encadenada': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ⛓ Responde en cadena: ${nombre}`
    }
    case 'prioridad_pasada':
      return `${ts}   ⏩ ${e.jugador} pasa prioridad`
    case 'carta_entrada_a_zona': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      const owner = estado.instances[e.cardInstanceId]?.owner ?? '?'
      return `${ts}   → ${nombre} entra a ${e.zona} [${owner}]${e.bocaArriba ? ' (boca arriba)' : ' (boca abajo)'}`
    }
    case 'carta_salida_de_zona': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ← ${nombre} sale de ${e.zona}`
    }
    default:
      return `${ts} [evento desconocido: ${(e as { type: string }).type}]`
  }
}

function nombreCarta(estado: GameState, id: string | null | undefined): string {
  if (!id) return '???'
  const inst = estado.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  return meta?.name ?? id
}

function nombreCorto(estado: GameState, id: string): string {
  const inst = estado.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  return meta?.name?.split(',')[0] ?? id
}

/** Eventos detallados — sin filtrar nada. */
export function eventosDetalladosParaLog(estado: GameState, eventos: GameEvent[]): string[] {
  return eventos.map((e) => formatearEventoDetallado(estado, e))
}
