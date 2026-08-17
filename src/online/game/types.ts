import type { GameEvent } from './events'

export type PlayerId = 'A' | 'B'

/** Fases observables del estado (la Alba es auto-resuelta, ADR-3). */
export type Fase = 'pre_partida' | 'forja' | 'choque' | 'ocaso' | 'terminada'

/** Nombres de fase para fase_iniciada (incluye la Alba auto-resuelta). */
export type FaseNombre = 'alba' | 'forja' | 'choque' | 'ocaso'

/** Motivos de fin de partida (change 2 agrega 'vinculos' — 5.7/13). */
export type MotivoFin = 'mazo_vacio' | 'rendicion' | 'vinculos'

/** Causa de destrucción para destruirCarta (ADR-15) y eventos de destrucción. */
export type CausaDestruccion = 'combate' | 'efecto' | 'ruptura'

/**
 * Expiración de un modificador (ADR-22): 'ocaso' al fin del turno en curso,
 * 'alba-dueño' en la próxima Alba del DUEÑO de la instancia, 'permanente' nunca.
 */
export type ExpiraModificador = 'ocaso' | 'alba-dueño' | 'permanente'

/** Modificador aditivo de stats aplicado a una instancia (ADR-22). */
export interface Modificador {
  stat: 'poder' | 'resistencia'
  valor: number
  expira: ExpiraModificador
}

/** Pasos de la sub-máquina de combate en Choque (9.1, ADR-11). */
export type CombatePaso = 'ataque' | 'bloqueo' | 'resolucion'

/** Zonas del campo según manual.html v2.0 (sección 1). */
export type Zona =
  | 'mano'
  | '1A'
  | '1G'
  | '2A'
  | '2G'
  | '3G'
  | `2${'B' | 'C' | 'D' | 'E' | 'F'}`
  | `3${'A' | 'B' | 'C' | 'D' | 'E' | 'F'}`
  | `4${'A' | 'B' | 'C' | 'D' | 'E' | 'F'}`
  | `1${'B' | 'C' | 'D' | 'E' | 'F'}`

/**
 * Instancia de carta en partida (Modelo B, ADR-2).
 * cardId es `null` SOLO en la proyección visibleState (carta oculta al jugador).
 * agotado/eterBloqueado solo existen en Campeones (2B-2F).
 * bocaArriba SOLO en Vínculos destruidos por Ruptura (4A-4F, ADR-13/L848);
 * el resto de cartas conservan el modelo por zona (L911).
 */
export interface CardInstance {
  cardInstanceId: string
  cardId: string | null
  owner: PlayerId
  agotado?: boolean
  /**
   * Ya atacó este turno (un Campeón ataca UNA vez por turno). Cierra el
   * re-ataque infinito de Carga (sigue agotado tras atacar, L1207) y Vigor
   * (no se agota al atacar, L1208); la Alba del dueño lo borra junto a agotado.
   */
  atacoEsteTurno?: boolean
  /**
   * Activación diferida (§5.5, C4): la carta entró al campo ESTE turno.
   * Tácticas/Arcanas recién colocadas NO pueden responder en la cadena 9.6
   * (solo las de turnos anteriores); la Alba del dueño lo borra (phases.ts).
   */
  entradaEsteTurno?: boolean
  /** Éter bloqueado (1B-1F): ids de Éter sobre este Campeón (6.2: boca arriba). */
  eterBloqueado?: string[]
  /** ID de la carta que robó control de este Campeón (Aurora FB-010). Si el ladrón sale del campo, el control regresa. */
  stolenBy?: string
  /** IDs de Éteres robados por Varek (DS-013). Si Varek sale del campo, regresan al dueño original. */
  stolenEters?: string[]
  /** Override aditivo de keywords (tests con cartas sin la keyword en data; efectos que otorgan keywords). */
  keywords?: string[]
  /** Override aditivo de poder (tests de combate; efectos que modifican poder, patrón keywords). */
  poder?: number
  /** Override aditivo de resistencia (tests de combate; efectos que modifican resistencia, patrón keywords). */
  resistencia?: number
  /** Modificadores de stats activos (ADR-22): Σ aditivo en statsDe (efectos.ts). */
  modificadores?: Modificador[]
   /** Keywords TEMPORALES (ADR-22): expiran en Ocaso (p.ej. Carga/Vigor otorgados por efectos). */
   keywordsTemporales?: string[]
   bocaArriba?: boolean
   /** C2: flag 1/turno para Pasivo 1A (FB-005/DS-006) — se resetea en al-inicio-alba. */
   opcionUsadaEsteTurno?: boolean
}

