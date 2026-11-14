import type { CardType, Rarity, Keyword, Faccion, Esencia, Rol, CatHabilidad } from './enums'
import type { ModificacionRegla } from '../rules/reglas'
export type { CardType }

/** Base stats shared by all cards */
export interface BaseStats {
  cost: number
}

/** Stats for cards that can fight (solo Campeón en v1.0) */
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
          | 'al_ser_destruido_vinculo' | 'cuando_vinculo_seria_destruido'
          /** «Cuando un Campeón que controles sea enviado al Cementerio» (con `controladorTrigger: 'rival'`: «un Campeón del rival»). El Campeón enviado es `objetivo.tipo = 'campeon_del_trigger'`. */
          | 'cuando_campeon_propio_al_cementerio'
          /** «Cuando un Campeón que controles cambie de Esencia» */
          | 'cuando_campeon_propio_cambia_esencia'
          /** «Cuando esta carta cambie de Esencia» */
          | 'al_cambiar_de_esencia'
          /** «Cuando juegues una Mística» (con `controladorTrigger: 'rival'`: «el rival»). Es OBSERVADOR: lo escribe una carta en juego (Arcana, Comandante), no la Mística misma (esa usa `al_jugar_mistica`). */
          | 'cuando_juegas_mistica'
          /** «Cuando actives una Arcana» (con `controladorTrigger: 'rival'`: «el rival»). Observador, como `cuando_juegas_mistica`. */
          | 'cuando_activas_arcana'
          | 'ninguno'

  // ── Capa 2b: TRIGGER ZONA (opcional) ──
  /** Where the card was when the trigger happened (for al_ser_enviado_al_cementerio) */
  triggerZona?: 'mano' | 'campo' | 'cualquier_zona'

  // ── Capa 2c: TRIGGER CONTROLADOR (opcional) ──
  /** Whose turn the trigger applies to (default: propio) */
  controladorTrigger?: 'propio' | 'rival'

  // ── Capa 2c-bis: CAUSA DEL ENVÍO (opcional) ──
  /** Solo con `cuando_campeon_propio_al_cementerio`: el efecto se activa únicamente si el Campeón llega al Cementerio por alguna de estas
   *  causas. Ausente = por cualquiera (comportamiento de siempre). */
  causaEnvio?: CausaEnvio[]

  // ── Capa 2d: CONTEXTO DE USO (opcional) ──
  /** Restricts when this effect fires — e.g., 'invocar' means only when summoning a champion */
  contextoUso?: 'invocar' | 'habilidad' | 'combate' | 'ninguno'

  // ── Capa 3: COSTO (opcional, anidado) ──
  /** What the player must pay to activate */
  costo?: CostoEfecto
  /**
   * Cuántas veces se puede activar un `bloqueo_fijo` (el Card-Maker lo limpia/valida si el coste es otro):
   * - ausente = repetible: cada activación bloquea N Éter exactos (8 Éter = 2 activaciones);
   * - `'una_por_turno'`: una activación de ESE efecto por turno (por carta y por índice; se gasta al pagar y se reinicia al
   *   terminar el turno). Para los efectos que reagrupan su Éter (Aurora, Ragnar);
   * - `'una_mientras_bloqueado'`: solo se activa si el efecto NO tiene ya Éter propio bloqueado (el externo no cuenta);
   *   al liberarse ese Éter puede activarse otra vez (Elena, Último Refugio).
   * «Una vez por turno» también se admite con un coste de Éter (u otro que no sea `ninguno`): el texto lo dice tras la cláusula
   * del coste («Puedes pagar 1 Éter, una vez por turno, …»). `una_mientras_bloqueado` sigue siendo solo del bloqueo fijo.
   */
  activacion?: 'una_por_turno' | 'una_mientras_bloqueado'

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
           /** «mientras tenga Éter bloqueado»: CUALQUIER Éter bloqueado en la carta (≠ `mientras_ester_bloqueado`, que es el Éter de ESTE efecto) */
           | 'mientras_tenga_eter_bloqueado'
  /** Number of turns when duracion='n_turnos' */
  duracionTurnos?: number
  /** Fase destino when duracion='hasta_fase' */
  duracionFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  /** A quién pertenece la fase when duracion='hasta_fase' */
  duracionControlador?: 'propio' | 'rival'

  // ── Capa 10: REAGRUPAR (opcional) ──
  /** Regroup ether — "Al inicio de la fase [X], reagrupa el Éter usado" */
  reagrupar?: {
    fase: 'alba' | 'choque'; turno: 'propio' | 'oponente'
    /** Qué se reagrupa: `efecto` (por defecto, si falta) = «el Éter usado por este efecto»; `todo` = «todo el Éter bloqueado en esta carta» */
    alcance?: 'efecto' | 'todo'
  }

  // ── Capa 11: CONDICIÓN (solo para Arcana) ──
  /** Activation condition for Arcanas — CondicionEfecto estructurado (string legacy eliminado Fase 3e: 0 hits en JSON) */
  condicion?: CondicionEfecto

  // ── Capa 11b: REQUISITO DE CAMPO (opcional) ──
  /** «Si controlas N o más Campeones de una misma Esencia, …». Con el filtro `esenciaDeLaCondicion` el objetivo es «de esa Esencia». */
  requisitoCampo?: RequisitoCampo

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
  /** Regla enumerada del Card-Maker (solo `modificar_regla`, alternativa a `regla`): ver `ReglaEnumerada`. */
  reglaEnumerada?: ReglaEnumerada
  /** Parámetro numérico de la regla enumerada (p. ej. `coste_campeones_rival_mas` con 1). */
  reglaValor?: number

  // ── activar_disparo / anclar_eter ──
  /** `scry`: el texto dice «y puedes enviarla al fondo» (el motor ya deja mandar cartas al fondo; esto solo lo declara en el texto) */
  opcionFondo?: boolean
  /** `rival_discard`: el rival descarta AL AZAR (solo el texto: «…de su mano al azar»; el motor ya descarta al azar) */
  alAzar?: boolean
  /** El efecto NO es opcional: con trigger y sin coste el texto no lleva «puedes» (p. ej. «Al matar en combate, devuelve 1 Éter…») */
  obligatorio?: boolean

  /** `activar_disparo`: se activa SIN pagar el coste del Disparo («sin pagar su costo») */
  sinPagarCosto?: boolean
  /** `activar_disparo`: la activación NO agota al Campeón («sin agotarlo») */
  sinAgotar?: boolean

  // ── Cambio de tipo (solo cuando efecto = 'change_type') ──
  /**
   * En qué se convierte el Campeón objetivo. Cada atributo presente SUSTITUYE al de la carta (Facción incluida: queda
   * solo la nueva); el que falta no se toca. Dura lo que dure el efecto (`duracion`; sin duración, mientras exista).
   */
  cambioTipo?: { esencia?: Esencia; /** «la esencia que elijas»: el jugador la elige al resolver (excluye `esencia`) */ esenciaElegida?: boolean; rol?: Rol; faccion?: Faccion }

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

