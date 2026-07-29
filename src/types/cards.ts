import type { CardType, Rarity, Keyword, Element, Faccion, Esencia, Rol, CatHabilidad } from './enums'

/** Base stats shared by all cards */
export interface BaseStats {
  cost: number
}

/** Stats for cards that can fight (Campeón, Mística, Éter) */
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
  element?: Element
  keywords: Keyword[]
  imageUrl?: string
  flavorText: string
  createdAt: string
  updatedAt: string
  /** Taxonomy (primarily for Campeón) */
  faccion?: Faccion
  esencia?: Esencia
  rol?: Rol
  catHabilidad?: CatHabilidad
}

/** Card type discriminated payloads */
export interface CampeonCard extends CardMeta {
  type: 'Campeón'
  stats: CombatStats
  habilidad: string
}

export interface MisticaCard extends CardMeta {
  type: 'Mística'
  stats: CombatStats
  efecto: string
}

export interface TacticaCard extends CardMeta {
  type: 'Táctica'
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
  stats: BaseStats
  descripcion: string
}

export interface EterCard extends CardMeta {
  type: 'Éter'
  stats: CombatStats
  efectoContinuo: string
}

/** Discriminated union of all card types */
export type AnyCard =
  | CampeonCard
  | MisticaCard
  | TacticaCard
  | ArcanaCard
  | CombateCard
  | EterCard
