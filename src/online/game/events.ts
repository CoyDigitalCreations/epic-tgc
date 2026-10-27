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

export interface CartaDevueltaAManoEvent {
  type: 'carta_devuelta_a_mano'
  cardInstanceId: string
  jugador: PlayerId
}

export interface CartaExiliadaEvent {
  type: 'carta_exiliada'
  cardInstanceId: string
  jugador: PlayerId
}

export interface CampeonRobadoEvent {
  type: 'campeon_robado'
  cardInstanceId: string
  jugador: PlayerId
  rival: PlayerId
}

export interface EterRobadoEvent {
  type: 'eter_robado'
  cardInstanceId: string
  jugador: PlayerId
  rival: PlayerId
}

export interface EterLiberadoEvent {
  type: 'eter_liberado'
  cardInstanceId: string
  jugador: PlayerId
}

export interface EterMovidoEvent {
  type: 'eter_movido'
  cardInstanceId: string
  // Capa 2 (Doctrina 2026-10-22): un efecto puede mover Éter a cualquier
  // zona que pida — el destino deja de ser solo las zonas naturales.
  destino: 'pagado' | 'reserva' | 'bloqueado' | 'mano' | 'cementerio' | 'exilio'
  jugador: PlayerId
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
  /** ID de instancia target que recibió el Éter bloqueado (Campeón 2B-2F o Artefacto 3A-3F). */
  campeonId: string
}

export interface TramoDisparadoEvent {
  type: 'tramo_disparado'
  jugador: PlayerId
  /** ID de instancia fuente del tramo (la carta con el bloqueo "hasta"). */
  fuenteId: string
  /** Umbral del tramo que se activó (p.ej. 2 o 4 en Cassandra). */
  umbral: number
  /** Efecto del tramo (toggle_exhaust, fix_exhaust, etc.). */
  efecto: string
}

export interface ExhaustFijadoEvent {
  type: 'exhaust_fijado'
  jugador: PlayerId
  /** Campeón cuyo agotamiento queda fijado. */
  campeonId: string
  /** Fuente del fijado (tramo fix_exhaust). */
  fuenteId: string
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
  /** null en un EMPATE (`motivo: 'empate'`, F6). */
  ganador: PlayerId | null
  motivo: MotivoFin
}

// ── Apéndice de combate (change 2, spec #1227 R14 — los 15 del core NO se tocan) ──

export interface AtaqueDeclaradoEvent {
  type: 'ataque_declarado'
  jugador: PlayerId
  /** Campeones atacantes (agotados AL DECLARAR, §9.2). */
  atacanteIds: string[]
}

