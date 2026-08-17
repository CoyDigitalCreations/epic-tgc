import type { CardType } from '../../shared/types'
import type { CausaDestruccion, FaseNombre, MotivoFin, PlayerId, Zona } from './types'

/**
 * Catálogo de eventos del motor (contrato central, ADR-5/ADR-10).
 * Los changes 2 (game-combat-chain) y 3 (game-handlers) consumen ESTE catálogo:
 * renombrar/reordenar/eliminar un evento rompe contract.test.ts y tsc -b.
 */

export interface PartidaIniciadaEvent {
  type: 'partida_iniciada'
  primerJugador: PlayerId
}

export interface TurnoIniciadoEvent {
  type: 'turno_iniciado'
  jugador: PlayerId
}

export interface FaseIniciadaEvent {
  type: 'fase_iniciada'
  fase: FaseNombre
  jugador: PlayerId
}

export interface CartaEntradaAZonaEvent {
  type: 'carta_entrada_a_zona'
  cardInstanceId: string
  zona: Zona
  jugador: PlayerId
  bocaArriba: boolean
}

export interface CartaSalidaDeZonaEvent {
  type: 'carta_salida_de_zona'
  cardInstanceId: string
  zona: Zona
  jugador: PlayerId
}

export interface CartaRobadaEvent {
  type: 'carta_robada'
  jugador: PlayerId
  cardInstanceId: string
}

export interface CartaInvocadaEvent {
  type: 'carta_invocada'
  cardInstanceId: string
  tipo: CardType
  slot: number
}

export interface CartaDescartadaEvent {
  type: 'carta_descartada'
  jugador: PlayerId
  cardInstanceIds: string[]
}

export interface EterPagadoEvent {
  type: 'eter_pagado'
  jugador: PlayerId
  eterIds: string[]
  /** Coste de la carta en unidades reales. */
  costo: number
  /** Σ aportes (1 propio / ½ ajeno) en unidades reales. */
  aportado: number
}

export interface EterBloqueadoEvent {
  type: 'eter_bloqueado'
  jugador: PlayerId
  eterIds: string[]
  campeonId: string
}

export interface EterReagrupadoEvent {
  type: 'eter_reagrupado'
  jugador: PlayerId
  eterIds: string[]
}

export interface MazoAgotadoEvent {
  type: 'mazo_agotado'
  jugador: PlayerId
}

export interface MulliganRealizadoEvent {
  type: 'mulligan_realizado'
  jugador: PlayerId
}

export interface RendicionEvent {
  type: 'rendicion'
  jugador: PlayerId
}

export interface PartidaTerminadaEvent {
  type: 'partida_terminada'
  ganador: PlayerId
  motivo: MotivoFin
}

// ── Apéndice de combate (change 2, spec #1227 R14 — los 15 del core NO se tocan) ──

export interface AtaqueDeclaradoEvent {
  type: 'ataque_declarado'
  jugador: PlayerId
  /** Campeones atacantes (agotados AL DECLARAR, L1089). */
  atacanteIds: string[]
}

export interface BloqueoDeclaradoEvent {
  type: 'bloqueo_declarado'
  jugador: PlayerId
  /** asignaciones: Record<atacanteId, bloqueadorId> (1 bloqueador/ataque y viceversa, L1099). */
  asignaciones: Record<string, string>
}

export interface CartaMuertaEvent {
  type: 'carta_muerta'
  cardInstanceId: string
  jugador: PlayerId
  causa: CausaDestruccion
}

export interface DestruccionEvent {
  type: 'destruccion'
  cardInstanceId: string
  jugador: PlayerId
  causa: CausaDestruccion
}

export interface DestruccionPrevenidaEvent {
  type: 'destruccion_prevenida'
  cardInstanceId: string
  jugador: PlayerId
  causa: CausaDestruccion
}

export interface RupturaRealizadaEvent {
  type: 'ruptura_realizada'
  atacanteId: string
  /** Posición 0-5 (4A-4F) del Vínculo rival, elegida a ciegas (ADR-13, 0 RNG). */
  vinculoSlot: number
  vinculoId: string
}

export interface RespuestaEncadenadaEvent {
  type: 'respuesta_encadenada'
  jugador: PlayerId
  cardInstanceId: string
}

export interface PrioridadPasadaEvent {
  type: 'prioridad_pasada'
  jugador: PlayerId
}

export interface CartaActivadaEvent {
  type: 'carta_activada'
  cardInstanceId: string
  jugador: PlayerId
  slot: number
}

