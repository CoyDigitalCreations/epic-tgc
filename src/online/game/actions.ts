import type { GameEvent } from './events'
import { purgarEfectosTemporales, purgarKeywordsTemporales, dispararTrigger, type TriggerEfecto } from './efectos'
import { resolverFaseEfectos, registrarEfectoPendiente, hastaAlba, duracionTurnos } from './effectRegistry'
import { limpiarCombate, resolverAlba } from './phases'
import { shuffleFisherYates } from './rng'
import type { Ctx, FaseNombre, GameState, PlayerId } from './types'
import { esCampeon, esMistica, esArcana, faccionesCompartidas, getCardMeta, costeEterHabilidad } from './cards'
import { esSingular, sacrificiosRequeridos, copiasEnCampo, campeonesSacrificables } from './campo'
import { aplicarPago, validarPago, validarBloqueo, etersParaPagar, type ContextoUso } from './payments'
import { SLOTS_CAMPEONES, SLOTS_MISTICAS_TACTICAS, SLOTS_ARCANAS_COMBATE, slotAZona } from './zones'
import type { CardInstance } from './types'
import { ejecutarDeclararAtaque, ejecutarDeclararBloqueo, validarDeclararAtaque, validarDeclararBloqueo, validarElegirRuptura, ejecutarElegirRuptura, tieneKeyword } from './combat'
import { liberarEterBloqueado, enviarAlCementerio } from './replacements'
import { validarResponderCadena, validarPasarPrioridad, ejecutarResponderCadena, ejecutarPasarPrioridad, abrirCadenaGlobal } from './chain'
import { validarRequisito } from './effects-guards'

/**
 * Acciones atómicas del jugador (superficie de applyAction/getValidActions).
 * `elegir_opcion` es un stub reservado para game-handlers (change 3): nunca
 * válida en el core.
 */
export type Action =
  | { type: 'mulligan' }
  | { type: 'pasar_mulligan' }
  | { type: 'rendirse' }
  | { type: 'pasar_turno' }
  | {
      type: 'jugar_campeon'
      cardInstanceId: string
      slot: number
      eterIds: string[]
      /** Sacrificios Soberano (1) / Emperador (2): ids de Campeones propios. */
      sacrificios?: string[]
    }
  | { type: 'jugar_mistica'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'colocar_arcana'; cardInstanceId: string; slot: number }
  | { type: 'activar_arcana'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'equipar_artefacto'; cardInstanceId: string; campeonInstanceId: string }
  | { type: 'bloquear_eter'; eterIds: string[]; campeonSlot: number }
  | { type: 'descartar_carta'; cardInstanceIds: string[] }
  | { type: 'elegir_opcion'; opcionId: string }
  | { type: 'elegir_objetivo'; objetivoId: string }
  | { type: 'usar_transmutar'; cardInstanceId: string; eterIds: string[] }
  | { type: 'activar_habilidad'; cardInstanceId: string; eterIds: string[]; objetivoId?: string }
  // Apéndice de combate (change 2, spec #1227 R15): declarar_ataque,
  // declarar_bloqueo y elegir_ruptura (C3) ya despachan en el core;
  // responder_cadena y pasar_prioridad (C4) entran a la unión como stub
  // (fallan por validación hasta su commit, patrón elegir_opcion).
  | { type: 'declarar_ataque'; atacanteIds: string[] }
  | { type: 'declarar_bloqueo'; asignaciones: Record<string, string> }
  | { type: 'elegir_ruptura'; atacanteId: string | null; vinculoSlot?: number }
  | { type: 'responder_cadena'; cardInstanceId: string }
  | { type: 'pasar_prioridad' }

export type ApplyActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; state: GameState; error: string }

/**
 * Aplica una acción de forma pura y ATÓMICA (ADR-5):
 * 1. valida READ-ONLY sobre el estado de entrada (sin mutar, sin RNG);
 * 2. si es válida: structuredClone → ejecuta (consume RNG, emite events);
 * 3. si no: { ok:false, state } devuelve el MISMO estado sin cambios.
 * El actor implícito es `state.turno` (jugador activo); toda carta referenciada
 * debe ser del jugador activo (así una acción de B durante el turno de A falla).
 */
export function applyAction(state: GameState, action: Action, ctx: Ctx): ApplyActionResult {
  ctx.events.length = 0 // eventos acumulados de la acción anterior (ADR-5)
  const error = validarAccion(state, action)
  if (error) return { ok: false, state, error }
  const s = structuredClone(state)
  ejecutarAccion(s, action, ctx)
  return { ok: true, state: s, events: [...ctx.events] }
}

