import type { CardType, Rarity, Keyword, Faccion, Esencia, Rol, CatHabilidad } from './enums'
import type { ModificacionRegla } from '../rules/reglas'
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
          | 'al_resolver_cadena' | 'al_ser_enviado_al_cementerio'
          | 'al_ser_destruido_vinculo' | 'cuando_vinculo_seria_destruido' | 'ninguno'

  // ── Capa 2b: TRIGGER ZONA (opcional) ──
  /** Where the card was when the trigger happened (for al_ser_enviado_al_cementerio) */
  triggerZona?: 'mano' | 'campo' | 'cualquier_zona'

  // ── Capa 2c: TRIGGER CONTROLADOR (opcional) ──
  /** Whose turn the trigger applies to (default: propio) */
  controladorTrigger?: 'propio' | 'rival'

  // ── Capa 2d: CONTEXTO DE USO (opcional) ──
  /** Restricts when this effect fires — e.g., 'invocar' means only when summoning a champion */
  contextoUso?: 'invocar' | 'habilidad' | 'combate' | 'ninguno'

  // ── Capa 3: COSTO (opcional, anidado) ──
  /** What the player must pay to activate */
  costo?: CostoEfecto

  // ── Capa 3b: TRAMOS de Éter bloqueado (opcional) ──
  /** Recompensas por umbrales dentro de UN bloqueo "hasta" (CostoEfecto.cantidad).
   *  Cada tramo se activa cuando Éteres bloqueados >= umbral. El efecto raíz
   *  declara el costo y el objetivo base; los tramos aportan efecto+duración.
   *  Texto: "Con N Éteres bloqueados, <efecto>..." ordenado por umbral. */
  tramos?: TramoEfecto[]

  // ── Capa 4: OBJETIVO (opcional) ──
  /** Who/what this effect acts upon */
  objetivo?: ObjetivoEfecto

  // ── Capa 5: EFECTO (obligatorio) ──
  /** What this effect DOES */
  efecto?: EfectoAccion

  // ── Capa 5c: ZONA ORIGEN (para invocar_y_equipar) ──
  /** De dónde se invoca el campeón (cementerio, exilio, mano, mazo) */
  zonaOrigen?: 'cementerio' | 'exilio' | 'mano' | 'mazo'

  // ── Capa 6: STATS (opcional) ──
  /** Stat modifications for buff/debuff */
  stats?: { ATQ?: number; RES?: number }

  // ── Capa 6b: BUFF PER BLOCKED ETHER ──
  /** When true, the buff applies per blocked ether (e.g., +2 ATQ per blocked ether) */
  buffPerBlockedEther?: boolean

  // ── Capa 6c: CANTIDAD MÁXIMA (tope para buffs escalados) ──
  /** Tope para buffs escalados por buffPerBlockedEther (p.ej. Marek "máx. +3") */
  cantidadMax?: number

  // ── Capa 6d: HASTA (para cantidades flexibles) ──
  /** When true, the quantity is "up to N" instead of exact */
  esHasta?: boolean

  // ── Capa 7: CANTIDAD (opcional) ──
  /** How many cards this affects (for draw, destroy, exile, scry, etc.) */
  cantidad?: number

  // ── Capa 8: KEYWORD (opcional) ──
  /** Keyword to grant (for grant_keyword effect) */
  keyword?: string

  // ── Capa 8b: TIPO NEGACIÓN (opcional) ──
  /** Type of negation (for negar effect) */
  tipoNegacion?: 'invocacion' | 'activacion' | 'resolucion' | 'efecto_activo' | 'pago' | 'ataque' | 'bloqueo' | 'robo'
  // ── Capa 9: DURACIÓN (opcional) ──
  /** How long this effect lasts */
  duracion?: 'permanente' | 'turno' | 'mientras_ester_bloqueado'
           | 'mientras_en_campo' | 'mientras_equipped' | '1_por_turno' | 'n_turnos'
           | 'hasta_fase'
  /** Number of turns when duracion='n_turnos' */
  duracionTurnos?: number
  /** Fase destino when duracion='hasta_fase' */
  duracionFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  /** A quién pertenece la fase when duracion='hasta_fase' */
  duracionControlador?: 'propio' | 'rival'

  // ── Capa 10: REAGRUPAR (opcional) ──
  /** Regroup ether — "Al inicio de la fase [X], reagrupa el Éter usado" */
  reagrupar?: { fase: 'alba' | 'choque'; turno: 'propio' | 'oponente' }

  // ── Capa 11: CONDICIÓN (solo para Arcana) ──
  /** Activation condition for Arcanas — CondicionEfecto estructurado (string legacy eliminado Fase 3e: 0 hits en JSON) */
  condicion?: CondicionEfecto

  // ── Capa 12: FILTROS A NIVEL RAÍZ (opcional) ──
  /** Root-level filters — merged with objetivo.filtros when resolving targets.
   *  Top-level takes precedence. Used by tutor and other filtered effects. */
  filtros?: FiltroObjetivo

  // ── Capa 5b: COPY ATTRIBUTES (solo cuando efecto = 'copy') ──
  /** Qué atributos se copian del objetivo. Solo aplica cuando efecto = 'copy'. */
  copyAttributes?: CopyAttribute[]

  // ── Capa 5d: REGLA MODIFICADA (solo cuando efecto = 'modificar_regla') ──
  /** Qué regla del manual cambia este efecto y cómo (Capa 2: el efecto gana al manual). */
  regla?: ModificacionRegla

  // ── Cambio de tipo (solo cuando efecto = 'change_type') ──
  /**
   * En qué se convierte el Campeón objetivo. Cada atributo presente SUSTITUYE al de la carta (Facción incluida: queda
   * solo la nueva); el que falta no se toca. Dura lo que dure el efecto (`duracion`; sin duración, mientras exista).
   */
  cambioTipo?: { esencia?: Esencia; rol?: Rol; faccion?: Faccion }

  // ── Modificador: SIN ACTIVAR EFECTO ──
  /** When true, the moved/returned ether does NOT trigger its effects (until opponent's Alba) */
  sinActivarEfecto?: boolean

  // ── Texto auto-generado ──
  /** Human-readable text (AUTO-GENERATED from fields — not user-editable) */
  texto?: string
}

