import type { GameEvent } from './events'
import type { EfectoPendiente } from './effectRegistry'
import type { TriggerEfecto } from './efectos'
import type { OperacionRegla, ReglaId } from '../../shared/rules/reglas'

export type PlayerId = 'A' | 'B'

/** Fases observables del estado (la Alba es auto-resuelta, ADR-3). */
export type Fase = 'pre_partida' | 'forja' | 'choque' | 'ocaso' | 'terminada'

/** Nombres de fase para fase_iniciada (incluye la Alba auto-resuelta). */
export type FaseNombre = 'alba' | 'forja' | 'choque' | 'ocaso'

/** Motivos de fin de partida (change 2 agrega 'vinculos' — 5.7/13). */
export type MotivoFin = 'mazo_vacio' | 'rendicion' | 'vinculos' | 'empate'

/** Causa de destrucción para destruirCarta (ADR-15) y eventos de destrucción. */
export type CausaDestruccion = 'combate' | 'efecto' | 'ruptura'

/**
 * Expiración de un modificador (ADR-22): 'ocaso' al fin del turno en curso,
 * 'alba-dueño' en la próxima Alba del DUEÑO de la instancia, 'permanente' nunca.
 *
 * Counter-based: si `turnosRestantes` está definido, el modificador expira
 * cuando el counter llega a 0 (decrementado en cada Ocaso del DUEÑO).
 * Esto permite duraciones como "hasta el final del próximo turno" (= 2).
 */
export type ExpiraModificador = 'ocaso' | 'alba-dueño' | 'permanente' | 'hasta-fase'

/** Modificador aditivo de stats aplicado a una instancia (ADR-22). */
export interface Modificador {
  stat: 'poder' | 'resistencia'
  valor: number
  expira: ExpiraModificador
  /** Counter-based expiry: undefined = se usa expira; definido = decrementa en Ocaso del dueño. */
  turnosRestantes?: number
  /** B6 (hasta_fase): fase que dispara la purga — solo si expira='hasta-fase'. */
  expiraFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  /** B6: de QUIÉN es esa fase (se compara con s.turno al entrar la fase). */
  expiraFaseJugador?: PlayerId
}

/**
 * Modificación TEMPORAL de una regla del manual (Capa 2), creada por un efecto de resolución
 * ("este turno puedes…"). Mismo ciclo de vida que `Modificador`. Las permanentes mientras la carta
 * está en juego NO se guardan: se derivan del estado (ver reglas.ts).
 */
export interface ReglaTemporal {
  regla: ReglaId
  operacion: OperacionRegla
  valor?: number
  /** Monotónico: desempata los `fijar` (gana el más reciente). */
  orden: number
  sujeto: { tipo: 'partida' } | { tipo: 'jugador'; jugador: PlayerId } | { tipo: 'carta'; instId: string }
  /** Quién la creó: cuenta su Alba/Ocaso para `alba-dueño` y `turnosRestantes`. */
  duenio: PlayerId
  expira: ExpiraModificador
  turnosRestantes?: number
  expiraFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  expiraFaseJugador?: PlayerId
}

/**
 * Cambio de Esencia, Rol o Facción de un Campeón (F9e, `change_type`, atributos.ts). `valor` SUSTITUYE al de la carta
 * (el Rol y la Facción pasan a ser solo `valor`). Mismo ciclo de vida que `ReglaTemporal`; el más reciente de cada
 * atributo (el último de la lista) gana.
 */