function validarAccion(state: GameState, action: Action): string | null {
  switch (action.type) {
    case 'rendirse':
      return state.fase === 'terminada' ? 'la partida ya terminó' : null
    case 'mulligan':
      return validarMulligan(state)
    case 'pasar_mulligan':
      return state.fase !== 'pre_partida' ? 'pasar_mulligan solo en pre_partida' : null
    case 'pasar_turno':
      return validarPasarTurno(state)
    case 'descartar_carta':
      return validarDescartarCarta(state, action)
    case 'jugar_campeon':
      return validarJugarCampeon(state, action)
    case 'jugar_mistica':
      return validarJugarMistica(state, action)
    case 'colocar_arcana':
      return validarColocarArcana(state, action)
    case 'activar_arcana':
      return validarActivarArcana(state, action)
    case 'equipar_artefacto':
      return validarEquiparArtefacto(state, action)
    case 'bloquear_eter':
      return validarBloquearEter(state, action)
    case 'elegir_opcion':
      return validarElegirOpcion(state, action)
    case 'elegir_objetivo':
      return validarElegirObjetivo(state, action)
    case 'usar_transmutar':
      return validarUsarTransmutar(state, action)
    case 'activar_habilidad':
      return validarActivarHabilidad(state, action)
    case 'declarar_ataque':
      return validarDeclararAtaque(state, action.atacanteIds)
    case 'declarar_bloqueo':
      return validarDeclararBloqueo(state, action.asignaciones)
    case 'elegir_ruptura':
      return validarElegirRuptura(state, action.atacanteId, action.vinculoSlot)
    case 'responder_cadena':
      return validarResponderCadena(state, action.cardInstanceId)
    case 'pasar_prioridad':
      return validarPasarPrioridad(state)
    default:
      return 'acción no disponible en esta fase'
  }
}

/**
 * Pasar de fase (C4): forja→choque→ocaso→alba del rival (auto-resuelta).
 * En Ocaso solo se puede pasar con mano ≤ 6 (manual §8).
 */
function validarPasarTurno(state: GameState): string | null {
  const p = state.players[state.turno]
  switch (state.fase) {
    case 'forja':
      return null
    case 'choque':
      // ADR-11: solo se pasa con el combate RESUELTO (paso 'resolucion');
      // la limpieza del estado ocurre en la transición choque→ocaso.
      return state.combate && state.combate.paso !== 'resolucion'
        ? 'resuelve el combate antes de pasar el turno'
        : null
    case 'ocaso':
      return p.mano.length > 6 ? 'no puedes pasar el turno con más de 6 cartas en mano' : null
    case 'pre_partida':
      return 'pasar_turno solo durante la partida'
    case 'terminada':
      return 'la partida terminó'
  }
}

/** Descartar en Ocaso (manual §8): cartas propias en mano, sin duplicados. */
function validarDescartarCarta(state: GameState, action: Extract<Action, { type: 'descartar_carta' }>): string | null {
  if (state.fase !== 'ocaso') return 'descartar_carta solo en Ocaso'
  if (action.cardInstanceIds.length === 0) return 'no indicaste cartas para descartar'
  if (new Set(action.cardInstanceIds).size !== action.cardInstanceIds.length) {
    return 'no puedes descartar cartas duplicadas'
  }
  const p = state.players[state.turno]
  for (const id of action.cardInstanceIds) {
    if (!p.mano.includes(id)) return `la carta no está en tu mano: ${id}`
  }
  return null
}

function validarMulligan(state: GameState): string | null {
  if (state.fase !== 'pre_partida') return 'mulligan solo en pre_partida'
  // Manual §2: "Solo una vez por jugador" — cada jugador decide su mulligan
  // independientemente del rival (fiel al físico, #1212).
  const activo = state.players[state.turno]
  if (activo.mulliganUsado) return 'el mulligan ya se usó'
  return null
}

/* ─────────────────────── Validadores de Forja (C5) ─────────────────────── */

/** Base común: fase forja + carta propia en mano del jugador activo. */
function cartaEnMano(state: GameState, cardInstanceId: string): { error: string } | { inst: CardInstance; cardId: string } {
  const p = state.players[state.turno]
  if (!p.mano.includes(cardInstanceId)) return { error: 'la carta no está en tu mano' }
  const inst = state.instances[cardInstanceId]
  const cardId = inst?.cardId ?? null
  if (!inst || cardId === null) return { error: 'carta desconocida' }
  return { inst, cardId }
}

function validarJugarCampeon(state: GameState, action: Extract<Action, { type: 'jugar_campeon' }>): string | null {
  if (state.fase !== 'forja') return 'jugar_campeon solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esCampeon(meta)) return 'no es un Campeón'
  if (action.slot < 0 || action.slot >= SLOTS_CAMPEONES) return 'slot inválido'
  const p = state.players[state.turno]
  const ocupante = p.campo.campeones[action.slot]
  const sacrificios = action.sacrificios ?? []
  if (ocupante !== null && !sacrificios.includes(ocupante)) return 'slot ocupado'

  const pago = validarPago(state, state.turno, action.eterIds, meta.id)
  if (!pago.ok) return pago.error ?? 'pago inválido'

  const requeridos = sacrificiosRequeridos(meta.roles)
  if (new Set(sacrificios).size !== sacrificios.length) return 'sacrificios duplicados'
  if (sacrificios.length !== requeridos) {
    return requeridos === 0 ? 'este Campeón no exige sacrificios' : `este Campeón exige ${requeridos} sacrificio(s)`
  }
  for (const id of sacrificios) {
    const slotIdx = p.campo.campeones.indexOf(id)
    if (slotIdx === -1) return `el sacrificio no es un Campeón tuyo en tu campo: ${id}`
    const sInst = state.instances[id]
    const sMeta = sInst?.cardId ? getCardMeta(sInst.cardId) : null
    if (!sInst || !sMeta || !esCampeon(sMeta)) return `el sacrificio no es un Campeón: ${id}`
    if (!faccionesCompartidas(sMeta.facciones, meta.facciones)) return `el sacrificio no comparte facción con el Campeón: ${id}`
  }
  if (esSingular(meta) && copiasEnCampo(state, state.turno, meta.id) >= 1) {
    return 'Singular: solo puede haber 1 copia en el campo'
  }
  return null
}