/**
 * Atributo copiable por el efecto 'copy'.
 *
 * El motor valida qué atributos son válidos según el tipo de carta objetivo.
 * Cada tipo de carta tiene sus propios atributos copiables.
 */
export type CopyAttribute =
  // ── Campeón ──
  | 'faccion'              // facciones del campeón
  | 'keyword'              // keywords del campeón
  | 'atq'                  // ATQ base (sin mods temporales ni auras)
  | 'res'                  // RES base (sin mods temporales ni auras)
  | 'efecto'               // pasivo/continuo/disparo — NO comandante
  // ── Mística ──
  | 'mistica_hechizo'      // efecto de hechizo
  | 'mistica_continuo'     // efecto continuo
  // ── Arcana ──
  | 'arcana_condicion'     // condición de activación
  | 'arcana_recompensa'    // recompensa
  // ── Éter ──
  | 'eter_reserva'         // efecto en reserva
  | 'eter_pago'            // efecto al pagar
  | 'eter_bloqueo'         // efecto al bloquear
  // ── Vínculo ──
  | 'vinculo_efecto'       // efecto del vínculo

/** Cost structure — what the player pays */
export interface CostoEfecto {
  /** Cost type */
  tipo: 'ninguno' | 'eter' | 'eter_bloqueado' | 'bloqueo_fijo' | 'exhaust' | 'exile_self' | 'cemetery_self'
  /** Amount (for ether costs) */
  cantidad?: number
  /** eter_bloqueado: umbral mínimo de Éter bloqueado para activar el efecto
   * (p.ej. Max. 4, umbral 2 → "con 2 Éteres bloqueados..."). Si falta o es
   * igual a cantidad, el efecto simplemente requiere el bloqueo completo. */
  umbral?: number
  /** Fase 2 (c): zona de la que se PAGA el bloqueo — 'reserva' (2A, default)
   * o 'pagado' (1A — Éter Pagado; FB-025 "desde la zona de éter pagado").
   * Sin declarar = 'reserva' (compatibilidad con toda la colección actual). */
  origen?: 'reserva' | 'pagado'
}