export interface CambioAtributo {
  instId: string
  atributo: 'esencia' | 'rol' | 'faccion'
  valor: string
  duenio: PlayerId
  expira: ExpiraModificador
  turnosRestantes?: number
  expiraFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  expiraFaseJugador?: PlayerId
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
 * bocaArriba SOLO en Vínculos destruidos por Ruptura (4A-4F, ADR-13/§5.5);
 * el resto de cartas conservan el modelo por zona (§7.2).
 */
export interface CardInstance {
  cardInstanceId: string
  cardId: string | null
  owner: PlayerId
  agotado?: boolean
  /**
   * Ya atacó este turno (un Campeón ataca UNA vez por turno). Cierra el
   * re-ataque infinito de Carga (sigue agotado tras atacar, §10) y Vigor
   * (no se agota al atacar, §10); la Alba del dueño lo borra junto a agotado.
   */
  atacoEsteTurno?: boolean
  /** Bloqueos que este Campeón ya hizo en el turno en curso (regla `bloqueosPorTurno`, §9.3). Se borra al terminar el turno. */
  bloqueosEsteTurno?: number
  /**
   * Activación diferida (§5.5, C4): la carta entró al campo ESTE turno.
   * Tácticas/Arcanas recién colocadas NO pueden responder en la cadena 9.6
   * (solo las de turnos anteriores); la Alba del dueño lo borra (phases.ts).
   */
  entradaEsteTurno?: boolean
  /**
   * Candado de la condición de una Arcana (F5g): se fija al ocurrir su `condicion.trigger`
   * (inicio de Alba/Choque de su controlador): true = habilitada (puede activarse en cualquier momento
   * hasta la siguiente ocurrencia), false = deshabilitada. Ausente = nunca evaluada. Se limpia al
   * colocarse y al salir del campo. Oculta al rival mientras la Arcana está boca abajo (visibleState).
   */
  condicionHabilitada?: boolean
   /** Éter bloqueado (1B-1F campeones / 3A-3F artefactos Fase 3a): ids de Éter sobre esta carta. */
   eterBloqueado?: string[]
   /** Fase 3a Phase D: one-shot de umbral de costo-bloqueado ya disparado (FB-032).
    * Se limpia al liberar el Éter (efecto se desactiva). */
   efectoUmbralDisparado?: boolean
   /** Capa 3b: umbrales de tramos escalonados ya resueltos para esta fuente
    * (p.ej. [2] tras activar el tramo toggle de Cassandra). Se limpian al
    * liberar el Éter — un nuevo ciclo de bloqueo re-arme los tramos. */
   tramosDisparados?: number[]
   /** Capa 3b fix_exhaust: ID del campeón cuyo agotamiento está fijado por
    * este tramo. Estado derivado: el fijado vive mientras la fuente tenga
    * Éter bloqueado >= umbral del tramo (exhaustFijado scan). */
   fijadoExhaustTargetId?: string
  /** REDISEÑO obs 1874: el candado championNegado se ELIMINÓ — la negación es
   * un CONTADOR de un solo uso sobre la activación pendiente
   * (cadena.opener), no un estado persistente en la mística. */
   /** Fase 3c: ID de la Mística/Arcana rival copiada por efecto copy (FB-022).
    * Estado derivado copyActivo: copyTargetId + ≥1 Éter bloqueado + target en campo. */
   copyTargetId?: string
   /** Fase 3c: one-shot de efectos copiados ya disparado (eventos copy).
    * Se limpia al liberar el Éter (copy se desactiva — §7.7). */
   copyOneShotDisparado?: boolean
  /** Destrucción diferida (Fase 2c — prevent_destroy): la víctima Vínculo está en peligro
   * y espera la elección responder_prevenicion del controlador. Aún NO está destruida. */
  destruccionPendiente?: boolean
  /**
   * Fase 2 (éter por fuente): filiación del Éter bloqueado — vive en la
   * INSTANCIA del Éter mientras esté bloqueado (eterBloqueado: string[]
   * queda intacto). `${fuenteInstanceId}#${indiceEfecto}` del efecto que lo
   * bloqueó: límites por fuente, umbrales/tramos por fuente y release
   * selectivo del reagrupar (d). Sin tag = compatible con estados de tests.
   */
  bloqueadoPorEfecto?: string
  /**
   * Fase 2: jugador que PAGÓ este Éter — la liberación se lo devuelve a ÉL
   * (§7.8), sin heurísticas stolenBy/owner/ladrón. Sin tag → fallback del caller.
   */
  pagadoPor?: PlayerId
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
   /** B6 (hasta_fase): keywords otorgadas con duración 'hasta_fase' — expiran
    * al ENTRAR la fase+dueño indicados (purgarHastaFase). La keyword vive
    * también en keywordsTemporales mientras no expire. */
   keywordsHastaFase?: { keyword: string; fase: 'alba' | 'forja' | 'choque' | 'ocaso'; jugador: PlayerId }[]
   bocaArriba?: boolean
   /** C2: flag 1/turno para Pasivo 1A (FB-005/DS-006) — se resetea en al-inicio-alba. */
   opcionUsadaEsteTurno?: boolean
    /** ID del campeón al que está equipada esta carta (ARTEFACTO). Si el campeón sale, la carta va al cementerio. */
    equipadoA?: string
    /** ID del campeón que fue invocado por esta carta (invocar_y_equipar). Si esta carta sale, el campeón también. */
    vinculadoA?: string
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
  /**
   * Pila ÚNICA (F5a): una sola ranura `GameState.cadena` para ambos casos.
   * 'combate' = abierta por declarar_ataque/declarar_bloqueo (al cerrar se reanuda
   * la sub-máquina de combate); 'global' = abierta por una activación fuera de combate.
   */
  origen: 'combate' | 'global'
  /** Cartas respondidas en orden de apilado (visibles a ambos, 6.2). */
  pila: string[]
  /** A quién toca responder ahora (defensor primero, §9.6). */
  prioridad: PlayerId
  /** Pases consecutivos: 2 → resolución en orden inverso (§9.6). */
  pasesConsecutivos: number
  /** Fase en que se abrió la cadena (para resolución contextual). */
  faseAbierta: Fase
  /** Descripción legible del efecto que abrió la cadena (para UI modal). */
  efectoActual?: { jugador: PlayerId; cardInstanceId: string; descripcion: string }
  /** Velocidad del último efecto activado en la cadena (PRESTEZA/FUGAZ). */
  velocidadActual?: 'normal' | 'presteza' | 'fugaz'
  /**
   * Fondo de la pila (F5b, ventana de negación obs 1874 — Marcha): la jugada
   * que abrió la ventana, DECLARADA y ya PAGADA, pendiente de resolverse al
   * cerrar la cadena (después de las respuestas). Si una negación
   * (tipoNegacion 'activacion') la cancela → no se resuelve (el pago NO se
   * devuelve). Vive en la cadena GLOBAL (nunca hay opener en combate).
   * `efectoActual` sigue siendo la descripción informativa de este opener.
   */
  opener?: OpenerCadena
  /**
   * Datos de cada respuesta apilada (F5e), por cardInstanceId (una carta no
   * apila dos veces): de dónde salió (la Mística jugada desde la mano nunca
   * entró al campo y se consume al resolver) y los objetivos que su jugador eligió
   * al responder, por índice en efectos[]. Sin entrada (estados construidos a mano)
   * el resolvedor infiere el origen por la zona de la carta.
   */
  respuestas?: Record<string, RespuestaApilada>
  /**
   * Triggers apilados (F5d-2), en orden de apilado (el último resuelve primero, LIFO). Cada uno ya eligió
   * sus objetivos al apilarse (su dueño, rival incluido). Resuelven DESPUÉS de las respuestas que quedaron
   * por encima de ellos (`sobre`) y ANTES del opener. No son negables y no responden a la velocidad.
   * Opcional: los estados persistidos sin el campo se siguen leyendo.
   */
  triggers?: TriggerApilado[]
}

/**
 * Trigger apilado en la cadena (F5d-2): un efecto de una carta que se dispara como consecuencia de una
 * acción de jugador ("Al invocar...", "Al atacar...") y entra a la pila ENCIMA de la acción que lo provocó
 * (manual §9.6). Todo serializable: la identidad del efecto es (carta fuente, trigger, índice en efectos[]);
 * el efecto se vuelve a leer del meta al resolver. Ver triggers.ts.
 */
export interface TriggerApilado {
  /** Controlador del efecto: ES el elector de su objetivo y a quien se le cobra el costo al resolver. */
  jugador: PlayerId
  /** Carta fuente del efecto. */
  cardInstanceId: string
  trigger: TriggerEfecto
  /** Índice del efecto en meta.efectos[] (una carta puede tener varios efectos con el mismo trigger). */
  efectoIdx: number
  /** Objetivo ya elegido al apilar (un efecto = a lo más un objetivo; ausente si no se eligió o no hay). */
  objetivoId?: string
  /** Respuesta de la pila sobre la que se apiló (ausente = sobre el fondo: el opener / la jugada que abrió la ventana). */
  sobre?: string
  /** Datos del suceso que lo disparó (solo ids y texto serializable). */
  payload?: { killerId?: string; victimaId?: string; contextoUso?: string }
}

/** Datos con los que una respuesta entra a la pila (F5e). */
export interface RespuestaApilada {
  /** Quien responde (el controlador; ES el elector de sus objetivos y a quien se le cobran sus efectos al resolver). */
  jugador: PlayerId
  origen: 'mano' | 'campo'
  /** Objetivos ya elegidos al responder, por índice en efectos[]. */
  objetivos?: Record<number, string>
}

/**
 * Respuesta en declaración (F5e): la carta ya pagó (y salió de la mano o se reveló)
 * pero todavía NO está en la pila; espera que su jugador elija sus objetivos.
 */
export interface RespuestaCadena extends RespuestaApilada {
  cardInstanceId: string
}

/**
 * Opener de la pila (F5b): la jugada que abre la ventana — jugar Mística,
 * activar Arcana o activar habilidad. Su costo y su estado "ya aplicado" (pago,
 * slot, volteo, 1/turno, entradaEsteTurno) ocurren al DECLARAR; su EFECTO se
 * difiere al fondo de la pila y resuelve ÚLTIMO (LIFO), después de las
 * respuestas. Los objetivos se eligen antes de abrir la ventana y quedan aquí.
 */
export interface OpenerCadena {
  tipo: 'mistica' | 'arcana' | 'habilidad'
  jugador: PlayerId
  cardInstanceId: string
  /** habilidad: índice en efectos[] del efecto activado. */
  efectoIdx?: number
  /** Objetivos ya elegidos, por índice en efectos[] (habilidad: el de la acción). */
  objetivos?: Record<number, string>
  /** true si una negación (tipoNegacion 'activacion') la canceló: no resuelve; el pago NO se devuelve. */
  negada?: boolean
}

/**
 * Declaración de una acción de jugador cuya ventana de respuesta está
 * DIFERIDA hasta elegir los objetivos que la propia acción armó (F5d-1). El
 * tipo dice qué ventana abrir al elegir el último:
 * - 'opener': ventana global con el opener al fondo (Mística/Arcana/habilidad, F5b).
 * - 'invocacion': ventana global de la invocación `cardInstanceId` (sin opener).
 * - 'ataque': ventana de combate del defensor (abrirCadena) y auto-avance 9.3.
 * - 'respuesta' (F5e): una respuesta (jugar_respuesta / responder_cadena) con objetivos;
 *   al elegir el último la respuesta ENTRA a la pila y la prioridad alterna. Aquí la
 *   cadena YA está abierta: mientras se elige no se puede responder ni pasar.
 * - 'triggers' (F5d-2): solo triggers apilados, sin jugada propia (jugador = el del turno); abre una ventana
 *   global o, si la cadena ya está abierta, se suman a ella.
 * Cualquier tipo puede traer `triggers`: los que provocó la acción, con su objetivo ya elegido al terminar
 * la elección; entran a la cadena al abrirse la ventana (o resuelven ya si nadie puede responder).
 */
export interface DeclaracionCadena {
  tipo: 'opener' | 'invocacion' | 'ataque' | 'respuesta' | 'triggers'
  /** Quien declaró (el jugador activo). El ELECTOR de cada objetivo es `pendiente.jugador`. */
  jugador: PlayerId
  /** invocacion: la carta invocada (descripción de la ventana). */
  cardInstanceId?: string
  /** opener: la jugada que abrirá la ventana; acumula los objetivos elegidos. */
  opener?: OpenerCadena
  /** respuesta: la carta que responde; acumula los objetivos elegidos. */
  respuesta?: RespuestaCadena
  /** Triggers que provocó la acción (F5d-2); acumulan el objetivo que su dueño elige. */
  triggers?: TriggerApilado[]
  /** Pendientes de la acción por elegir: las primeras N entradas de objetivosPendientes. La ventana se abre al llegar a 0. */
  pendientes: number
}

/** Sub-máquina de combate en Choque (9.1, ADR-11). Se crea con la PRIMERA declarar_ataque. */
export interface CombateState {
  paso: CombatePaso
  /** Atacantes declarados (ids de Campeones, ya agotados al declarar — §9.2). */
  atacantes: string[]
  /** bloqueos: Record<atacanteId, bloqueadorId> (1 bloqueador/ataque y viceversa, §9.3). */
  bloqueos: Record<string, string>
  /** true si hay ≥1 ataque sin bloqueador (Ruptura posible, 9.4-A). */
  rupturaDisponible: boolean
  /** true si ya se hicieron las Rupturas que permite la regla `rupturasPorTurno` este turno (§9.4-A). */
  rupturaUsadaEsteTurno: boolean
  /** F5c: true mientras la ventana abierta tras declarar_bloqueo está pendiente; el daño se resuelve al cerrarla. */
  danoPendiente?: boolean
}

/**
 * Scry pendiente (F9c, scry.ts): `jugador` ve `cartas` (el tope del mazo de `mazoDe`, tope primero) y debe ordenarlas
 * con `ordenar_mazo`. Mientras exista, el juego espera a `jugador`.
 */
export interface ScryPendiente {
  jugador: PlayerId
  mazoDe: PlayerId
  cartas: string[]
}

/** Elección de objetivo pendiente (entrada de GameState.objetivosPendientes); ver ese campo y pendientes.ts (vigencia y obsolescencia, F5h). */
export interface PendienteObjetivo {
  jugador: PlayerId
  instId: string
  trigger: string
  opciones: string[]
  tramoUmbral?: number
  opener?: { efectoIdx: number }
  equipar?: boolean
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
  /** Rupturas (Vínculos rotos por Ataque directo) que el jugador activo ya hizo este turno (§9.4). Se borra al terminar el turno. */
  rupturasEsteTurno?: number
  /**
   * Pila ÚNICA de la cadena 9.6 (F5a), de combate o global: prioridad entre
   * jugadores cuando un efecto se activa y el rival puede responder. Se cierra
   * cuando ambos pasan y se resuelve LIFO. `cadena.origen` dice de cuál es.
   * Léela siempre con `cadenaActiva(s)` (chain.ts).
   */
  cadena?: CadenaState
  /** Reglas del manual modificadas con duración (Capa 2). Ver reglasTemporales.ts. */
  reglasTemporales?: ReglaTemporal[]
  /** Cambios de Esencia/Rol/Facción de Campeones (F9e). Ver atributos.ts. */
  cambiosAtributo?: CambioAtributo[]
  /** Contador monotónico para ordenar las reglasTemporales. */
  ordenReglas?: number
  /** Flag anti-bucle del sexto Vínculo (5.7/13, ADR-16): el hook NO-OP se resuelve UNA vez. */
  sextoVinculoResuelto?: boolean
  /** C2: opciones pendientes de elegir_opcion (Pasivo 1A FB-005/DS-006). */
  opcionesPendientes?: { jugador: PlayerId; eterId: string }[]
  /**
   * C3 (D1): objetivos pendientes de elegir_objetivo — cola FIFO (Vaela+Kael
   * atacan juntos → 2 pendientes). `trigger` guarda el trigger que originó el
   * pendiente; la resolución re-despacha con contextoUso 'objetivo-elegido'.
   * `tramoUmbral`: pendiente de un tramo escalonado (Capa 3b) — la resolución
   * ejecuta ese tramo directamente en vez de re-despachar por trigger.
   * `equipar` (F5f): elección del Campeón al que se equipa un ARTEFACTO jugado/activado como respuesta.
   */
  objetivosPendientes?: PendienteObjetivo[]
  /** Scry (F9c): mazos por ordenar, cola FIFO. Ver scry.ts. */
  scryPendientes?: ScryPendiente[]
  /**
   * Alba EN ESPERA de un Scry (decisión del usuario, 2026-10-27): un efecto «al inicio del Alba» que mira y ordena el
   * mazo debe resolverse ANTES de robar. El Alba se detiene tras sus efectos de inicio y el robo (con la comprobación de
   * fin de partida) ocurre al ordenar. Guarda el jugador cuyo Alba espera. Ver phases.reanudarAlba.
   */
  albaPendiente?: PlayerId
  /**
   * Declaración (F5d-1) que espera la elección de sus objetivos ANTES de abrir
   * la ventana (Yugioh: se elige al declarar, luego empiezan las respuestas). Sus
   * `pendientes` son las primeras entradas de objetivosPendientes (van al FRENTE;
   * el resto de la cola son obsoletos que no se esperan). Mientras exista, el elector es `pendiente.jugador` (cualquier
   * jugador) y solo se acepta elegir_objetivo, responder_prevenicion o rendirse.
   */
  declaracionEnEleccion?: DeclaracionCadena
  /**
   * Profundidad de resolución de triggers/pila en curso (F5d-2, transitorio: solo vale DENTRO de una acción,
   * nunca queda persistido). Mientras es > 0 un trigger de acción nuevo no abre ventana ni se apila: resuelve
   * ya (decisión g de triggers.ts); sirve además de tope contra recursión.
   */
  profundidadTriggers?: number
  /** Posición (en `ordenResolucion`) del paso de la pila que se está resolviendo (F9d, transitorio como profundidadTriggers). Ver redirect.ts. */
  pasoResolviendo?: number
  /**
   * Jugadores que intentaron robar con el Mazo Principal vacío (F6, manual §13.2). La marca es permanente; la derrota
   * se CONFIRMA en el punto de control (finPartida.ts), junto con la de Vínculos, para que dos derrotas simultáneas sean EMPATE.
   */
  mazosAgotados?: PlayerId[]
  /** Ausente en un EMPATE (`motivo: 'empate'`) y mientras la partida sigue. */
  ganador?: PlayerId
  motivo?: MotivoFin
  /** Efectos pendientes centralizados (Effect Registry, Fase 1). */
  efectosPendientes?: EfectoPendiente[]
  /** Checkpoint prevent_destroy (Fase 2c): elecciones de prevenión FIFO. */
  preventivosPendientes?: PrevenicionPendiente[]
  /**
   * Pendiente de equipar ARTEFACTO (keyword) — se crea al jugar/activar un
   * artefacto que requiere selección de campeón ANTES de resolver efectos.
   * Mientras exista, solo se permiten acciones equipar_artefacto.
   */
  equiparPendiente?: {
    artefactoId: string
    jugador: PlayerId
    contexto: 'jugar_mistica' | 'activar_arcana'
  }
}

/**
 * Contexto de ejecución: stream RNG único (la posición = extracciones previas,
 * contrato de reproducibilidad) + acumulador de eventos por acción.
 * `draws` cuenta las extracciones consumidas — permite persistir la posición
 * del stream entre invocaciones serverless (Edge Functions).
 */
export interface Ctx {
  next(): number
  emit(e: GameEvent): void
  readonly events: GameEvent[]
  /** Extracciones RNG consumidas desde createCtx (para snapshot serverless). */
  readonly draws: number
}

/** Opciones de setup: orden de Vínculos elegido por cada jugador (default: filtro Vínculo de deckX). */
export interface SetupOptions {
  vinculosA?: string[]
  vinculosB?: string[]
}

/**
 * Pendiente de elección prevent_destroy (Fase 2c — FB-018, checkpoint).
 * El controlador del Vínculo en peligro decide: prevenir (exiliar la fuente)
 * o permitir la destrucción. Mientras exista, el motor NO acepta otras acciones.
 */
export interface PrevenicionPendiente {
  /** Controlador del vínculo — el que ELIGE (no es el jugador activo necesariamente). */
  jugador: PlayerId
  /** Fuente con prevent_destroy en campo del jugador (Rowena). */
  fuenteId: string
  /** Vínculo en peligro de destrucción (aún vivo, marcado destruccionPendiente). */
  victimId: string
  /** Causa que originó la destrucción diferida. */
  causa: CausaDestruccion
}