function validarJugarMistica(state: GameState, action: Extract<Action, { type: 'jugar_mistica' }>): string | null {
  if (state.fase !== 'forja') return 'jugar_mistica solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esMistica(meta)) return 'no es una Mística'
  if (action.slot < 0 || action.slot >= SLOTS_MISTICAS_TACTICAS) return 'slot inválido'
  if (state.players[state.turno].campo.misticasTacticas[action.slot] !== null) return 'slot ocupado'
  const pago = validarPago(state, state.turno, action.eterIds, meta.id)
  if (!pago.ok) return pago.error ?? 'pago inválido'
  return null
}

function validarColocarArcana(state: GameState, action: Extract<Action, { type: 'colocar_arcana' }>): string | null {
  if (state.fase !== 'forja') return 'colocar_arcana solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esArcana(meta)) return 'no es una Arcana'
  if (action.slot < 0 || action.slot >= SLOTS_ARCANAS_COMBATE) return 'slot inválido'
  if (state.players[state.turno].campo.arcanasCombate[action.slot] !== null) return 'slot ocupado'
  // La colocación es GRATIS (sin pago de éter). El pago se hace al activar.
  return null
}

/** Activar_arcana: revela la Arcana boca arriba y paga su coste de éter. */
export function validarActivarArcana(state: GameState, action: Extract<Action, { type: 'activar_arcana' }>): string | null {
  if (state.fase !== 'forja') return 'activar_arcana solo en Forja'
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'instancia no encontrada'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta || !esArcana(meta)) return 'no es una Arcana'
  const p = state.players[state.turno]
  // La Arcana debe estar en el campo (3D-3F) boca abajo
  const idx = p.campo.arcanasCombate.indexOf(action.cardInstanceId)
  if (idx === -1) return 'la Arcana no está en el campo'
  if (inst.bocaArriba) return 'la Arcana ya está boca arriba'
  // §5.4: NO se pueden activar el turno en que fueron colocadas
  if (inst.entradaEsteTurno) return 'la Arcana no se puede activar el turno en que fue colocada (§5.4)'
  // §5.4: la condición de la Arcana debe cumplirse para activar
  const reqError = validarRequisito(state, state.turno, meta.id)
  if (reqError) return reqError
  // Slot coincidence check
  if (action.slot !== idx) return 'el slot no coincide con la posición de la Arcana'
  // Pago de éter
  const pago = validarPago(state, state.turno, action.eterIds, meta.id)
  if (!pago.ok) return pago.error ?? 'pago inválido'
  return null
}

/**
 * Validar equipar_artefacto: Mística/Arcana con keyword ARTEFACTO en campo,
 * se equipa a un Campeón propio en el campo.
 */
function validarEquiparArtefacto(state: GameState, action: Extract<Action, { type: 'equipar_artefacto' }>): string | null {
  if (state.fase !== 'forja') return 'equipar_artefacto solo en Forja'
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'carta no encontrada'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  if (!('keywords' in meta) || !meta.keywords?.includes('Artefacto')) return 'esta carta no tiene ARTEFACTO'
  // La carta debe estar en el campo (místicasTacticas o arcanasCombate)
  const p = state.players[state.turno]
  const enMT = p.campo.misticasTacticas.includes(action.cardInstanceId)
  const enAC = p.campo.arcanasCombate.includes(action.cardInstanceId)
  if (!enMT && !enAC) return 'la carta no está en el campo'
  if (inst.equipadoA) return 'la carta ya está equipada'
  // El campeón objetivo debe estar en el campo propio
  const campeonInst = state.instances[action.campeonInstanceId]
  if (!campeonInst) return 'campeón no encontrado'
  if (!p.campo.campeones.includes(action.campeonInstanceId)) return 'el campeón no está en tu campo'
  const campeonMeta = campeonInst.cardId ? getCardMeta(campeonInst.cardId) : null
  if (!campeonMeta || !esCampeon(campeonMeta)) return 'el objetivo no es un Campeón'
  return null
}

function validarBloquearEter(state: GameState, action: Extract<Action, { type: 'bloquear_eter' }>): string | null {
  if (state.fase !== 'forja') return 'bloquear_eter solo en Forja'
  return validarBloqueo(state, state.turno, action.eterIds, action.campeonSlot)
}

/** C2: validar elegir_opcion — solo en forja del jugador con opción pendiente. */
function validarElegirOpcion(state: GameState, action: Extract<Action, { type: 'elegir_opcion' }>): string | null {
  if (state.fase !== 'forja') return 'elegir_opcion solo en Forja'
  const pendiente = state.opcionesPendientes?.find(
    (o) => o.jugador === state.turno && o.eterId === action.opcionId
  )
  if (!pendiente) return 'no hay opción pendiente para este jugador'
  return null
}

/**
 * C3 (D1): validar elegir_objetivo — el FRENTE de la cola (FIFO) debe pertenecer
 * al jugador activo y el objetivo elegido estar entre las opciones YA filtradas
 * (el motor nunca expone objetivos inválidos). Aplica en forja y choque:
 * al-invocar y al-atacar arman pendientes (a diferencia de elegir_opcion, C2).
 */
function validarElegirObjetivo(state: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>): string | null {
  const pendiente = state.objetivosPendientes?.[0]
  if (!pendiente) return 'no hay objetivo pendiente'
  if (pendiente.jugador !== state.turno) return 'no es tu turno para elegir objetivo'
  if (!pendiente.opciones.includes(action.objetivoId)) return 'el objetivo no está entre las opciones válidas'
  return null
}

