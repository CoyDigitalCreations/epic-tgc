import { getCardMeta } from './game'
import type { GameEvent, GameState } from './game'

/**
 * Traduce eventos del motor a líneas legibles para el log de partida.
 * Usa el ESTADO COMPLETO (no la vista) para nombrar cartas: es una partida
 * local vs bot y el log es narrativo, no anti-cheat (eso lo cubre 6.2 en el
 * tablero). Eventos de bajo nivel (entrada/salida de zona) se omiten: ruido.
 */
export function formatearEvento(estado: GameState, e: GameEvent): string | null {
  switch (e.type) {
    case 'partida_iniciada':
      return `La partida comienza. ${e.primerJugador} juega primero.`
    case 'turno_iniciado':
      return `Turno de ${e.jugador}.`
    case 'fase_iniciada':
      return `Fase de ${e.jugador}: ${e.fase}.`
    case 'carta_robada':
      return `${e.jugador} roba una carta.`
    case 'carta_invocada': {
      const duenio = estado.instances[e.cardInstanceId]?.owner ?? 'B'
      return `${duenio} juega ${nombreCarta(estado, e.cardInstanceId)} (${e.tipo}).`
    }
    case 'carta_descartada':
      return `${e.jugador} descarta ${e.cardInstanceIds.length} carta(s).`
    case 'eter_pagado':
      return `${e.jugador} paga ${e.costo} de Éter.`
    case 'eter_bloqueado':
      return `${e.jugador} bloquea Éter en ${nombreCarta(estado, e.campeonId)}.`
    case 'eter_reagrupado':
      return `${e.jugador} reagrupa su Éter.`
    case 'mazo_agotado':
      return `¡El mazo de ${e.jugador} se agotó!`
    case 'mulligan_realizado':
      return `${e.jugador} hace mulligan.`
    case 'rendicion':
      return `${e.jugador} se rinde.`
    case 'partida_terminada':
      return `¡Fin de la partida! Gana ${e.ganador} por ${e.motivo}.`
    case 'ataque_declarado':
      return `${e.jugador} declara ataque con ${e.atacanteIds.length} campeón(es).`
    case 'bloqueo_declarado':
      return `${e.jugador} bloquea ${Object.keys(e.asignaciones).length} ataque(s).`
    case 'carta_muerta':
      return `${nombreCarta(estado, e.cardInstanceId)} muere en combate (${e.causa}).`
    case 'destruccion':
      return `${nombreCarta(estado, e.cardInstanceId)} es destruida (${e.causa}).`
    case 'destruccion_prevenida':
      return `${nombreCarta(estado, e.cardInstanceId)} sobrevive (destrucción prevenida).`
    case 'prevenicion_pendiente':
      return `${nombreCarta(estado, e.victimId)} está en peligro: ${nombreCarta(estado, e.fuenteId)} puede prevenir la destrucción.`
    case 'ruptura_realizada': {
      const duenio = estado.instances[e.vinculoId]?.owner ?? 'B'
      return `${nombreCarta(estado, e.atacanteId)} rompe un Vínculo de ${duenio}.`
    }
    case 'respuesta_encadenada':
      return `${e.jugador} responde en la cadena con ${nombreCarta(estado, e.cardInstanceId)}.`
    case 'prioridad_pasada':
      return `${e.jugador} pasa prioridad.`
    case 'carta_entrada_a_zona':
    case 'carta_salida_de_zona':
      return null // ruido de zonas internas
    case 'carta_activada':
      return `${e.jugador} activa ${nombreCarta(estado, e.cardInstanceId)}.`
    case 'carta_devuelta_a_mano':
      return `${nombreCarta(estado, e.cardInstanceId)} vuelve a la mano de ${e.jugador}.`
    case 'carta_exiliada':
      return `${nombreCarta(estado, e.cardInstanceId)} es exiliada (${e.jugador}).`
    case 'campeon_robado':
      return `${e.jugador} roba el Campeón ${nombreCarta(estado, e.cardInstanceId)} a ${e.rival}.`
    case 'eter_robado':
      return `${e.jugador} roba el Éter ${nombreCarta(estado, e.cardInstanceId)} a ${e.rival}.`
    case 'eter_liberado':
      return `Éter liberado: ${nombreCarta(estado, e.cardInstanceId)} (${e.jugador}).`
    case 'eter_movido':
      return `Éter ${nombreCarta(estado, e.cardInstanceId)} movido a ${e.destino} (${e.jugador}).`
    default:
      // Nunca perder eventos del catálogo en el log narrativo
      return `Evento: ${(e as { type: string }).type}`
  }
}

export function nombreCarta(estado: GameState, id: string | null | undefined): string {
  if (!id) return 'una carta'
  const inst = estado.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  return meta?.name ?? 'una carta'
}

/** Eventos que aportan narrativa (filtra el ruido de zonas). */
export function eventosParaLog(estado: GameState, eventos: GameEvent[]): string[] {
  const lineas: string[] = []
  for (const e of eventos) {
    const linea = formatearEvento(estado, e)
    if (linea) lineas.push(linea)
  }
  return lineas
}
