import type { GameEvent } from './events'

export type PlayerId = 'A' | 'B'

/** Fases observables del estado (la Alba es auto-resuelta, ADR-3). */
export type Fase = 'pre_partida' | 'forja' | 'choque' | 'ocaso' | 'terminada'

/** Nombres de fase para fase_iniciada (incluye la Alba auto-resuelta). */
export type FaseNombre = 'alba' | 'forja' | 'choque' | 'ocaso'

/** Motivos de fin de partida del core (change 2 agrega 'vinculos'). */
export type MotivoFin = 'mazo_vacio' | 'rendicion'

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
 */
export interface CardInstance {
  cardInstanceId: string
  cardId: string | null
  owner: PlayerId
  agotado?: boolean
  /** Éter bloqueado (1B-1F): ids de Éter sobre este Campeón (6.2: boca arriba). */
  eterBloqueado?: string[]
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
