import type { CardType, Rarity, Keyword, Faccion, Esencia, Rol, CatHabilidad } from './enums'
export type { CardType }

/** Base stats shared by all cards */
export interface BaseStats {
  cost: number
}

/** Stats for cards that can fight (solo Campeón en v2.0) */
export interface CombatStats extends BaseStats {
  poder: number
  resistencia: number
}

/**
 * Structured effect metadata — machine-readable effect parameters.
 * 11-layer system: tipo → trigger → costo → objetivo → efecto → stats → cantidad → keyword → duracion → reagrupar → condicion
 * The engine reads this instead of parsing text with regex.
 * `texto` field is AUTO-GENERATED (not user-editable).
 */
export interface EfectoData {
  // ── Capa 1: TIPO (obligatorio) ──
  /** Effect type — which zone/phase this effect belongs to */
  tipo: 'pasivo' | 'disparo' | 'continuo' | 'comandante' | 'reserva' | 'pago' | 'bloqueo' | 'hechizo' | 'vinculo'

  // ── Capa 2: TRIGGER (opcional) ──
  /** When this effect activates */
  trigger?: 'al_invocar' | 'al_atacar' | 'al_matar_en_combate' | 'al_pagar_eter'
          | 'inicio_choque' | 'inicio_alba' | 'al_jugar_mistica'
          | 'al_resolver_cadena' | 'al_activar_habilidad' | 'al_ser_enviado_al_cementerio'
          | 'al_ser_destruido_vinculo' | 'ninguno'

  // ── Capa 3: COSTO (opcional, anidado) ──
  /** What the player must pay to activate */
  costo?: CostoEfecto

  // ── Capa 4: OBJETIVO (opcional) ──
  /** Who/what this effect acts upon */
  objetivo?: ObjetivoEfecto

  // ── Capa 5: EFECTO (obligatorio) ──
  /** What this effect DOES */
  efecto?: EfectoAccion

  // ── Capa 6: STATS (opcional) ──
  /** Stat modifications for buff/debuff */
  stats?: { ATQ?: number; RES?: number }

  // ── Capa 7: CANTIDAD (opcional) ──
  /** How many cards this affects (for draw, destroy, exile, scry, etc.) */
  cantidad?: number

  // ── Capa 8: KEYWORD (opcional) ──
  /** Keyword to grant (for grant_keyword effect) */
  keyword?: string

  // ── Capa 9: DURACIÓN (opcional) ──
  /** How long this effect lasts */
  duracion?: 'permanente' | 'turno' | 'hasta_alba' | 'mientras_ester_bloqueado'
           | 'mientras_en_campo' | 'mientras_equipped' | '1_por_turno' | 'n_turnos'
  /** Number of turns when duracion='n_turnos' */
  duracionTurnos?: number

  // ── Capa 10: REAGRUPAR (opcional) ──
  /** Regroup ether — "Al inicio de la fase [X], reagrupa el Éter usado" */
  reagrupar?: { fase: 'alba' | 'choque'; turno: 'propio' | 'oponente' }

  // ── Capa 11: CONDICIÓN (solo para Arcana) ──
  /** Activation condition for Arcanas — accepts string (legacy) or CondicionEfecto */
  condicion?: CondicionEfecto | string

  // ── Texto auto-generado ──
  /** Human-readable text (AUTO-GENERATED from fields — not user-editable) */
  texto?: string
}

/** Cost structure — what the player pays */
export interface CostoEfecto {
  /** Cost type */
  tipo: 'ninguno' | 'eter' | 'eter_bloqueado' | 'exhaust'
  /** Amount (for ether costs) */
  cantidad?: number
}

/** All available effect actions */
export type EfectoAccion =
  | 'buff' | 'debuff' | 'destroy' | 'exile' | 'return_hand'
  | 'draw' | 'steal_champion' | 'steal_ether' | 'block_ether'
  | 'free_ether' | 'return_ether' | 'toggle_exhaust' | 'prevent_destroy'
  | 'scry' | 'tutor' | 'counter' | 'copy' | 'redirect'
  | 'double_attack' | 'direct_attack' | 'change_type' | 'grant_keyword'
  | 'recuperar_campo' | 'recuperar_mano' | 'recuperar_mazo'
  | 'recuperar_mazo_barajar' | 'recuperar_mazo_top' | 'recuperar_mazo_bottom'
  | 'recuperar_exilio'
  // Legacy compatibility
  | 'keyword' | 'robar' | 'destruir' | 'bloquear_ether' | 'mover_ether'
  | 'release_ether' | 'devolver_mano' | 'equipar' | 'invocar_cementerio'
  | 'conditional_trigger' | 'equip_grant_ability' | 'force_return_ether'
  | 'rival_discard' | 'modificar_stat'