/**
 * C3d (D4): validar usar_transmutar — Campeón con keyword `Transmutar` del
 * jugador ACTIVO en su campo; eterIds ⊆ p.eterPagado (1A),
 * únicos y ≤ 2. Genérico por keyword (no hardcodea FB-012).
 */
function validarUsarTransmutar(state: GameState, action: Extract<Action, { type: 'usar_transmutar' }>): string | null {
  const p = state.players[state.turno]
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'la carta no existe'
  if (!tieneKeyword(state, action.cardInstanceId, 'Transmutar')) return 'la carta no tiene Transmutar'
  if (!p.campo.campeones.includes(action.cardInstanceId)) return 'la carta no está en tu campo'
  if (action.eterIds.length > 2) return 'máximo 2 Éteres pagados'
  if (new Set(action.eterIds).size !== action.eterIds.length) return 'éteres repetidos'
  for (const eterId of action.eterIds) {
    if (!p.eterPagado.includes(eterId)) return 'un Éter no está pagado (1A)'
  }
  return null
}

/**
 * Validar activar_habilidad — Campeón propio con efectoDisparo
 * en campo del jugador activo. Dos patrones de coste:
 *  - "Bloqueado": eterIds de la Reserva que comparten facción → bloqueados en el Campeón.
 *  - "Agota": eterIds de la Reserva → pagados (1A) + campeón agotado + 1/turno.
 */
function validarActivarHabilidad(state: GameState, action: Extract<Action, { type: 'activar_habilidad' }>): string | null {
  const p = state.players[state.turno]
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'la carta no existe'
  if (!p.campo.campeones.includes(action.cardInstanceId)) return 'la carta no está en tu campo'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  const tieneContinuo = 'efectoContinuo' in meta && !!(meta as any).efectoContinuo
  const tieneDisparo = !!meta.efectoDisparo
  if (!tieneContinuo && !tieneDisparo) return 'esta carta no tiene efecto activo'

  const esContinuo = tieneContinuo
  const esBloqueado = esContinuo || (meta.efectoDisparo?.includes('bloqueado') ?? false)

  if (esBloqueado) {
    // Patrón "Bloqueado": eterIds de la Reserva → Campeón.eterBloqueado
    const costoEsperado = costeEterHabilidad(meta)
    if (costoEsperado > 0 && action.eterIds.length !== costoEsperado) {
      return `${meta.name} requiere exactamente ${costoEsperado} Éter(es), indicaste ${action.eterIds.length}`
    }
    if (action.eterIds.length === 0) return 'no indicaste Éteres para bloquear'
    if (new Set(action.eterIds).size !== action.eterIds.length) return 'éteres repetidos'
    for (const eterId of action.eterIds) {
      if (!p.eterReserva.includes(eterId)) return `el Éter ${eterId} no está en tu Reserva`
      const eterInst = state.instances[eterId]
      const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
      if (!eterMeta) return `Éter desconocido: ${eterId}`
    }
  } else {
    // Patrón "Agota": eterIds de la Reserva → pagados (1A) + agota + 1/turno
    if (inst.agotado) return 'la carta ya está agotada'
    if (inst.opcionUsadaEsteTurno) return 'ya usaste esta habilidad este turno'
    const costoEsperado = costeEterHabilidad(meta)
    const costoReal = costoEsperado > 0 ? costoEsperado : 1 // fallback: 1 éter
    if (action.eterIds.length !== costoReal) {
      return `${meta.name} requiere exactamente ${costoReal} Éter(es), indicaste ${action.eterIds.length}`
    }
    for (const eterId of action.eterIds) {
      if (!p.eterReserva.includes(eterId)) return `el Éter ${eterId} no está en tu Reserva`
    }
  }
  return null
}

function ejecutarAccion(s: GameState, action: Action, ctx: Ctx): void {
  switch (action.type) {
    case 'rendirse': {
      ctx.emit({ type: 'rendicion', jugador: s.turno })
      const ganador: PlayerId = s.turno === 'A' ? 'B' : 'A'
      s.fase = 'terminada'
      s.ganador = ganador
      s.motivo = 'rendicion'
      ctx.emit({ type: 'partida_terminada', ganador, motivo: 'rendicion' })
      return
    }
    case 'mulligan': {
      const jugador = s.turno
      const p = s.players[jugador]
      // Devuelve la mano al mazo (40) y baraja: consume 39 extracciones
      const mazoReconstruido = shuffleFisherYates(ctx, [...p.mano, ...p.mazo])
      p.mano = mazoReconstruido.slice(0, 5)
      p.mazo = mazoReconstruido.slice(5)
      p.mulliganUsado = true
      ctx.emit({ type: 'mulligan_realizado', jugador })
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_mulligan': {
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_turno': {
      ejecutarPasarTurno(s, ctx)
      return
    }
    case 'descartar_carta': {
      ejecutarDescartarCarta(s, action, ctx)
      return
    }
    case 'jugar_campeon': {
      ejecutarJugarCampeon(s, action, ctx)
      return
    }
    case 'jugar_mistica': {
      ejecutarJugarMistica(s, action, ctx)
      return
    }
    case 'colocar_arcana': {
      ejecutarColocarArcana(s, action, ctx)
      return
    }
    case 'activar_arcana': {
      ejecutarActivarArcana(s, action, ctx)
      return
    }
    case 'equipar_artefacto': {
      ejecutarEquiparArtefacto(s, action, ctx)
      return
    }
    case 'bloquear_eter': {
      ejecutarBloquearEter(s, action, ctx)
      return
    }
    case 'elegir_opcion': {
      ejecutarElegirOpcion(s, action, ctx)
      return
    }
    case 'elegir_objetivo': {
      ejecutarElegirObjetivo(s, action, ctx)
      return
    }
    case 'usar_transmutar': {
      ejecutarUsarTransmutar(s, action, ctx)
      return
    }
    case 'activar_habilidad': {
      ejecutarActivarHabilidad(s, action, ctx)
      return
    }
    case 'declarar_ataque': {
      ejecutarDeclararAtaque(s, action.atacanteIds, ctx)
      return
    }
    case 'declarar_bloqueo': {
      ejecutarDeclararBloqueo(s, action.asignaciones, ctx)
      return
    }
    case 'elegir_ruptura': {
      ejecutarElegirRuptura(s, action.atacanteId, action.vinculoSlot, ctx)
      return
    }
    case 'responder_cadena': {
      ejecutarResponderCadena(s, action.cardInstanceId, ctx)
      return
    }
    case 'pasar_prioridad': {
      ejecutarPasarPrioridad(s, ctx)
      return
    }
  }
}