export interface PlayerState {
  id: PlayerId
  /** Mano: límite 6 (manual §8 Ocaso). */
  mano: string[]
  /** 3G — mazo[0] = tope (roba índice 0). */
  mazo: string[]
  /** 2G. */
  cementerio: string[]
  /** 1G. */
  exilio: string[]
  /** 2A — 15 Éter boca arriba. */
  eterReserva: string[]
  /** 1A — Éter pagado (vuelve a 2A en tu Alba salvo bloqueado). */
  eterPagado: string[]
  campo: {
    /** 2B-2F (5 slots). */
    campeones: (string | null)[]
    /** 3A-3C (3 slots). */
    misticasTacticas: (string | null)[]
    /** 3D-3F (3 slots). */
    arcanasCombate: (string | null)[]
  }
  /** 4A-4F (6 slots, boca abajo). */
  vinculos: (string | null)[]
  mulliganUsado: boolean
}

/** Pila de la cadena 9.6 (ADR-12): pasesConsecutivos es adición interna al shape de la spec. */
export interface CadenaState {
  /** Cartas respondidas en orden de apilado (visibles a ambos, 6.2). */
  pila: string[]
  /** A quién toca responder ahora (defensor primero, L1181-1182). */
  prioridad: PlayerId
  /** Pases consecutivos: 2 → resolución en orden inverso (L1183). */
  pasesConsecutivos: number
  /** Fase en que se abrió la cadena (para resolución contextual). */
  faseAbierta: Fase
  /** Descripción legible del efecto que abrió la cadena (para UI modal). */
  efectoActual?: { jugador: PlayerId; cardInstanceId: string; descripcion: string }
}

/** Sub-máquina de combate en Choque (9.1, ADR-11). Se crea con la PRIMERA declarar_ataque. */
export interface CombateState {
  paso: CombatePaso
  /** Atacantes declarados (ids de Campeones, ya agotados al declarar — L1089). */
  atacantes: string[]
  /** bloqueos: Record<atacanteId, bloqueadorId> (1 bloqueador/ataque y viceversa, L1099). */
  bloqueos: Record<string, string>
  /** true si hay ≥1 ataque sin bloqueador (Ruptura posible, 9.4-A). */
  rupturaDisponible: boolean
  /** Máx 1 Ruptura por turno de ataque (L1111). */
  rupturaUsadaEsteTurno: boolean
  /** Cadena 9.6 abierta tras declarar_ataque o declarar_bloqueo. */
  cadena?: CadenaState
}

/** Estado completo de partida — JSON-serializable (sin referencias circulares). */
export interface GameState {
  version: 1
  seed: number
  fase: Fase
  /** En pre_partida: a quién toca decidir mulligan (A luego B). */
  turno: PlayerId
  primerJugador: PlayerId
  /** true desde el inicio hasta que el turno pasa al rival (change 2: nadie ataca). */
  primerTurno: boolean
  instances: Record<string, CardInstance>
  players: Record<PlayerId, PlayerState>
  /** Sub-máquina de combate en Choque (change 2, ADR-11); undefined fuera de Choque. */
  combate?: CombateState
  /**
   * Cadena de efectos GLOBAL (fuera de combate): prioridad entre jugadores
   * cuando un efecto se activa y el rival puede responder. Se cierra cuando
   * ambos pasan y se resuelve LIFO.
   */
  cadena?: CadenaState
  /** Flag anti-bucle del sexto Vínculo (5.7/13, ADR-16): el hook NO-OP se resuelve UNA vez. */
  sextoVinculoResuelto?: boolean
  /** C2: opciones pendientes de elegir_opcion (Pasivo 1A FB-005/DS-006). */
  opcionesPendientes?: { jugador: PlayerId; eterId: string }[]
  /**
   * C3 (D1): objetivos pendientes de elegir_objetivo — cola FIFO (Vaela+Kael
   * atacan juntos → 2 pendientes). `trigger` guarda el trigger que originó el
   * pendiente; la resolución re-despacha con contextoUso 'objetivo-elegido'.
   */
  objetivosPendientes?: { jugador: PlayerId; instId: string; trigger: string; opciones: string[] }[]
  ganador?: PlayerId
  motivo?: MotivoFin
}

/**
 * Contexto de ejecución: stream RNG único (la posición = extracciones previas,
 * contrato de reproducibilidad) + acumulador de eventos por acción.
 */
export interface Ctx {
  next(): number
  emit(e: GameEvent): void
  readonly events: GameEvent[]
}

/** Opciones de setup: orden de Vínculos elegido por cada jugador (default: filtro Vínculo de deckX). */
export interface SetupOptions {
  vinculosA?: string[]
  vinculosB?: string[]
}