export type GameEvent =
  | PartidaIniciadaEvent
  | TurnoIniciadoEvent
  | FaseIniciadaEvent
  | CartaEntradaAZonaEvent
  | CartaSalidaDeZonaEvent
  | CartaRobadaEvent
  | CartaInvocadaEvent
  | CartaDescartadaEvent
  | EterPagadoEvent
  | EterBloqueadoEvent
  | EterReagrupadoEvent
  | MazoAgotadoEvent
  | MulliganRealizadoEvent
  | RendicionEvent
  | PartidaTerminadaEvent
  | AtaqueDeclaradoEvent
  | BloqueoDeclaradoEvent
  | CartaMuertaEvent
  | DestruccionEvent
  | DestruccionPrevenidaEvent
  | RupturaRealizadaEvent
  | RespuestaEncadenadaEvent
  | PrioridadPasadaEvent
  | CartaActivadaEvent

/** Catálogo canónico: un payload de muestra por evento (orden = orden del contrato). */
export const CATALOGO_EVENTOS: readonly GameEvent[] = [
  { type: 'partida_iniciada', primerJugador: 'A' },
  { type: 'turno_iniciado', jugador: 'A' },
  { type: 'fase_iniciada', fase: 'alba', jugador: 'A' },
  { type: 'carta_entrada_a_zona', cardInstanceId: 'c1', zona: '2B', jugador: 'A', bocaArriba: true },
  { type: 'carta_salida_de_zona', cardInstanceId: 'c1', zona: 'mano', jugador: 'A' },
  { type: 'carta_robada', jugador: 'A', cardInstanceId: 'c1' },
  { type: 'carta_invocada', cardInstanceId: 'c1', tipo: 'Campeón', slot: 0 },
  { type: 'carta_descartada', jugador: 'A', cardInstanceIds: ['c1'] },
  { type: 'eter_pagado', jugador: 'A', eterIds: ['c2'], costo: 3, aportado: 3 },
  { type: 'eter_bloqueado', jugador: 'A', eterIds: ['c2'], campeonId: 'c1' },
  { type: 'eter_reagrupado', jugador: 'A', eterIds: ['c2'] },
  { type: 'mazo_agotado', jugador: 'A' },
  { type: 'mulligan_realizado', jugador: 'A' },
  { type: 'rendicion', jugador: 'A' },
  { type: 'partida_terminada', ganador: 'B', motivo: 'rendicion' },
  // Apéndice de combate (change 2, spec #1227 R14)
  { type: 'ataque_declarado', jugador: 'A', atacanteIds: ['c1'] },
  { type: 'bloqueo_declarado', jugador: 'B', asignaciones: { c1: 'c2' } },
  { type: 'carta_muerta', cardInstanceId: 'c2', jugador: 'B', causa: 'combate' },
  { type: 'destruccion', cardInstanceId: 'c2', jugador: 'B', causa: 'combate' },
  { type: 'destruccion_prevenida', cardInstanceId: 'c1', jugador: 'A', causa: 'combate' },
  { type: 'ruptura_realizada', atacanteId: 'c1', vinculoSlot: 2, vinculoId: 'c3' },
  { type: 'respuesta_encadenada', jugador: 'B', cardInstanceId: 'c4' },
  { type: 'prioridad_pasada', jugador: 'A' },
  { type: 'carta_activada', cardInstanceId: 'c1', jugador: 'A', slot: 0 },
]

function assertNunca(x: never): never {
  throw new Error(`Evento inesperado del catálogo: ${String(x)}`)
}

/**
 * Guardia de exhaustividad tipo-level del catálogo: si se añade o quita un
 * evento de la union GameEvent, `tsc -b` falla aquí (default ya no es never).
 * Es el espejo en código fuente del switch del contract.test.ts (ADR-10 mec. 2),
 * necesario porque los tests no entran en el proyecto compilado por tsc -b.
 */
export function validarExhaustividadEventos(tipo: GameEvent['type']): void {
  switch (tipo) {
    case 'partida_iniciada': return
    case 'turno_iniciado': return
    case 'fase_iniciada': return
    case 'carta_entrada_a_zona': return
    case 'carta_salida_de_zona': return
    case 'carta_robada': return
    case 'carta_invocada': return
    case 'carta_descartada': return
    case 'eter_pagado': return
    case 'eter_bloqueado': return
    case 'eter_reagrupado': return
    case 'mazo_agotado': return
    case 'mulligan_realizado': return
    case 'rendicion': return
    case 'partida_terminada': return
    case 'ataque_declarado': return
    case 'bloqueo_declarado': return
    case 'carta_muerta': return
    case 'destruccion': return
    case 'destruccion_prevenida': return
    case 'ruptura_realizada': return
    case 'respuesta_encadenada': return
    case 'prioridad_pasada': return
    case 'carta_activada': return
    default: assertNunca(tipo)
  }
}


