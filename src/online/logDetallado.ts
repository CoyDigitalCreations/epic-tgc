import { getCardMeta } from './game'
import type { GameEvent, GameState } from './game'

/**
 * Log DETALLADO para debugging: muestra TODOS los eventos del motor
 * con información completa (cartas, zonas, estados, etc.).
 * Cubre el catálogo completo de events.ts (ADR-10) — sin eventos "desconocidos".
 */
export function formatearEventoDetallado(estado: GameState, e: GameEvent): string {
  const ts = `[${estado.turno}]`
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
    case 'carta_devuelta_a_mano': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ↩ Devuelve a mano: ${nombre} [${e.jugador}]`
    }
    case 'carta_exiliada': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   🌀 Exilia: ${nombre} [${e.jugador}]`
    }
    case 'campeon_robado': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   🎭 Roba campeón: ${nombre} — ${e.jugador} toma control (era de ${e.rival})`
    }
    case 'eter_robado': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   💎 Roba Éter: ${nombre} — ${e.jugador} toma control (era de ${e.rival})`
    }
    case 'eter_liberado': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ▫ Libera Éter: ${nombre} [${e.jugador}]`
    }
    case 'eter_movido': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ⇄ Mueve Éter: ${nombre} → ${e.destino} [${e.jugador}]`
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
    case 'prevenicion_pendiente': {
      const victima = nombreCarta(estado, e.victimId)
      const fuente = nombreCarta(estado, e.fuenteId)
      return `${ts}   🛡 PREVENCIÓN PENDIENTE: ${victima} en peligro — ${fuente} puede prevenir [${e.jugador}]`
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
    case 'carta_activada': {
      const nombre = nombreCarta(estado, e.cardInstanceId)
      return `${ts}   ⚡ Activa: ${nombre} [${e.jugador}] slot ${e.slot}`
    }
    default: {
      // Guardia: si GameEvent crece, al menos vemos el type crudo
      const tipo = (e as { type: string }).type
      return `${ts}   ℹ Evento: ${tipo}`
    }
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

/** Resumen del estado de un jugador — para diagnosticar "no puedo jugar". */
export function resumenJugador(estado: GameState, j: 'A' | 'B'): string {
  const p = estado.players[j]
  const campo = p.campo.campeones.filter(Boolean).length
  const mist = p.campo.misticasTacticas.filter(Boolean).length
  const arc = p.campo.arcanasCombate.filter(Boolean).length
  const vinc = p.vinculos.filter((v) => v !== null && !estado.instances[v!]?.bocaArriba).length
  return `${j}: mano=${p.mano.length} res=${p.eterReserva.length}É pag=${p.eterPagado.length}É | campo cam=${campo} mist=${mist} arc=${arc} vinc=${vinc}`
}

/**
 * Diagnóstico post-acción: si el actor actual NO tiene jugadas significativas,
 * explica POR QUÉ (mano vacía / sin Éter / cadena abierta / etc.).
 */
export function diagnosticarActor(estado: GameState, actor: 'A' | 'B', accionesTipos: string[]): string | null {
  if (estado.fase === 'terminada') return null

  const cadena = estado.combate?.cadena ?? estado.cadena
  if (cadena) {
    const src = estado.combate?.cadena ? 'combate' : 'global'
    const efecto = cadena.efectoActual?.descripcion ?? cadena.efectoActual?.cardInstanceId ?? '—'
    return `⛓ CADENA ${src.toUpperCase()} abierta — prioridad: ${cadena.prioridad} (fase ${estado.fase}) | efecto: ${efecto} | pases: ${cadena.pasesConsecutivos} | acciones(${actor}): ${accionesTipos.join(',')}`
  }

  if (estado.fase === 'pre_partida') return null // mulligan es válido

  const SIGNIFICATIVAS = new Set([
    'jugar_campeon', 'jugar_mistica', 'colocar_arcana', 'colocar_vinculo',
    'activar_habilidad', 'equipar_artefacto', 'activar_arcana', 'bloquear_eter',
    'declarar_ataque', 'declarar_bloqueo', 'responder_cadena', 'responder_prevenicion',
    'elegir_objetivo', 'elegir_opcion', 'elegir_ruptura', 'usar_transmutar',
    'pasar_turno', 'pasar_prioridad',
  ])
  const jugables = accionesTipos.filter((t) => SIGNIFICATIVAS.has(t))
  if (jugables.length > 0) return null

  const p = estado.players[actor]
  const enEleccion = !!(estado.objetivosPendientes?.[0] || estado.opcionesPendientes?.[0] || estado.preventivosPendientes?.[0])
  if (enEleccion) return null

  let motivo: string
  if (p.mano.length === 0 && p.eterReserva.length === 0) {
    motivo = 'mano VACÍA y SIN Éter en Reserva'
  } else if (p.mano.length === 0) {
    motivo = `mano VACÍA (reserva=${p.eterReserva.length}É)`
  } else if (p.eterReserva.length === 0) {
    motivo = `sin Éter en Reserva (mano=${p.mano.length} cartas)`
  } else {
    motivo = `sin jugadas legales (mano=${p.mano.length}, reserva=${p.eterReserva.length}É)`
  }
  return `${actor} en ${estado.fase.toUpperCase()}: ${motivo} | acciones: ${accionesTipos.join(',') || '(ninguna)'}`
}

/** Eventos detallados — sin filtrar nada. */
export function eventosDetalladosParaLog(estado: GameState, eventos: GameEvent[]): string[] {
  return eventos.map((e) => formatearEventoDetallado(estado, e))
}