/** Tramo de recompensa por umbral dentro de UN bloqueo "hasta" (Capa 3b).
 * El efecto raíz declara el costo (Max.) y el objetivo base; cada tramo
 * aporta qué pasa al alcanzar su umbral. Hereda del raíz: efecto, duración,
 * objetivo (los filtros del tramo se MERGEAN sobre el objetivo base).
 * Ejemplo Cassandra FB-016: Max. 4 → tramos [{umbral:2, toggle_exhaust},
 * {umbral:4, fix_exhaust con filtro agotado}]. */
export interface TramoEfecto {
  /** Mínimo de Éter bloqueado que activa este tramo (>= umbral) */
  umbral: number
  /** Qué hace este tramo (mismo vocabulario que EfectoData.efecto) */
  efecto: EfectoAccion
  /** Duración del efecto de este tramo (default: la del raíz) */
  duracion?: EfectoData['duracion']
  /** Número de turnos si duracion='n_turnos' */
  duracionTurnos?: number
  /** Stats del efecto (buff/debuff por tramo) */
  stats?: { ATQ?: number; RES?: number }
  /** Keyword a otorgar (grant_keyword por tramo) */
  keyword?: string
  /** Cantidad de objetivos/cartas (destroy, draw, etc. por tramo) */
  cantidad?: number
  /** Filtros de objetivo SOLO de este tramo — se mergean sobre el objetivo
   * base del raíz (p.ej. fix_exhaust agrega agotado: true) */
  filtros?: FiltroObjetivo
}

/** All available effect actions — sección viva (JSON FuenteEfectos.json).
 * 13 strings legacy eliminados en Fase 3e (cero hits en JSON de 65 cartas). */
export type EfectoAccion =
  | 'buff' | 'debuff' | 'destroy' | 'exile' | 'return_hand'
  | 'draw' | 'steal_champion' | 'steal_ether' | 'block_ether'
  | 'free_ether' | 'return_ether' | 'toggle_exhaust' | 'prevent_destroy'
  | 'fix_exhaust'
  | 'scry' | 'tutor' | 'copy' | 'redirect'
  | 'double_attack' | 'direct_attack' | 'change_type' | 'grant_keyword'
  | 'recuperar_campo' | 'recuperar_mano' | 'recuperar_mazo'
  | 'recuperar_mazo_barajar' | 'recuperar_mazo_top' | 'recuperar_mazo_bottom'
  | 'recuperar_exilio'
  | 'invocar' | 'invocar_y_equipar'
  | 'mover' | 'negar' | 'rival_discard' | 'modificar_regla'

/** Structured target — 4-layer system: type + controller + zone + filters + destination */
export interface ObjetivoEfecto {
  /** Type of card targeted */
  tipo: 'self' | 'campeon' | 'mistica' | 'arcana' | 'mistica_arcana' | 'eter' | 'vinculo' | 'carta' | 'mano'
       | 'todos_campeones_propios' | 'todos_campeones_rivales' | 'rival_hand'
       | 'equipped_champion'
       /** El Campeón que se está invocando (solo con `contextoUso: 'invocar'`, p. ej. «Cuando pagues esta carta para invocar un Campeón, ese Campeón…»). No se elige. */
       | 'invocado'
  /** Who controls the target */
  controlador: 'propio' | 'rival' | 'ambos' | 'ninguno'
  /** Where the target is located */
  zona: 'campo' | 'cementerio' | 'exilio' | 'reserva' | 'pagado' | 'bloqueado' | 'mano' | 'mazo'
  /** Where to move the target (for return_ether, move effects) */
  zonaDestino?: 'campo' | 'cementerio' | 'exilio' | 'reserva' | 'pagado' | 'bloqueado' | 'mano' | 'mazo'
  /** Who controls the destination zone */
  controladorDestino?: 'propio' | 'rival' | 'dueno'
  /** Additional filters */
  filtros?: FiltroObjetivo
}