/** Cede el turno de mulligan (A luego B); cuando ambos deciden, la partida inicia. */
function avanzarMulligan(s: GameState, ctx: Ctx): void {
  const decisor = s.turno
  s.turno = decisor === 'A' ? 'B' : 'A'
  if (decisor === 'B') iniciarPartida(s, ctx)
}

/**
 * Secuencia de arranque (ADR-5): partida_iniciada, turno_iniciado,
 * fase_iniciada{alba}, Alba auto-resuelta (robar 1), fase_iniciada{forja}.
 */
function iniciarPartida(s: GameState, ctx: Ctx): void {
  const pj = s.primerJugador
  s.fase = 'forja'
  s.turno = pj
  s.primerTurno = true
  ctx.emit({ type: 'partida_iniciada', primerJugador: pj })
  ctx.emit({ type: 'turno_iniciado', jugador: pj })
  ctx.emit({ type: 'fase_iniciada', fase: 'alba', jugador: pj })
  resolverAlba(s, ctx, pj)
  // Si el primer robo agotó el mazo (defensivo), la partida ya terminó y no hay forja
  if (s.fase === 'forja') {
    ctx.emit({ type: 'fase_iniciada', fase: 'forja', jugador: pj })
  }
}

/**
 * Transiciones de fase (C4): forja→choque→ocaso→alba del rival (auto-resuelta).
 * Al pasar Ocaso el turno cambia al rival y su Alba se resuelve DENTRO de la
 * misma acción (ADR-3): turno_iniciado, fase_iniciada{alba}, Alba, fase_iniciada{forja}.
 */
function ejecutarPasarTurno(s: GameState, ctx: Ctx): void {
  if (s.fase === 'forja' || s.fase === 'choque') {
    const siguiente: FaseNombre = s.fase === 'forja' ? 'choque' : 'ocaso'
    if (s.fase === 'choque') {
      limpiarCombate(s) // ADR-11: limpieza defensiva al salir de Choque
      // Effect Registry: resolver efectos de fase 'ocaso' antes de la purga legacy
      resolverFaseEfectos(s, ctx, 'ocaso', s.turno)
      // C1 (ADR-22): al llegar el Ocaso expiran los efectos 'ocaso' del turno
      // en curso (ambos jugadores) y las keywordsTemporales otorgadas.
      purgarEfectosTemporales(s, 'ocaso', undefined, ctx)
      purgarKeywordsTemporales(s)
    }
    if (s.fase === 'forja') {
      // C2 (ADR-24): al inicio del Choque del jugador activo se disparan
      // efectos de inicio-choque: Éteres en Reserva (FB-002/DS-003) Y Arcanas
      // propias en campo (DS-032 al-inicio-choque, change 4).
      const p = s.players[s.turno]
      const arcanas = p.campo.arcanasCombate.filter((x): x is string => x !== null)
      if (p.eterReserva.length > 0 || arcanas.length > 0) {
        dispararTrigger(s, ctx, 'al-inicio-choque', s.turno, [...p.eterReserva, ...arcanas])
      }
    }
    s.fase = siguiente
    ctx.emit({ type: 'fase_iniciada', fase: siguiente, jugador: s.turno })
    return
  }
  // Ocaso: fin del turno del jugador activo
  const rival: PlayerId = s.turno === 'A' ? 'B' : 'A'
  if (s.primerTurno && s.turno === s.primerJugador) s.primerTurno = false
  s.turno = rival
  ctx.emit({ type: 'turno_iniciado', jugador: rival })
  ctx.emit({ type: 'fase_iniciada', fase: 'alba', jugador: rival })
  resolverAlba(s, ctx, rival)
  if (s.fase !== 'terminada') {
    s.fase = 'forja'
    ctx.emit({ type: 'fase_iniciada', fase: 'forja', jugador: rival })
  }
}

