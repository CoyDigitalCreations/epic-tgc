import type { GameEvent } from './events'
import { purgarEfectosTemporales, purgarKeywordsTemporales, dispararTrigger, type TriggerEfecto } from './efectos'
import { limpiarCombate, resolverAlba } from './phases'
import { shuffleFisherYates } from './rng'
import type { Ctx, FaseNombre, GameState, PlayerId } from './types'
import { esCampeon, esMistica, esTactica, esArcana, esCombate, faccionesCompartidas, getCardMeta } from './cards'
import { esSingular, sacrificiosRequeridos, copiasEnCampo, campeonesSacrificables } from './campo'
import { aplicarPago, validarPago, validarBloqueo, etersParaPagar, type ContextoUso } from './payments'
import { SLOTS_CAMPEONES, SLOTS_MISTICAS_TACTICAS, SLOTS_ARCANAS_COMBATE, slotAZona } from './zones'
import type { CardInstance } from './types'
import { ejecutarDeclararAtaque, ejecutarDeclararBloqueo, validarDeclararAtaque, validarDeclararBloqueo, validarElegirRuptura, ejecutarElegirRuptura, tieneKeyword } from './combat'
import { liberarEterBloqueado } from './replacements'
import { validarResponderCadena, validarPasarPrioridad, ejecutarResponderCadena, ejecutarPasarPrioridad } from './chain'

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
  | { type: 'colocar_tactica'; cardInstanceId: string; slot: number }
  | { type: 'colocar_arcana'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'colocar_combate'; cardInstanceId: string; slot: number }
  | { type: 'bloquear_eter'; eterIds: string[]; campeonSlot: number }
  | { type: 'descartar_carta'; cardInstanceIds: string[] }
  | { type: 'elegir_opcion'; opcionId: string }
  | { type: 'elegir_objetivo'; objetivoId: string }
  | { type: 'usar_transmutar'; cardInstanceId: string; eterIds: string[] }
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
    case 'colocar_tactica':
      return validarColocarTactica(state, action)
    case 'colocar_arcana':
      return validarColocarArcana(state, action)
    case 'colocar_combate':
      return validarColocarCombate(state, action)
    case 'bloquear_eter':
      return validarBloquearEter(state, action)
    case 'elegir_opcion':
      return validarElegirOpcion(state, action)
    case 'elegir_objetivo':
      return validarElegirObjetivo(state, action)
    case 'usar_transmutar':
      return validarUsarTransmutar(state, action)
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

function validarColocarTactica(state: GameState, action: Extract<Action, { type: 'colocar_tactica' }>): string | null {
  if (state.fase !== 'forja') return 'colocar_tactica solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esTactica(meta)) return 'no es una Táctica'
  if (action.slot < 0 || action.slot >= SLOTS_MISTICAS_TACTICAS) return 'slot inválido'
  if (state.players[state.turno].campo.misticasTacticas[action.slot] !== null) return 'slot ocupado'
  return null // Táctica no cuesta Éter (5.4)
}

function validarColocarArcana(state: GameState, action: Extract<Action, { type: 'colocar_arcana' }>): string | null {
  if (state.fase !== 'forja') return 'colocar_arcana solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esArcana(meta)) return 'no es una Arcana'
  if (action.slot < 0 || action.slot >= SLOTS_ARCANAS_COMBATE) return 'slot inválido'
  if (state.players[state.turno].campo.arcanasCombate[action.slot] !== null) return 'slot ocupado'
  const pago = validarPago(state, state.turno, action.eterIds, meta.id)
  if (!pago.ok) return pago.error ?? 'pago inválido'
  return null
}