/** Structured target filter — dynamic based on card type */
export interface FiltroObjetivo {
  /** Faction to filter by (Campeón, Mística, Arcana) */
  faccion?: Faccion
  /** Essence to filter by (Campeón) */
  esencia?: Esencia
  /** Role to filter by (Campeón) */
  rol?: Rol
  /** Ability category to filter by (Campeón) */
  catHabilidad?: CatHabilidad
  /** Minimum cost */
  costeMin?: number
  /** Maximum cost */
  costeMax?: number
  /** Maximum ATQ ORIGINAL (Campeón): el impreso en la carta, sin buffs ni debuffs */
  atqMax?: number
  /** Maximum RES ORIGINAL (Campeón): la impresa en la carta, sin buffs ni debuffs */
  resMax?: number
  /** Maximum ATQ ACTUAL (Campeón): el vigente, con buffs, debuffs y auras */
  atqActualMax?: number
  /** Maximum RES ACTUAL (Campeón): la vigente, con buffs, debuffs y auras */
  resActualMax?: number
  /** Minimum ATQ ORIGINAL (Campeón): el impreso en la carta */
  atqMin?: number
  /** Minimum RES ORIGINAL (Campeón): la impresa en la carta */
  resMin?: number
  /** Minimum ATQ ACTUAL (Campeón): el vigente, con buffs, debuffs y auras */
  atqActualMin?: number
  /** Minimum RES ACTUAL (Campeón): la vigente, con buffs, debuffs y auras */
  resActualMin?: number
  /** Exhaust status filter (Campeón): true = must be exhausted, false = must NOT be exhausted */
  agotado?: boolean
  /** Has blocked ether filter (Campeón): true = must have blocked ether, false = must NOT have blocked ether */
  conEterBloqueado?: boolean
  /** Can receive blocked ether filter (Campeón): true = must be eligible to receive blocked ether */
  puedeBloquearEter?: boolean
  /** Equipment status filter (Campeón): true = must be equipped, false = must NOT be equipped */
  equipado?: boolean
  /** Minimum cost (for "coste X o más") */
  /** Keyword the card must have */
  keyword?: string
  /** Effect type filter (Mística): 'hechizo' | 'continuo' */
  tipoEfectoMistica?: 'hechizo' | 'continuo'
  /** Face status filter (Arcana): true = face up, false = face down */
  bocaArriba?: boolean
  /** Select by ranking: pick exactly one champion with the highest/lowest stat */
  seleccionar?: {
    stat: 'poder' | 'resistencia' | 'coste'
    orden: 'mayor' | 'menor'
    /**
     * Qué ATQ/RES se compara: 'original' (el impreso en la carta; por defecto) o 'actual' (con buffs y debuffs).
     * No aplica a 'coste'. En un aura, 'actual' incluye los modificadores pero no otras auras (evita recursión) y,
     * SIN valor, el aura sigue comparando base + modificadores (comportamiento previo, del que dependen cartas existentes).
     */
    valor?: 'original' | 'actual'
  }
}

/** Structured condition for Arcanas */
export interface CondicionEfecto {
  /** When this condition is checked */
  trigger: 'inicio_choque' | 'inicio_alba' | 'al_atacar' | 'al_invocar' | 'al_resolver_cadena' | 'activacion'
  /** Whose turn the trigger applies to */
  controladorTrigger?: 'propio' | 'rival'
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
  /** Unified effect list — the ONLY source of truth for effects */
  efectos?: EfectoData[]
  /** Comandante effect — applies to ALL champions of same faction you control */
  efectoComandante?: EfectoData
}

export interface MisticaCard extends CardMeta {
  type: 'Mística'
  /** No tienen Poder ni Resistencia — son puramente conjuros (5.3) */
  stats: BaseStats
  /** Unified effect list */
  efectos?: EfectoData[]
}

export interface ArcanaCard extends CardMeta {
  type: 'Arcana'
  stats: BaseStats
  /** Unified effect list — first effect is condition (pasivo), second is reward (hechizo) */
  efectos?: EfectoData[]
  /** Condición de activación estructurada (string legacy eliminado Fase 3e) */
  condicion?: CondicionEfecto
}

export interface EterCard extends CardMeta {
  type: 'Éter'
  /** No combaten: valen 1 en v2.0 (7.7). Sin Poder ni Resistencia */
  stats: BaseStats
  /** Unified effect list — up to 3 effects (reserva, pago, bloqueo) */
  efectos?: EfectoData[]
}

export interface VinculoCard extends CardMeta {
  type: 'Vínculo'
  /** No cuestan Éter (5.7) */
  stats: BaseStats
  /** Unified effect list */
  efectos?: EfectoData[]
}

/** Discriminated union of all card types */
export type AnyCard =
  | CampeonCard
  | MisticaCard
  | ArcanaCard
  | EterCard
  | VinculoCard