/** Descarta en Ocaso: mano → cementerio; un solo evento con todos los ids (eventos.ts). */
function ejecutarDescartarCarta(s: GameState, action: Extract<Action, { type: 'descartar_carta' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const descartadas: string[] = []
  for (const id of action.cardInstanceIds) {
    const idx = p.mano.indexOf(id)
    if (idx === -1) continue // validado antes (defensivo)
    p.mano.splice(idx, 1)
    // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
    enviarAlCementerio(s, ctx, id)
    descartadas.push(id)
  }
  if (descartadas.length > 0) {
    ctx.emit({ type: 'carta_descartada', jugador: s.turno, cardInstanceIds: descartadas })
  }
}

/* ──────────────────── Ejecución de Forja (C5) ──────────────────── */

/** Invoca: pago → sacrificios (slot → 2G) → mano → 2B-2F boca arriba CANSADO. */
function ejecutarJugarCampeon(s: GameState, action: Extract<Action, { type: 'jugar_campeon' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  const cardId = s.instances[id]!.cardId!
  // 1. Pago (con contextoUso para gatillos FB-004/DS-005)
  const contextoUso: ContextoUso = { tipo: 'invocar', cardInstanceId: id }
  aplicarPago(s, ctx, s.turno, action.eterIds, cardId, contextoUso)
  // 2. Sacrificios: salen de su slot → 2G (liberan slot para el Campeón)
  for (const sacId of action.sacrificios ?? []) {
    const slotIdx = p.campo.campeones.indexOf(sacId)
    const zona = slotAZona('campeones', slotIdx) ?? '2B'
    ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: sacId, zona, jugador: s.turno })
    p.campo.campeones[slotIdx] = null
    // ADR-17: el sacrificio NO es evitable — el Éter bloqueado del sacrificado
    // vuelve a la Reserva 2A INMEDIATO (glosario L1351, manual 7.2 L937).
    // Fix del gap #1223: antes quedaba atascado en la instancia que iba a 2G.
    liberarEterBloqueado(s, ctx, sacId, '2A')
    // C5 (change 4): sacrificio → 2G con trigger al-ser-enviado-al-cementerio
    enviarAlCementerio(s, ctx, sacId)
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: sacId, zona: '2G', jugador: s.turno, bocaArriba: true })
  }
  // 3. Invocar: mano → slot, CANSADO (agotado)
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('campeones', action.slot) ?? '2B'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.campeones[action.slot] = id
  s.instances[id]!.agotado = true
  s.instances[id]!.entradaEsteTurno = true  // §5.5: no puede responder en cadena el turno que entra
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Campeón', slot: action.slot })
  // C3 (D5): al-invocar se dispara con la instancia YA en campo (post-invocación)
  dispararTrigger(s, ctx, 'al-invocar', s.turno, [id])
}

/** Paga y coloca la Mística boca arriba en 3A-3C. */
function ejecutarJugarMistica(s: GameState, action: Extract<Action, { type: 'jugar_mistica' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  const contextoUso: ContextoUso = { tipo: 'jugar', cardInstanceId: id }
  aplicarPago(s, ctx, s.turno, action.eterIds, s.instances[id]!.cardId!, contextoUso)
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('misticasTacticas', action.slot) ?? '3A'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.misticasTacticas[action.slot] = id
  s.instances[id]!.entradaEsteTurno = true  // §5.5: no puede responder en cadena el turno que entra
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Mística', slot: action.slot })
  // C5 (change 4): al-jugar-mística se dispara con la instancia YA en campo
  dispararTrigger(s, ctx, 'al-jugar-mistica', s.turno, [id])
}

/** Coloca la Arcana BOCA ABAJO en 3D-3F SIN pagar (pago al activar). */
function ejecutarColocarArcana(s: GameState, action: Extract<Action, { type: 'colocar_arcana' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('arcanasCombate', action.slot) ?? '3D'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.arcanasCombate[action.slot] = id
  s.instances[id]!.bocaArriba = false
  s.instances[id]!.entradaEsteTurno = true  // §5.4: no se puede activar el turno en que fue colocada
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Arcana', slot: action.slot })
}

/** Revela la Arcana (boca arriba) y paga su coste de éter. */
function ejecutarActivarArcana(s: GameState, action: Extract<Action, { type: 'activar_arcana' }>, ctx: Ctx): void {
  const id = action.cardInstanceId
  const inst = s.instances[id]
  if (!inst) return
  const contextoUso: ContextoUso = { tipo: 'habilidad', cardInstanceId: id }
  aplicarPago(s, ctx, s.turno, action.eterIds, inst.cardId!, contextoUso)
  inst.bocaArriba = true
  ctx.emit({ type: 'carta_activada', cardInstanceId: id, jugador: s.turno, slot: action.slot })
  // Abrir cadena global: el rival podría responder con cartas Disparo
  const meta = getCardMeta(inst.cardId!)
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: meta?.name ?? id })
}

/** Equipa un ARTEFACTO a un Campeón: la carta queda en su slot, efecto aplica al campeón. */
function ejecutarEquiparArtefacto(s: GameState, action: Extract<Action, { type: 'equipar_artefacto' }>, ctx: Ctx): void {
  const inst = s.instances[action.cardInstanceId]
  if (!inst) return
  inst.equipadoA = action.campeonInstanceId
  ctx.emit({ type: 'carta_activada', cardInstanceId: action.cardInstanceId, jugador: s.turno, slot: -1 })
}

/** Bloqueo facción v2.1: 2A → Campeón.eterBloqueado (el clon ya fue validado). */
function ejecutarBloquearEter(s: GameState, action: Extract<Action, { type: 'bloquear_eter' }>, ctx: Ctx): void {
  const error = validarBloqueo(s, s.turno, action.eterIds, action.campeonSlot)
  if (error) return // defensivo: ya validado en validarAccion
  const p = s.players[s.turno]
  const campeonId = p.campo.campeones[action.campeonSlot]!
  const instCampeon = s.instances[campeonId]
  instCampeon.eterBloqueado = [...(instCampeon.eterBloqueado ?? []), ...action.eterIds]
  for (const id of action.eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
  }
  ctx.emit({ type: 'eter_bloqueado', jugador: s.turno, eterIds: action.eterIds, campeonId })
}