/**
 * Reglas enumeradas que el Card-Maker ofrece a `modificar_regla` además del catálogo `REGLAS` (que es de reglas del manual).
 * - `disparo_sin_agotar`: «el efecto Disparo no agota» (requiere `activacion: 'una_por_turno'` → «Una vez por turno por Campeón»)
 * - `coste_campeones_rival_mas`: «los Campeones del rival cuestan N Éter más» (`reglaValor` = N ≥ 1)
 * - `olvido_rival`: «las cartas del rival que irían a su Cementerio se exilian en su lugar» (Disonancia)
 * - `peaje_bloqueo`: «para bloquear a tus Campeones, el rival paga N Éter por cada uno» (`reglaValor` = N ≥ 1)
 * - `rival_sin_incrementos_res`: «los Campeones del rival no pueden recibir incrementos de RES» (Purga)
 */
export type ReglaEnumerada = 'disparo_sin_agotar' | 'coste_campeones_rival_mas' | 'olvido_rival' | 'peaje_bloqueo' | 'rival_sin_incrementos_res'

/** Cost structure — what the player pays */
export interface CostoEfecto {
  /** Cost type */
  tipo: 'ninguno' | 'eter' | 'eter_bloqueado' | 'bloqueo_fijo' | 'exhaust' | 'exile_self' | 'cemetery_self'
    /** «Puedes exiliar N Campeón(es) de tu Cementerio» (`cantidad` = N, por defecto 1) */
    | 'exilia_cementerio_propio'
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
  /** «Activa un efecto Disparo de otro Campeón que controles» (opciones `sinPagarCosto`, `sinAgotar`) */
  | 'activar_disparo'
  /** «Selecciona hasta N Éter que controla el rival en su zona de pago, estos no se reagrupan en su próxima Alba» */
  | 'anclar_eter'
  /** «Un Campeón pierde sus incrementos de ATQ y RES» (solo los Modificadores positivos; no toca keywords). Con `buffPerBlockedEther`: «por cada Éter bloqueado» (Purga). */
  | 'quitar_buffs'
  /** «El ATQ y la RES de un Campeón se igualan al menor de los dos valores» (Purga) */
  | 'igualar_stats_al_menor'
  /** «Envía la(s) carta(s) superior(es) de tu mazo a tu Cementerio» (Purga) */
  | 'mill'
  /** «Roba N carta(s) de tu mazo y descarta N carta(s) de tu mano» (Purga) */
  | 'draw_discard'

/** Por qué llega un Campeón al Cementerio (filtro `causaEnvio` de `cuando_campeon_propio_al_cementerio`). */
export type CausaEnvio = 'destruccion' | 'combate' | 'sacrificio'

/** Requisito sobre el propio campo: `misma_esencia` = «controlas `minimo` o más Campeones de una misma Esencia» (mínimo 2). */
export interface RequisitoCampo {
  tipo: 'misma_esencia'
  minimo: number
}

/** Structured target — 4-layer system: type + controller + zone + filters + destination */
export interface ObjetivoEfecto {
  /** Type of card targeted */
  tipo: 'self' | 'campeon' | 'mistica' | 'arcana' | 'mistica_arcana' | 'eter' | 'vinculo' | 'carta' | 'mano'
       | 'todos_campeones_propios' | 'todos_campeones_rivales' | 'rival_hand'
       /** Todos los Campeones del campo, de ambos lados («todos los Campeones») */
       | 'todos_campeones'
       | 'equipped_champion'
       /** El Campeón que se está invocando (solo con `contextoUso: 'invocar'`, p. ej. «Cuando pagues esta carta para invocar un Campeón, ese Campeón…»). No se elige. */
       | 'invocado'
       /** El Campeón que activó el trigger (`cuando_campeon_propio_al_cementerio`). No se elige. Con `recuperar_mano`: «devuélvelo a tu mano». */
       | 'campeon_del_trigger'
  /** Who controls the target */
  controlador: 'propio' | 'rival' | 'ambos' | 'ninguno'
  /** «otro»: el objetivo NO puede ser esta carta («otro Campeón que controles») */
  excluyeEsta?: boolean
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
  /** Coste máximo = el de OTRO Campeón: `'sacrificado'` (el que se sacrificó para invocar esta carta) o `'trigger'` (el que activó el trigger
   *  `cuando_campeon_propio_al_cementerio`): «de coste igual o menor al del Campeón sacrificado / al de ese Campeón» */
  costeMaxDeReferencia?: 'sacrificado' | 'trigger'
  /** Campeones que comparten Esencia con OTRO Campeón que controlas */
  comparteEsenciaConOtro?: boolean
  /** Campeones de la Esencia que cumple el `requisitoCampo` del efecto («de esa Esencia») */
  esenciaDeLaCondicion?: boolean
  /** Interno del motor (no se escribe en el Card-Maker): el `minimo` del `requisitoCampo`, que `objetivoCompleto` copia aquí para resolver «de esa Esencia». */
  esenciaDeLaCondicionMin?: number
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

/** Tipos de condición que evalúa `condicionCumple` (src/online/game/efectos.ts); la guarda de textos del Card-Maker los recorre todos */
export const CONDICION_TIPOS = [
  'controlar_minimo', 'controlar_maximo', 'rival_controla_minimo', 'rival_controla_maximo',
  'tener_mano_minimo', 'tener_mano_maximo', 'tener_eter_bloqueado', 'tener_eter_pagado',
] as const

/** Individual condition item */
export interface CondicionItem {
  /** Condition type */
  tipo: (typeof CONDICION_TIPOS)[number]
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
  /**
   * Efecto(s) de Comandante — aplican a TODOS los Campeones de la misma facción que controlas. Un objeto (formato histórico) o un
   * arreglo (varios efectos, p. ej. Aurora). Léelo SIEMPRE con `efectosComandante` (src/shared/efectoComandante.ts).
   */
  efectoComandante?: EfectoData | EfectoData[]
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
  /** No combaten: valen 1 en v1.0 (7.7). Sin Poder ni Resistencia */
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
