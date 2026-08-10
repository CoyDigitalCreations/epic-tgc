import type { CardType, Rarity, Keyword, Faccion, Esencia, Rol, CatHabilidad } from './enums'

/** Base stats shared by all cards */
export interface BaseStats {
  cost: number
}

/** Stats for cards that can fight (solo Campeón en v2.0) */
export interface CombatStats extends BaseStats {
  poder: number
  resistencia: number
}

/** Stats for Táctica cards */
export interface TacticaStats extends BaseStats {
  duracion: number
}

/** Base card metadata */
export interface CardMeta {
  id: string
  name: string
  type: CardType
  rarity: Rarity
  keywords: Keyword[]
  imageUrl?: string
  /** true cuando la imagen vive en IndexedDB (no en localStorage) — ver utils/image-store.ts */
  hasImage?: boolean
  flavorText: string
  createdAt: string
  updatedAt: string
  /** Taxonomy (primarily for Campeón): hasta 3 facciones */
  facciones?: Faccion[]
  esencia?: Esencia
  /** Roles (taxonomía, principalmente para Campeón): hasta 2 */
  roles?: Rol[]
  catHabilidad?: CatHabilidad
  /** Copy limit: '1' | '2' | '3' (string to match form select) */
  limiteCopias?: string
  /** Paquete/set al que pertenece la carta (ver types/paquetes.ts) */
  paqueteId?: string
}

/** Card type discriminated payloads */
export interface CampeonCard extends CardMeta {
  type: 'Campeón'
  stats: CombatStats
  tipoEfecto?: 'Pasivo' | 'Activo' | 'Especial'
  /** Habilidades Activas: 'Continua' o 'Un Solo Uso' (v2.0) */
  tipoHabilidad?: 'Continua' | 'Un Solo Uso'
  efectoPasivo?: string
  efectoActivo?: string
}

export interface MisticaCard extends CardMeta {
  type: 'Mística'
  /** No tienen Poder ni Resistencia — son puramente conjuros (5.3) */
  stats: BaseStats
  efecto: string
}

export interface TacticaCard extends CardMeta {
  type: 'Táctica'
  /** No cuestan Éter (5.4): cost se ignora en la UI */
  stats: TacticaStats
  descripcion: string
}

export interface ArcanaCard extends CardMeta {
  type: 'Arcana'
  stats: BaseStats
  condicion: string
  recompensa: string
}

export interface CombateCard extends CardMeta {
  type: 'Combate'
  /** No cuestan Éter (5.6): cost se ignora en la UI */
  stats: BaseStats
  descripcion: string
}

export interface EterCard extends CardMeta {
  type: 'Éter'
  /** No combaten: valen 1 en v2.0 (7.7). Sin Poder ni Resistencia */
  stats: BaseStats
  /** Efecto en zona RESERVA (2A) */
  efectoReserva?: string
  /** Efecto en zona PAGO (1A) — pasivo o gatillo */
  efectoPago?: string
  variantePago?: 'Pasivo' | 'Gatillo'
  /** Efecto en zona BLOQUEO (1B-1F) */
  efectoBloqueo?: string
}

export interface VinculoCard extends CardMeta {
  type: 'Vínculo'
  /** No cuestan Éter (5.7) */
  stats: BaseStats
  /** Efecto PERMANENTE a favor del dueño al ser destruido */
  efecto: string
}

/** Discriminated union of all card types */
export type AnyCard =
  | CampeonCard
  | MisticaCard
  | TacticaCard
  | ArcanaCard
  | CombateCard
  | EterCard
  | VinculoCard