/** C2: ejecutar elegir_opcion — greedy determinista (anti-cheat 6.2). */
function ejecutarElegirOpcion(s: GameState, action: Extract<Action, { type: 'elegir_opcion' }>, ctx: Ctx): void {
  const j = s.turno
  const p = s.players[j]
  const pendiente = s.opcionesPendientes!.find((o) => o.jugador === j && o.eterId === action.opcionId)
  if (!pendiente) return // ya validado

  // Greedy determinista: primer Campeón con facción compartida + primer Éter Reserva compatible
  let elegido: { campeonSlot: number; eterId: string } | null = null
  for (let slot = 0; slot < SLOTS_CAMPEONES && !elegido; slot++) {
    const campeonId = p.campo.campeones[slot]
    if (!campeonId) continue
    const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId]!.cardId!) : null
    if (!metaC) continue
    for (const eterId of p.eterReserva) {
      const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId]!.cardId!) : null
      if (metaE && faccionesCompartidas(metaE.facciones, metaC.facciones)) {
        elegido = { campeonSlot: slot, eterId }
        break
      }
    }
  }
  if (!elegido) {
    // No hay pareja válida (no debería pasar si validación correcta)
    s.opcionesPendientes = s.opcionesPendientes!.filter((o) => !(o.jugador === j && o.eterId === action.opcionId))
    return
  }
  const error = validarBloqueo(s, j, [elegido.eterId], elegido.campeonSlot)
  if (error) {
    s.opcionesPendientes = s.opcionesPendientes!.filter((o) => !(o.jugador === j && o.eterId === action.opcionId))
    return
  }
  // Ejecutar bloqueo (reutiliza lógica de ejecutarBloquearEter)
  const campeonId = p.campo.campeones[elegido.campeonSlot]!
  const instCampeon = s.instances[campeonId]
  instCampeon.eterBloqueado = [...(instCampeon.eterBloqueado ?? []), elegido.eterId]
  p.eterReserva.splice(p.eterReserva.indexOf(elegido.eterId), 1)
  ctx.emit({ type: 'eter_bloqueado', jugador: j, eterIds: [elegido.eterId], campeonId })

  // Marcar opción usada en el Éter Pasivo
  const eterPasivo = s.instances[pendiente.eterId]
  if (eterPasivo) eterPasivo.opcionUsadaEsteTurno = true

  // Limpiar pendiente
  s.opcionesPendientes = s.opcionesPendientes!.filter((o) => !(o.jugador === j && o.eterId === action.opcionId))
}

/**
 * C3 (D1): resolución por re-dispatch (patrón C2 contextoUso) — saca el FRENTE
 * de la cola FIFO y re-dispara el trigger que originó el pendiente con
 * contextoUso 'objetivo-elegido' + objetivoId. El handler registrado distingue:
 * si ya viene con ese contextoUso, APLICA el efecto sobre objetivoId; si no,
 * ARMA el pendiente. Así el estado es serializable (sin callbacks).
 */
function ejecutarElegirObjetivo(s: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>, ctx: Ctx): void {
  const pendiente = s.objetivosPendientes?.[0]
  if (!pendiente) return // defensivo: ya validado en validarAccion
  s.objetivosPendientes = s.objetivosPendientes!.slice(1)
  dispararTrigger(s, ctx, pendiente.trigger as TriggerEfecto, pendiente.jugador, [pendiente.instId], {
    contextoUso: 'objetivo-elegido',
    objetivoId: action.objetivoId,
  })
}

/**
 * C3d (D4): ejecutar usar_transmutar — 1) eterIds (1A) → 2A Reserva del
 * activo (eter_reagrupado); 2) auto-sacrificio: la carta sale del campo →
 * 2G del DUEÑO (patrón sacrificio actions.ts) + libera su Éter bloqueado a
 * 1A. NO pasa por `destruirCarta` (Inmortal/Indestructible no lo previenen:
 * es coste, no destrucción).
 */
function ejecutarUsarTransmutar(s: GameState, action: Extract<Action, { type: 'usar_transmutar' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  const inst = s.instances[id]!
  // 1. Coste: eterIds (1A) → 2A Reserva (patrón eter_reagrupado combat.ts:112)
  for (const eterId of action.eterIds) {
    const idx = p.eterPagado.indexOf(eterId)
    if (idx !== -1) p.eterPagado.splice(idx, 1)
  }
  p.eterReserva.push(...action.eterIds)
  if (action.eterIds.length > 0) {
    ctx.emit({ type: 'eter_reagrupado', jugador: s.turno, eterIds: action.eterIds })
  }
  // 2. Auto-sacrificio: campo → 2G (cementerio del dueño), libera el slot
  const slotIdx = p.campo.campeones.indexOf(id)
  const zona = slotAZona('campeones', slotIdx) ?? '2B'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: s.turno })
  p.campo.campeones[slotIdx] = null
  liberarEterBloqueado(s, ctx, id, '1A')
  // C5 (change 4): auto-sacrificio → 2G del dueño con trigger
  enviarAlCementerio(s, ctx, id)
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
}

