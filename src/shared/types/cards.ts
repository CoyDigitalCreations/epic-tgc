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
  /** Variante de render: 'normal' (marco estándar) o 'full-art' (arte a sangre completa) */
  variante?: 'normal' | 'full-art'
  /** Notas del diseñador (metadata de autoría — NO afecta el juego ni el render) */
  comentario?: string
}

/** Card type discriminated payloads */
export interface CampeonCard extends CardMeta {
  type: 'Campeón'
  stats: CombatStats
  efectoPasivo?: string
  efectoDisparo?: string
  efectoContinuo?: string
  /** Identificador oculto: ¿el Disparo agota al Campeón? */
  disparoAgota?: boolean
  /** Identificador oculto: ¿el Disparo es de un solo uso? */
  disparoUnSoloUso?: boolean
}

export interface MisticaCard extends CardMeta {
  type: 'Mística'
  /** No tienen Poder ni Resistencia — son puramente conjuros (5.3) */
  stats: BaseStats
  efecto: string
}

export interface ArcanaCard extends CardMeta {
  type: 'Arcana'
  stats: BaseStats
  condicion?: string
  recompensa?: string
  efecto?: string
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
  | ArcanaCard
  | EterCard
  | VinculoCard
