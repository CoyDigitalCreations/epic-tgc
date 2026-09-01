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
 * The engine reads this instead of parsing text with regex.
 * `texto` field is AUTO-GENERATED (not user-editable).
 *
 * Based on analysis of all 65 cards: 45 unique patterns, 8 duplicate groups, 8 edge cases.
 */
export interface EfectoData {
  /** Effect type — which zone/phase this effect belongs to */
  tipo: 'pasivo' | 'continuo' | 'disparo' | 'reserva' | 'pago' | 'bloqueo' | 'hechizo' | 'vinculo'
  /** Cost type — what the player must pay to activate */
  costoTipo?: 'ninguno' | 'eter' | 'eter_bloqueado' | 'exhaust'
  /** Maximum cost value (e.g., "hasta un máximo de 2 Éter") */
  costoMax?: number
  /** Zone where this effect can be activated from */
  zonaActivacion?: 'reserva' | 'pago' | 'bloqueo' | 'campo'
  /** How often this effect can be used */
  frecuencia?: '1_por_turno' | 'ilimitado'
  /** Target — structured target with type, controller, zone and filters */
  objetivo?: ObjetivoEfecto
  /** Effect action — what this effect DOES */
  efecto?: 'buff' | 'debuff' | 'destruir' | 'robar' | 'invocar_cementerio'
         | 'devolver_mano' | 'equipar' | 'modificar_stat' | 'keyword'
         | 'toggle_agotamiento' | 'steal_champion' | 'steal_ether' | 'release_ether'
         | 'return_ether' | 'force_return_ether' | 'rival_discard'
         | 'conditional_trigger' | 'equip_grant_ability' | 'prevent_destroy'
         | 'exile' | 'mover_ether' | 'bloquear_ether'
  /** Stat modifications (positive = buff, negative = debuff) */
  stats?: { ATQ?: number; RES?: number }
  /** Stats while in reserve (for effects that change based on zone) */
  statsReserva?: { ATQ?: number; RES?: number }
  /** Keyword to grant */
  keyword?: string
  /** Duration — how long this effect lasts */
  duracion?: 'permanente' | 'turno' | 'hasta_alba' | 'mientras_ester_bloqueado' | 'n_turnos'
           | 'mientras_en_campo' | '1_por_turno' | 'mientras_equipped' | 'instant'
  /** Number of turns for duracion='n_turnos' */
  duracionTurnos?: number
  /** Trigger condition — when this effect activates */
  trigger?: 'al_invocar' | 'al_atacar' | 'al_matar_en_combate' | 'al_pagar_eter'
          | 'inicio_choque' | 'inicio_alba' | 'al_jugar_mistica'
          | 'al_resolver_cadena' | 'al_activar_habilidad' | 'al_ser_enviado_al_cementerio'
          | 'al_ser_destruido_vinculo' | 'ninguno'
  /** Activation condition (structured — for Arcanas and conditional effects) */
  condicion?: string
  /** Quantity — how many cards this effect affects (default: 1) */
  cantidad?: number
  /** Maximum number of targets */
  maxObjetivos?: number
  /** Human-readable text (AUTO-GENERATED from fields — not user-editable) */
  texto?: string
  /** Regroup ether — "Al inicio de la fase [X], reagrupa el Éter usado" */
  reagrupar?: { fase: 'alba' | 'choque'; turno: 'propio' | 'oponente' }
  /** Secondary condition (structured — appears when trigger has prerequisite) */
  condicionSecundaria?: CondicionSecundaria
}

/** Structured target — 3-layer system: type + controller + zone + filters */
export interface ObjetivoEfecto {
  /** Type of card targeted */
  tipo: 'self' | 'campeon' | 'mistica' | 'arcana' | 'eter' | 'carta' | 'mano'
  /** Who controls the target */
  controlador: 'propio' | 'rival' | 'ambos'
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

/** Structured secondary condition — no free text */
export interface CondicionSecundaria {
  /** Condition type */
  tipo: 'controlar_campeones' | 'controlar_eter_bloqueado' | 'controlar_otro_campeon'
  /** Minimum count (for "2+ campeones" patterns) */
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