export interface BloqueoDeclaradoEvent {
  type: 'bloqueo_declarado'
  jugador: PlayerId
  /** asignaciones: Record<atacanteId, bloqueadorId> (1 bloqueador/ataque y viceversa, §9.3). */
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

/** F9d (redirect): `jugador` cambió el objetivo del efecto de `cardInstanceId` (la entrada de la pila redirigida) a `objetivoId`. */
export interface ObjetivoRedirigidoEvent {
  type: 'objetivo_redirigido'
  jugador: PlayerId
  cardInstanceId: string
  objetivoId: string
}

/** F9c (scry): `jugador` mira las `cantidad` cartas del tope de un mazo. El rival sabe cuántas, no cuáles. */
export interface MazoMiradoEvent {
  type: 'mazo_mirado'
  jugador: PlayerId
  cantidad: number
}

/** F9c (scry): `jugador` terminó de ordenar; `arriba` cartas quedan al tope y `fondo` se mandan al fondo. */
export interface MazoOrdenadoEvent {
  type: 'mazo_ordenado'
  jugador: PlayerId
  arriba: number
  fondo: number
}

/** F7: un efecto quiso exiliar una carta que no puede ser exiliada (Inexiliable); se queda donde está. */
export interface ExilioPrevenidoEvent {
  type: 'exilio_prevenido'
  cardInstanceId: string
  jugador: PlayerId
}

export interface PrevenicionPendienteEvent {
  type: 'prevenicion_pendiente'
  /** Vínculo en peligro (aún vivo, destruccionPendiente=true). */
  victimId: string
  /** Fuente con prevent_destroy (Rowena) que puede prevenir. */
  fuenteId: string
  /** Controlador del vínculo — el que debe responder. */
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

/**
 * Ventana de negación (obs 1874): una Mística Presteza (Marcha) canceló la
 * ACTIVACIÓN declarada de activar_habilidad — el pago del activador queda y
 * el efecto no se resuelve. `jugador` = el que niega, `fuente` = la carta
 * que niega (Marcha), `cardInstanceId` = el Campeón cuya activación se niega.
 */
export interface ActivacionNegadaEvent {
  type: 'activacion_negada'
  jugador: PlayerId
  cardInstanceId: string
  fuente: string
}

/**
 * Negar un «efecto activo» (Thane): `jugador` niega los efectos de `cardInstanceId` durante la duración del efecto
 * (no activa ni mantiene sus habilidades, pasivos ni auras; las keywords y el Comandante no se niegan).
 * `fuente` = la carta que niega. Si el objetivo es INEGABLE no se emite.
 */
export interface EfectosNegadosEvent {
  type: 'efectos_negados'
  jugador: PlayerId
  cardInstanceId: string
  fuente: string
}

/**
 * Trigger apilado (F5d-3, decisión 10a): un efecto "al jugar Mística / al invocar / al atacar…"
 * se disparó como consecuencia de una acción de jugador y entró al flujo de la pila (encima de la
 * jugada que lo provocó: resuelve antes que ella). Se emite UNA VEZ por trigger, AL APILAR (cuando
 * arma su elección de objetivo), no al resolver. El objetivo que su dueño elija NO viaja aquí:
 * es información oculta (visibleState no lo des-oculta).
 */
export interface TriggerApiladoEvent {
  type: 'trigger_apilado'
  /** Controlador del efecto (el elector de su objetivo). */
  jugador: PlayerId
  /** Carta fuente del efecto (ya volteada si era oculta). */
  cardInstanceId: string
  /** Trigger interno que se disparó (al-invocar, al-atacar, al-jugar-mistica). */
  trigger: string
  /** Índice del efecto en efectos[] de la carta (una carta puede tener varios con el mismo trigger). */
  efectoIdx: number
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
  | CartaDevueltaAManoEvent
  | CartaExiliadaEvent
  | CampeonRobadoEvent
  | EterRobadoEvent
  | EterLiberadoEvent
  | EterMovidoEvent
  | EterPagadoEvent
  | EterBloqueadoEvent
  | TramoDisparadoEvent
  | ExhaustFijadoEvent
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
  | ExilioPrevenidoEvent
  | PrevenicionPendienteEvent
  | RupturaRealizadaEvent
  | RespuestaEncadenadaEvent
  | PrioridadPasadaEvent
  | CartaActivadaEvent
  | ActivacionNegadaEvent
  | EfectosNegadosEvent
  | TriggerApiladoEvent
  | MazoMiradoEvent
  | MazoOrdenadoEvent
  | ObjetivoRedirigidoEvent

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
  { type: 'carta_devuelta_a_mano', cardInstanceId: 'c1', jugador: 'A' },
  { type: 'carta_exiliada', cardInstanceId: 'c1', jugador: 'A' },
  { type: 'campeon_robado', cardInstanceId: 'c1', jugador: 'A', rival: 'B' },
  { type: 'eter_robado', cardInstanceId: 'c1', jugador: 'A', rival: 'B' },
  { type: 'eter_liberado', cardInstanceId: 'c1', jugador: 'A' },
  { type: 'eter_movido', cardInstanceId: 'c1', destino: 'reserva', jugador: 'A' },
  { type: 'eter_pagado', jugador: 'A', eterIds: ['c2'], costo: 3, aportado: 3 },
  { type: 'eter_bloqueado', jugador: 'A', eterIds: ['c2'], campeonId: 'c1' },
  { type: 'tramo_disparado', jugador: 'A', fuenteId: 'c1', umbral: 2, efecto: 'toggle_exhaust' },
  { type: 'exhaust_fijado', jugador: 'A', campeonId: 'c2', fuenteId: 'c1' },
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
  { type: 'exilio_prevenido', cardInstanceId: 'c1', jugador: 'A' },
  { type: 'prevenicion_pendiente', victimId: 'c3', fuenteId: 'c1', jugador: 'A', causa: 'efecto' },
  { type: 'ruptura_realizada', atacanteId: 'c1', vinculoSlot: 2, vinculoId: 'c3' },
  { type: 'respuesta_encadenada', jugador: 'B', cardInstanceId: 'c4' },
  { type: 'prioridad_pasada', jugador: 'A' },
  { type: 'carta_activada', cardInstanceId: 'c1', jugador: 'A', slot: 0 },
  { type: 'activacion_negada', jugador: 'B', cardInstanceId: 'c1', fuente: 'c4' },
  // Negar un «efecto activo» (Thane): los efectos del Campeón quedan negados un tiempo
  { type: 'efectos_negados', jugador: 'B', cardInstanceId: 'c1', fuente: 'c4' },
  // F5d-3 (decisión 10a): triggers apilados sobre la jugada que los provocó
  { type: 'trigger_apilado', jugador: 'A', cardInstanceId: 'c1', trigger: 'al-jugar-mistica', efectoIdx: 0 },
  // F9c: scry (mirar y ordenar el tope del mazo)
  { type: 'mazo_mirado', jugador: 'A', cantidad: 3 },
  { type: 'mazo_ordenado', jugador: 'A', arriba: 2, fondo: 1 },
  // F9d: redirect (cambiar el objetivo de la entrada inferior de la pila)
  { type: 'objetivo_redirigido', jugador: 'B', cardInstanceId: 'c1', objetivoId: 'c2' },
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
    case 'carta_devuelta_a_mano': return
    case 'carta_exiliada': return
    case 'campeon_robado': return
    case 'eter_robado': return
    case 'eter_liberado': return
    case 'eter_movido': return
    case 'eter_pagado': return
    case 'eter_bloqueado': return
    case 'tramo_disparado': return
    case 'exhaust_fijado': return
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
    case 'exilio_prevenido': return
    case 'prevenicion_pendiente': return
    case 'ruptura_realizada': return
    case 'respuesta_encadenada': return
    case 'prioridad_pasada': return
    case 'carta_activada': return
    case 'activacion_negada': return
    case 'efectos_negados': return
    case 'trigger_apilado': return
    case 'mazo_mirado': return
    case 'mazo_ordenado': return
    case 'objetivo_redirigido': return
    default: assertNunca(tipo)
  }
}