/** Structured target — 3-layer system: type + controller + zone + filters */
export interface ObjetivoEfecto {
  /** Type of card targeted */
  tipo: 'self' | 'campeon' | 'mistica' | 'arcana' | 'mistica_arcana' | 'eter' | 'carta' | 'mano'
       | 'todos_campeones_propios' | 'todos_campeones_rivales' | 'rival_hand'
  /** Who controls the target */
  controlador: 'propio' | 'rival' | 'ambos' | 'ninguno'
  /** Where the target is located */
  zona: 'campo' | 'cementerio' | 'exilio' | 'reserva' | 'pagado' | 'bloqueado' | 'mano' | 'mazo'
  /** Additional filters */
  filtros?: FiltroObjetivo
}

/** Structured target filter — no free text */
export interface FiltroObjetivo {
  /** Card type to filter by */
  tipoCarta?: 'campeon' | 'mistica' | 'arcana'
  /** Faction to filter by */
  faccion?: Faccion
  /** Essence to filter by */
  esencia?: Esencia
  /** Role to filter by */
  rol?: Rol
  /** Maximum cost */
  costeMax?: number
  /** Maximum ATQ */
  atqMax?: number
  /** Maximum RES */
  resMax?: number
  /** Keywords the card must have */
  keyword?: string
}

/** Structured condition for Arcanas */
export interface CondicionEfecto {
  /** When this condition is checked */
  trigger: 'inicio_choque' | 'inicio_alba' | 'al_atacar' | 'al_invocar' | 'al_resolver_cadena' | 'al_activar_habilidad'
  /** Array of conditions that must ALL be true */
  condiciones: CondicionItem[]
}

/** Individual condition item */
export interface CondicionItem {
  /** Condition type */
  tipo: 'controlar_minimo' | 'controlar_maximo' | 'rival_controla_minimo' | 'rival_controla_maximo'
       | 'tener_mano_minimo' | 'tener_mano_maximo' | 'tener_eter_bloqueado' | 'tener_eter_pagado'
  /** Target of the condition */
  objetivo?: {
    tipo: 'campeon' | 'mistica' | 'arcana' | 'campeon_con_eter' | 'campeon_agotado'
    controlador: 'propio' | 'rival'
    cantidad?: number
    filtros?: FiltroObjetivo
  }
  /** Minimum/maximum count */
  cantidad?: number
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
  /** Hability categories (up to 2) */
  catHabilidad?: CatHabilidad[]
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
  /** Unified effect list — the ONLY source of truth for effects (required after migration) */
  efectos?: EfectoData[]
  /** Comandante effect — applies to ALL champions of same faction you control */
  efectoComandante?: EfectoData
  /** Legacy text fields (optional, kept for backward compat during migration) */
  efectoPasivo?: string
  efectoDisparo?: string
  efectoContinuo?: string
  /** Identificador oculto: ¿el Disparo agota al Campeón? */
  disparoAgota?: boolean
  /** Identificador oculto: ¿el Disparo es de un solo uso? */
  disparoUnSoloUso?: boolean
  /** Legacy structured data (optional, kept for backward compat) */
  efectoPasivoData?: EfectoData
  efectoDisparoData?: EfectoData
  efectoContinuoData?: EfectoData
}

export interface MisticaCard extends CardMeta {
  type: 'Mística'
  /** No tienen Poder ni Resistencia — son puramente conjuros (5.3) */
  stats: BaseStats
  /** Unified effect list */
  efectos?: EfectoData[]
  /** Legacy text field */
  efecto: string
  /** Legacy structured data */
  efectoData?: EfectoData
}

export interface ArcanaCard extends CardMeta {
  type: 'Arcana'
  stats: BaseStats
  /** Unified effect list — first effect is condition, second is reward */
  efectos?: EfectoData[]
  /** Legacy text fields */
  condicion?: string
  recompensa?: string
  efecto?: string
  /** Legacy structured data */
  condicionData?: EfectoData
  recompensaData?: EfectoData
  efectoData?: EfectoData
}

export interface EterCard extends CardMeta {
  type: 'Éter'
  /** No combaten: valen 1 en v2.0 (7.7). Sin Poder ni Resistencia */
  stats: BaseStats
  /** Unified effect list — up to 3 effects (reserva, pago, bloqueo) */
  efectos?: EfectoData[]
  /** Legacy text fields */
  efectoReserva?: string
  efectoPago?: string
  variantePago?: 'Pasivo' | 'Gatillo'
  efectoBloqueo?: string
  /** Legacy structured data */
  efectoReservaData?: EfectoData
  efectoPagoData?: EfectoData
  efectoBloqueoData?: EfectoData
}

export interface VinculoCard extends CardMeta {
  type: 'Vínculo'
  /** No cuestan Éter (5.7) */
  stats: BaseStats
  /** Unified effect list */
  efectos?: EfectoData[]
  /** Legacy text field */
  efecto: string
  /** Legacy structured data */
  efectoData?: EfectoData
}

/** Discriminated union of all card types */
export type AnyCard =
  | CampeonCard
  | MisticaCard
  | ArcanaCard
  | EterCard
  | VinculoCard