/**
 * Ejecutar activar_habilidad — dos patrones:
 *  - "Bloqueado" (Cassandra/Korr): eterIds de Reserva → Campeón.eterBloqueado.
 *    El aura se aplica dinámicamente via aurasDe (detección automática).
 *  - "Agota" (Seraphina/Nymeria/Varek/Vorlag): eterIds → 1A + agota + 1/turno
 *    + disparar trigger 'al-activar-habilidad' (handler aplica efecto).
 */
function ejecutarActivarHabilidad(s: GameState, action: Extract<Action, { type: 'activar_habilidad' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const inst = s.instances[action.cardInstanceId]!
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return

  // Continuo (efectoContinuo): bloquea éter, agota al activar
  const esContinuo = 'efectoContinuo' in meta && !!(meta as any).efectoContinuo
  // Disparo con éter bloqueado (legacy): no agota
  const esBloqueadoLegacy = !esContinuo && (meta.efectoDisparo?.includes('bloqueado') ?? false)

  if (esContinuo || esBloqueadoLegacy) {
    // Patrón "Bloqueado": mueve éteres de Reserva → Campeón.eterBloqueado
    for (const eterId of action.eterIds) {
      p.eterReserva.splice(p.eterReserva.indexOf(eterId), 1)
    }
    inst.eterBloqueado = [...(inst.eterBloqueado ?? []), ...action.eterIds]
    // Si el texto indica "Alba" → registrar efecto pendiente para liberar en Alba del dueño
    const textoEfecto = esContinuo ? (meta as any).efectoContinuo : meta.efectoDisparo
    if (textoEfecto?.includes('Alba')) {
      registrarEfectoPendiente(s, {
        fuente: action.cardInstanceId,
        owner: s.turno,
        triggerFase: 'alba',
        triggerOwner: 'dueño',
        accion: { tipo: 'liberar-eter', eterIds: [...action.eterIds], destino: 'reserva' },
        duracion: hastaAlba(),
      })
    }
    ctx.emit({ type: 'eter_bloqueado', jugador: s.turno, eterIds: action.eterIds, campeonId: action.cardInstanceId })
    // Continuo: agota al activar
    if (esContinuo) {
      inst.agotado = true
    }
    // Disparar trigger para handlers con targeting (Aurora/Ragnar).
    dispararTrigger(s, ctx, 'al-activar-habilidad', s.turno, [action.cardInstanceId], {
      objetivoId: action.objetivoId,
    })
  } else {
    // Patrón "Disparo/Agota": éteres → 1A (pagado) + 1/turno
    for (const eterId of action.eterIds) {
      p.eterReserva.splice(p.eterReserva.indexOf(eterId), 1)
      p.eterPagado.push(eterId)
    }
    if (action.eterIds.length > 0) {
      ctx.emit({ type: 'eter_pagado', jugador: s.turno, eterIds: action.eterIds, costo: action.eterIds.length, aportado: action.eterIds.length })
    }
    // Disparo: NO agota (puede usar agotado)
    inst.opcionUsadaEsteTurno = true
    // Disparar trigger para que el handler aplique el efecto
    dispararTrigger(s, ctx, 'al-activar-habilidad', s.turno, [action.cardInstanceId], {
      objetivoId: action.objetivoId,
    })
  }
}

/* ─────────────────── Generador de acciones de Forja ─────────────────── */

/**
 * Genera la acción de jugar/colocar válida para una carta de la mano del jugador
 * activo, o null si no puede jugarse ahora (sin pago, sin slot, sin sacrificios).
 * Usado por getValidActions: garantiza payloads que NUNCA fallan.
 */
export function generarAccionesForja(state: GameState, playerId: PlayerId, cardInstanceId: string): Action | null {
  const p = state.players[playerId]
  const inst = state.instances[cardInstanceId]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  if (!meta) return null
  switch (meta.type) {
    case 'Campeón': {
      const eterIds = etersParaPagar(state, playerId, meta.id)
      if (!eterIds) return null
      const requeridos = sacrificiosRequeridos(meta.roles)
      const sacrificables = campeonesSacrificables(state, playerId, meta.id)
      if (sacrificables.length < requeridos) return null
      const sacrificios = sacrificables.slice(0, requeridos)
      const libre = p.campo.campeones.findIndex((c) => c === null)
      const slot = libre !== -1 ? libre : p.campo.campeones.indexOf(sacrificios[0])
      const accion: Action = { type: 'jugar_campeon', cardInstanceId, slot, eterIds, sacrificios }
      if (validarJugarCampeon(state, accion) !== null) return null
      if (validarRequisito(state, playerId, meta.id) !== null) return null
      return accion
    }
    case 'Mística': {
      const eterIds = etersParaPagar(state, playerId, meta.id)
      if (!eterIds) return null
      const slot = p.campo.misticasTacticas.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'jugar_mistica', cardInstanceId, slot, eterIds }
      if (validarJugarMistica(state, accion) !== null) return null
      if (validarRequisito(state, playerId, meta.id) !== null) return null
      return accion
    }
    case 'Arcana': {
      const slot = p.campo.arcanasCombate.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'colocar_arcana', cardInstanceId, slot }
      if (validarColocarArcana(state, accion) !== null) return null
      // NOTA: validarRequisito NO se llama aquí — las condiciones de Arcana
      // se validan al ACTIVAR (validarActivarArcana), no al COLOCAR.
      return accion
    }
    default:
      return null // Éter y Vínculo no se juegan desde la mano
  }
}