function validarColocarCombate(state: GameState, action: Extract<Action, { type: 'colocar_combate' }>): string | null {
  if (state.fase !== 'forja') return 'colocar_combate solo en Forja'
  const base = cartaEnMano(state, action.cardInstanceId)
  if ('error' in base) return base.error
  const meta = getCardMeta(base.cardId)
  if (!meta || !esCombate(meta)) return 'no es un Combate'
  if (action.slot < 0 || action.slot >= SLOTS_ARCANAS_COMBATE) return 'slot inválido'
  if (state.players[state.turno].campo.arcanasCombate[action.slot] !== null) return 'slot ocupado'
  return null // Combate no cuesta Éter
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
 * jugador ACTIVO en su campo (forja o choque); eterIds ⊆ p.eterPagado (1A),
 * únicos y ≤ 2. Genérico por keyword (no hardcodea FB-012).
 */
function validarUsarTransmutar(state: GameState, action: Extract<Action, { type: 'usar_transmutar' }>): string | null {
  if (state.fase !== 'forja' && state.fase !== 'choque') return 'usar_transmutar solo en Forja o Choque'
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
    case 'colocar_tactica': {
      ejecutarColocarTactica(s, action, ctx)
      return
    }
    case 'colocar_arcana': {
      ejecutarColocarArcana(s, action, ctx)
      return
    }
    case 'colocar_combate': {
      ejecutarColocarCombate(s, action, ctx)
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
      // C1 (ADR-22): al llegar el Ocaso expiran los efectos 'ocaso' del turno
      // en curso (ambos jugadores) y las keywordsTemporales otorgadas.
      purgarEfectosTemporales(s, 'ocaso')
      purgarKeywordsTemporales(s)
    }
    if (s.fase === 'forja') {
      // C2 (ADR-24): al inicio del Choque del jugador activo se disparan
      // efectos de inicio-choque (Éteres FB-002/DS-003 en Reserva).
      const p = s.players[s.turno]
      if (p.eterReserva.length > 0) {
        dispararTrigger(s, ctx, 'al-inicio-choque', s.turno, p.eterReserva)
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
    p.cementerio.push(id)
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
    p.cementerio.push(sacId)
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: sacId, zona: '2G', jugador: s.turno, bocaArriba: true })
  }
  // 3. Invocar: mano → slot, CANSADO (agotado)
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('campeones', action.slot) ?? '2B'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.campeones[action.slot] = id
  s.instances[id]!.agotado = true
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
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Mística', slot: action.slot })
}

/** Coloca la Táctica en 3A-3C SIN pagar (5.4). */
function ejecutarColocarTactica(s: GameState, action: Extract<Action, { type: 'colocar_tactica' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('misticasTacticas', action.slot) ?? '3A'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.misticasTacticas[action.slot] = id
  // §5.5 (activación diferida): recién colocada → NO responde en la cadena 9.6
  s.instances[id]!.entradaEsteTurno = true
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Táctica', slot: action.slot })
}

/** Paga y coloca la Arcana BOCA ABAJO en 3D-3F (se revela en Choque). */
function ejecutarColocarArcana(s: GameState, action: Extract<Action, { type: 'colocar_arcana' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  const contextoUso: ContextoUso = { tipo: 'habilidad', cardInstanceId: id }
  aplicarPago(s, ctx, s.turno, action.eterIds, s.instances[id]!.cardId!, contextoUso)
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('arcanasCombate', action.slot) ?? '3D'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.arcanasCombate[action.slot] = id
  // §5.5 (activación diferida): recién colocada → NO responde en la cadena 9.6
  s.instances[id]!.entradaEsteTurno = true
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Arcana', slot: action.slot })
}

/** Coloca el Combate boca arriba en 3D-3F SIN pagar. */
function ejecutarColocarCombate(s: GameState, action: Extract<Action, { type: 'colocar_combate' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = slotAZona('arcanasCombate', action.slot) ?? '3D'
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.campo.arcanasCombate[action.slot] = id
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Combate', slot: action.slot })
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
  const cementerio = s.players[inst.owner].cementerio
  if (!cementerio.includes(id)) cementerio.push(id)
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
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
      return validarJugarCampeon(state, accion) === null ? accion : null
    }
    case 'Mística': {
      const eterIds = etersParaPagar(state, playerId, meta.id)
      if (!eterIds) return null
      const slot = p.campo.misticasTacticas.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'jugar_mistica', cardInstanceId, slot, eterIds }
      return validarJugarMistica(state, accion) === null ? accion : null
    }
    case 'Táctica': {
      const slot = p.campo.misticasTacticas.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'colocar_tactica', cardInstanceId, slot }
      return validarColocarTactica(state, accion) === null ? accion : null
    }
    case 'Arcana': {
      const eterIds = etersParaPagar(state, playerId, meta.id)
      if (!eterIds) return null
      const slot = p.campo.arcanasCombate.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'colocar_arcana', cardInstanceId, slot, eterIds }
      return validarColocarArcana(state, accion) === null ? accion : null
    }
    case 'Combate': {
      const slot = p.campo.arcanasCombate.findIndex((c) => c === null)
      if (slot === -1) return null
      const accion: Action = { type: 'colocar_combate', cardInstanceId, slot }
      return validarColocarCombate(state, accion) === null ? accion : null
    }
    default:
      return null // Éter y Vínculo no se juegan desde la mano
  }
}
