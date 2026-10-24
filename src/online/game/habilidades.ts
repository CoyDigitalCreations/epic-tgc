/**
 * Habilidades y efectos — activar arcana, activar habilidad, transmutar, elegir.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 */
import type { GameState, Ctx, CardInstance, PlayerId } from './types'
import { getCardMeta, efectoActivableDe, esCostoBloqueo, esArtefactoEquipable, esPermanenteEnMesa, campeonElegibleBloqueoEter, faccionesCompartidas } from './cards'
import type { CondicionEfecto, AnyCard, EfectoData } from '../../shared/types'
import { validarPago, aplicarPago, type ContextoUso } from './payments'
import { etiquetarEter } from './eter'
import { dispararTrigger, condicionCumple, pasivosBloqueo1A, type TriggerEfecto, type PayloadEfecto } from './efectos'
import { registrarEfectoPendiente, hastaAlba } from './effectRegistry'
import { interpretEffect, ejecutarTramo } from './effectInterpreter'
import { tieneKeyword } from './combat'
import { reglaBool } from './reglas'
import { liberarEterBloqueado, enviarAlCementerio } from './replacements'
import { slotAZona } from './zones'
import { validarBloqueo } from './payments'
import { abrirCadenaGlobal, cadenaActiva } from './chain'
import type { Action } from './core'

/* ─────────────────────── Validadores ─────────────────────── */

/** Activar_arcana: revela la Arcana boca arriba y paga su coste de éter. */
export function validarActivarArcana(state: GameState, action: Extract<Action, { type: 'activar_arcana' }>): string | null {
  // §8.3a + decisión A8 (2026-10-22): cualquier fase EXCEPTO Alba (las
  // Arcanas son "trampas" — se activan cuando su condición se cumple, no
  // solo en Forja; §8.1 también las ubica en Choque).
  if (state.fase !== 'forja' && state.fase !== 'choque' && state.fase !== 'ocaso') {
    return 'activar_arcana solo en Forja/Choque/Ocaso (§8.3a: nunca en Alba)'
  }
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'instancia no encontrada'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  const p = state.players[state.turno]
  // La Arcana debe estar en el campo (3D-3F) boca abajo
  const idx = p.campo.arcanasCombate.indexOf(action.cardInstanceId)
  if (idx === -1) return 'la Arcana no está en el campo'
  if (inst.bocaArriba) return 'la Arcana ya está boca arriba'
  // §5.4: NO se pueden activar el turno en que fueron colocadas
  if (inst.entradaEsteTurno) return 'la Arcana no se puede activar el turno en que fue colocada (§5.4)'
  // §5.4: la condicion JSON de la Arcana debe cumplirse para activar (Fase 2a — data-driven)
  const condicion = 'condicion' in meta ? (meta as { condicion?: CondicionEfecto }).condicion : undefined
  const condError = condicionCumple(state, condicion, state.turno)
  if (condError) return condError
  // Slot coincidence check
  if (action.slot !== idx) return 'el slot no coincide con la posición de la Arcana'
  // Pago de éter
  const pago = validarPago(state, state.turno, action.eterIds, meta.id)
  if (!pago.ok) return pago.error ?? 'pago inválido'
  // ARTEFACTO equipable: requiere al menos un Campeón en el campo propio
  if (esArtefactoEquipable(meta)) {
    if (!p.campo.campeones.some((id) => id !== null)) {
      return 'no puedes activar un ARTEFACTO sin un Campeón en tu campo'
    }
  }
  return null
}

/**
 * Validar activar_habilidad — Campeón propio con efecto activo (disparo o continuo).
 * Lee de efectos[] — el sistema unificado.
 */
export function validarActivarHabilidad(state: GameState, action: Extract<Action, { type: 'activar_habilidad' }>): string | null {
  // NOTE: Alba is auto-resolved (ADR-3) and never an observable state —
  // no need to guard against it. Fase values: forja, choque, ocaso, etc.

  const p = state.players[state.turno]
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'la carta no existe'
  if (!p.campo.campeones.includes(action.cardInstanceId)) return 'la carta no está en tu campo'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'

  // ROUTING POR EFECTO (§7.7): el efecto que activar_habilidad ejecuta lo
  // decide SU costo — mismo selector que validActions y el ejecutor.
  const efectoSel = efectoActivableDe(meta, !!action.objetivoId)
  if (!efectoSel) {
    // Continuo con costo-bloqueo (Aurora steal, FB-015): activación exclusiva
    // vía bloquear_eter → aura/umbral. Nunca por pago.
    return 'esta carta se activa bloqueando Éter (usa la acción bloquear_eter)'
  }

  const esBloqueado = esCostoBloqueo(efectoSel.costo)

  if (esBloqueado) {
    // Patrón "Bloqueado": eterIds de la Reserva → Campeón.eterBloqueado
    if (inst.opcionUsadaEsteTurno) return 'ya usaste esta habilidad este turno'
    const costoEsperado = efectoSel.costo?.cantidad ?? 0
    if (costoEsperado > 0 && action.eterIds.length !== costoEsperado) {
      return `${meta.name} requiere exactamente ${costoEsperado} Éter(es), indicaste ${action.eterIds.length}`
    }
    if (action.eterIds.length === 0) return 'no indicaste Éteres para bloquear'
    if (new Set(action.eterIds).size !== action.eterIds.length) return 'éteres repetidos'
    // Fase 2 (c): la zona de ORIGEN del costo define dónde deben estar los Éteres
    const zonaOrigen = efectoSel.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
    for (const eterId of action.eterIds) {
      if (!zonaOrigen.includes(eterId)) {
        return efectoSel.costo?.origen === 'pagado'
          ? `el Éter ${eterId} no está en tu Éter Pagado (1A)`
          : `el Éter ${eterId} no está en tu Reserva`
      }
      const eterInst = state.instances[eterId]
      const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
      if (!eterMeta) return `Éter desconocido: ${eterId}`
    }
  } else {
    // Patrón "Paga y Agota"/Continuo pago: eterIds de la Reserva → pagados (1A).
    // Solo con el Campeón enderezado (§5.2). El Disparo no tiene límite por turno: lo da el
    // agotamiento (§8.3a); el Continuo pagado conserva su 1/turno.
    if (inst.agotado) return 'la carta ya está agotada'
    if (efectoSel.tipo !== 'disparo' && inst.opcionUsadaEsteTurno) return 'ya usaste esta habilidad este turno'
    const costoEsperado = efectoSel.costo?.cantidad ?? 0
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

/**
 * C3d (D4): validar usar_transmutar — Campeón con keyword `Transmutar` del
 * jugador ACTIVO en su campo; eterIds ⊆ p.eterPagado (1A),
 * únicos y ≤ 2. Genérico por keyword (no hardcodea FB-012).
 */
export function validarUsarTransmutar(state: GameState, action: Extract<Action, { type: 'usar_transmutar' }>): string | null {
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

/** Pareja Campeón + Éter de la Reserva sobre la que el Pasivo 1A puede bloquear. */
export interface ParejaBloqueo {
  campeonId: string
  eterId: string
}

/**
 * Todas las parejas legales para el bloqueo de un Pasivo 1A (FB-005/DS-006): Campeón propio con
 * efecto continuo que usa Éter bloqueado + Éter de la Reserva de facción compartida, y que
 * `validarBloqueo` acepta. Orden determinista (campo → reserva): la primera es la del greedy.
 * Fuente ÚNICA para el motor (validar/ejecutar) y la UI (modal de elección).
 */
export function parejasBloqueoOpcion(s: GameState, jugador: PlayerId): ParejaBloqueo[] {
  const p = s.players[jugador]
  const parejas: ParejaBloqueo[] = []
  for (const campeonId of p.campo.campeones) {
    if (!campeonId) continue
    const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId]!.cardId!) : null
    if (!metaC || !campeonElegibleBloqueoEter(metaC)) continue
    for (const eterId of p.eterReserva) {
      const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId]!.cardId!) : null
      if (!metaE || !faccionesCompartidas(metaE.facciones, metaC.facciones)) continue
      if (validarBloqueo(s, jugador, [eterId], campeonId) !== null) continue
      parejas.push({ campeonId, eterId })
    }
  }
  return parejas
}

/**
 * C2: validar elegir_opcion. Dos orígenes:
 * - opción PENDIENTE (p.ej. un Vínculo con "al inicio de tu Alba"): solo en Forja;
 * - Pasivo 1A VIVO (carta de Éter en 1A, FB-005/DS-006): habilidad del turno, cualquier fase menos
 *   Alba (§8.3a); en Choque, no durante un combate.
 */
export function validarElegirOpcion(state: GameState, action: Extract<Action, { type: 'elegir_opcion' }>): string | null {
  const pendiente = state.opcionesPendientes?.find(
    (o) => o.jugador === state.turno && o.eterId === action.opcionId
  )
  if (pendiente) {
    if (state.fase !== 'forja') return 'elegir_opcion solo en Forja'
  } else if (pasivosBloqueo1A(state, state.turno).includes(action.opcionId)) {
    if (state.fase !== 'forja' && state.fase !== 'choque' && state.fase !== 'ocaso') {
      return 'el Pasivo 1A solo en Forja/Choque/Ocaso (§8.3a: nunca en Alba)'
    }
    if (state.fase === 'choque' && state.combate) return 'el Pasivo 1A no se usa durante un combate'
  } else {
    return 'no hay opción pendiente para este jugador'
  }
  // Pareja elegida: ambos ids o ninguno, y debe ser una de las legales (anti-cheat 6.2)
  if ((action.campeonId === undefined) !== (action.eterId === undefined)) {
    return 'elegir_opcion: indica Campeón y Éter juntos'
  }
  if (action.campeonId !== undefined && action.eterId !== undefined) {
    const { campeonId, eterId } = action
    const legal = parejasBloqueoOpcion(state, state.turno).some((q) => q.campeonId === campeonId && q.eterId === eterId)
    if (!legal) return 'la pareja Campeón/Éter no es válida para esta opción'
  }
  return null
}

/**
 * C3 (D1): validar elegir_objetivo — el FRENTE de la cola (FIFO) debe pertenecer
 * al jugador activo y el objetivo elegido estar entre las opciones YA filtradas
 * (el motor nunca expone objetivos inválidos). Aplica en forja y choque:
 * al-invocar y al-atacar arman pendientes (a diferencia de elegir_opcion, C2).
 */
export function validarElegirObjetivo(state: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>): string | null {
  const pendiente = state.objetivosPendientes?.[0]
  if (!pendiente) return 'no hay objetivo pendiente'
  if (pendiente.jugador !== state.turno) return 'no es tu turno para elegir objetivo'
  if (!pendiente.opciones.includes(action.objetivoId)) return 'el objetivo no está entre las opciones válidas'
  return null
}

/* ──────────────────── Ejecución ──────────────────── */

/** Revela la Arcana (boca arriba), paga su coste y resuelve la recompensa (Fase 2a). */
export function ejecutarActivarArcana(s: GameState, action: Extract<Action, { type: 'activar_arcana' }>, ctx: Ctx): void {
  const id = action.cardInstanceId
  const inst = s.instances[id]
  if (!inst) return
  const contextoUso: ContextoUso = { tipo: 'habilidad', cardInstanceId: id }
  aplicarPago(s, ctx, s.turno, action.eterIds, inst.cardId!, contextoUso)
  inst.bocaArriba = true
  ctx.emit({ type: 'carta_activada', cardInstanceId: id, jugador: s.turno, slot: action.slot })
  const meta = getCardMeta(inst.cardId!)
  // ARTEFACTO equipable: crear pendiente — efectos diferidos hasta equipar
  if (meta && esArtefactoEquipable(meta)) {
    s.equiparPendiente = { artefactoId: id, jugador: s.turno, contexto: 'activar_arcana' }
    return
  }
  // Fase 2a — modelo de activación: la recompensa (efectos tipo hechizo) se
  // resuelve al activar. El JSON de Card-Maker emite recompensas sin trigger.
  if (meta && 'efectos' in meta && meta.efectos) {
    for (const efecto of meta.efectos) {
      if (efecto.tipo === 'hechizo' && !efecto.trigger && efecto.efecto) {
        interpretEffect(s, ctx, inst, efecto, { jugador: s.turno, fromTrigger: true })
      }
    }
  }
  // Abrir cadena global: el rival podría responder con cartas Disparo
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: meta?.name ?? id })
  // §5.4 (fix A4): recompensa de UN SOLO USO → la Arcana va al Cementerio
  // y libera su slot. Efecto CONTINUO → permanece boca arriba. Si la Arcana
  // misma quedó en la PILA (se activó respondiendo en cadena), la consume el
  // resolutor de cadena — aquí no se toca.
  const enPila = (cadenaActiva(s)?.pila ?? []).includes(id)
  if (!enPila && meta && !esPermanenteEnMesa(meta)) {
    const slotIdx = s.players[s.turno].campo.arcanasCombate.indexOf(id)
    if (slotIdx !== -1) {
      const zonaSlot = slotAZona('arcanasCombate', slotIdx) ?? '3D'
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: zonaSlot, jugador: s.turno })
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: s.turno, bocaArriba: true })
    }
  }
}

/**
 * Ejecutar activar_habilidad — data-driven desde efectos[] del JSON.
 *
 * Patrones según el JSON:
 *  - "Bloqueado" (costo.tipo = 'eter_bloqueado' o tipo = 'continuo'):
 *    eterIds de Reserva → Campeón.eterBloqueado. El aura se aplica vía modificadoresJSONDe.
 *  - "Disparo/Agota" (cualquier otro costo):
 *    eterIds → 1A (pagado) + 1/turno. El efecto se ejecuta directo desde JSON.
 *
 * El efecto se resuelve leyendo efectos[] de la carta — sin hardcodear nada.
 */
export function ejecutarActivarHabilidad(s: GameState, action: Extract<Action, { type: 'activar_habilidad' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const inst = s.instances[action.cardInstanceId]!
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return

  // Mismo selector que el validador y validActions — el costo DEL EFECTO
  // elegido decide el patrón (defensa en profundidad: sin selector = no-op).
  const efectoSel = efectoActivableDe(meta, !!action.objetivoId)
  if (!efectoSel) return

  if (esCostoBloqueo(efectoSel.costo)) {
    // Patrón "Bloqueado": mueve éteres de la zona de ORIGEN (Fase 2 (c):
    // 'reserva' 2A default, 'pagado' 1A) → Campeón.eterBloqueado
    const zonaOrigen = efectoSel.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
    for (const eterId of action.eterIds) {
      const idx = zonaOrigen.indexOf(eterId)
      if (idx !== -1) zonaOrigen.splice(idx, 1)
    }
    inst.eterBloqueado = [...(inst.eterBloqueado ?? []), ...action.eterIds]
    // Fase 2: filiación — el efecto activado (índice en efectos[]) es la
    // fuente que bloquea; s.turno lo pagó.
    const idxSel = meta.efectos?.indexOf(efectoSel) ?? -1
    etiquetarEter(s, action.eterIds, action.cardInstanceId, idxSel, s.turno)
    // Check if effect has reagrupar (Alba) — register pending effect
    const efectoConReagrupar = meta.efectos && 'efectos' in meta
      ? meta.efectos.find((e) => e.reagrupar && esCostoBloqueo(e.costo))
      : undefined
    if (efectoConReagrupar?.reagrupar) {
      registrarEfectoPendiente(s, {
        fuente: action.cardInstanceId,
        owner: s.turno,
        triggerFase: efectoConReagrupar.reagrupar.fase,
        triggerOwner: efectoConReagrupar.reagrupar.turno === 'propio' ? 'dueño' : 'rival',
        accion: { tipo: 'liberar-eter', eterIds: [...action.eterIds], destino: 'reserva' },
        duracion: hastaAlba(),
      })
    }
    ctx.emit({ type: 'eter_bloqueado', jugador: s.turno, eterIds: action.eterIds, campeonId: action.cardInstanceId })
    inst.opcionUsadaEsteTurno = true
    if (efectoSel.tipo === 'continuo') {
      inst.agotado = true
    }
    // Ejecutar el efecto elegido directo desde JSON (targeting si es necesario)
    const payloadBloqueo: PayloadEfecto = {
      jugador: s.turno,
      contextoUso: action.objetivoId ? 'objetivo-elegido' : undefined,
      objetivoId: action.objetivoId,
    }
    // Ventana de negación (obs 1874): la activación está DECLARADA (el pago
    // del bloqueo ya se aplicó y se MANTIENE). Si el rival puede responder,
    // la resolución se DIFIERE a la cadena — al cerrar se ejecuta salvo que
    // una negación (tipoNegacion 'activacion') la haya cancelado.
    if (diferirActivacion(s, inst, meta, efectoSel, action.objetivoId)) return
    interpretEffect(s, ctx, inst, efectoSel, payloadBloqueo)
  } else {
    // Patrón "Agota"/Continuo pago: éteres → 1A (pagado) + 1/turno
    for (const eterId of action.eterIds) {
      const idx = p.eterReserva.indexOf(eterId)
      if (idx !== -1) p.eterReserva.splice(idx, 1)
      p.eterPagado.push(eterId)
    }
    if (action.eterIds.length > 0) {
      ctx.emit({ type: 'eter_pagado', jugador: s.turno, eterIds: action.eterIds, costo: action.eterIds.length, aportado: action.eterIds.length })
    }
    if (efectoSel.tipo !== 'disparo') inst.opcionUsadaEsteTurno = true
    // Paga y Agota (§5.2, §8.3a): el Disparo con Éter pagado agota al Campeón, salvo que la regla
    // `disparoAgota` esté prohibida (Tirador, §10). El agotamiento es parte del coste: se paga ya.
    if (efectoSel.tipo === 'disparo' && reglaBool(s, 'disparoAgota', { instId: action.cardInstanceId })) {
      inst.agotado = true
    }
    // Ejecutar el efecto elegido directo desde JSON (targeting si es necesario)
    const payload: PayloadEfecto = {
      jugador: s.turno,
      contextoUso: action.objetivoId ? 'objetivo-elegido' : undefined,
      objetivoId: action.objetivoId,
    }
    // Ventana de negación (obs 1874): pago YA hecho (queda) — si hay
    // respuesta, el efecto se difiere a la cadena (fizzled si lo niegan).
    if (diferirActivacion(s, inst, meta, efectoSel, action.objetivoId)) return
    interpretEffect(s, ctx, inst, efectoSel, payload)
  }
}

/**
 * Ventana de negación (obs 1874): abre la cadena GLOBAL con gate de mano
 * Presteza (incluirMano) y registra la activación DIFERIDA en la cadena.
 * true = quedó diferida (NO resolver aún); false = sin respondibles →
 * resolver directo (comportamiento previo intacto).
 */
function diferirActivacion(
  s: GameState,
  inst: CardInstance,
  meta: AnyCard,
  efectoSel: EfectoData,
  objetivoId?: string,
): boolean {
  const abierto = abrirCadenaGlobal(
    s,
    s.turno,
    { cardInstanceId: inst.cardInstanceId, descripcion: meta.name ?? inst.cardInstanceId },
    true, // incluirMano: Místicas Presteza del rival en mano pueden responder
  )
  if (!abierto || !s.cadena) return false
  const efectoIdx = 'efectos' in meta && meta.efectos ? meta.efectos.indexOf(efectoSel) : -1
  if (efectoIdx === -1) {
    // defensive: sin índice no hay resolución diferida posible → resolver ya
    s.cadena = undefined
    return false
  }
  s.cadena.activacionPendiente = {
    jugador: s.turno,
    cardInstanceId: inst.cardInstanceId,
    efectoIdx,
    objetivoId,
  }
  return true
}

/**
 * C3d (D4): ejecutar usar_transmutar — 1) eterIds (1A) → 2A Reserva del
 * activo (eter_reagrupado); 2) auto-sacrificio: la carta sale del campo →
 * 2G del DUEÑO (patrón sacrificio actions.ts) + libera su Éter bloqueado a
 * 1A. NO pasa por `destruirCarta` (Inmortal/Indestructible no lo previenen:
 * es coste, no destrucción).
 */
export function ejecutarUsarTransmutar(s: GameState, action: Extract<Action, { type: 'usar_transmutar' }>, ctx: Ctx): void {
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

/** C2: ejecutar elegir_opcion — la pareja del jugador (ya validada) o, sin ella, la primera legal (greedy determinista). */
export function ejecutarElegirOpcion(s: GameState, action: Extract<Action, { type: 'elegir_opcion' }>, ctx: Ctx): void {
  const j = s.turno
  const p = s.players[j]
  const pendiente = s.opcionesPendientes?.find((o) => o.jugador === j && o.eterId === action.opcionId)
  const pasivoVivo = !pendiente && pasivosBloqueo1A(s, j).includes(action.opcionId)
  if (!pendiente && !pasivoVivo) return // ya validado

  // Sin pareja elegida: greedy determinista = PRIMERA pareja legal. Solo califican campeones
  // con efecto continuo que usa eter_bloqueado/bloqueo_fijo (ej: Aurora, Elena, Cassandra).
  // Campeones con solo pasivo/disparo NO califican.
  const pareja = action.campeonId !== undefined && action.eterId !== undefined
    ? { campeonId: action.campeonId, eterId: action.eterId }
    : parejasBloqueoOpcion(s, j)[0]
  if (!pareja) {
    // No hay pareja válida (no debería pasar si validación correcta)
    if (pendiente) s.opcionesPendientes = s.opcionesPendientes!.filter((o) => !(o.jugador === j && o.eterId === action.opcionId))
    return
  }
  const elegido = { targetInstanceId: pareja.campeonId, eterId: pareja.eterId }
  // Ejecutar bloqueo (reutiliza lógica de ejecutarBloquearEter)
  const instCampeon = s.instances[elegido.targetInstanceId]
  instCampeon.eterBloqueado = [...(instCampeon.eterBloqueado ?? []), elegido.eterId]
  const eterIdx = p.eterReserva.indexOf(elegido.eterId)
  if (eterIdx !== -1) p.eterReserva.splice(eterIdx, 1)
  // Fase 2: filiación — el continuo costo-bloqueo del campeón es la fuente
  // (mismo predicado que campeonElegibleBloqueoEter) y j lo pagó.
  const metaElegido = s.instances[elegido.targetInstanceId]?.cardId
    ? getCardMeta(s.instances[elegido.targetInstanceId]!.cardId!)
    : null
  const idxFuente = metaElegido && 'efectos' in metaElegido && metaElegido.efectos
    ? metaElegido.efectos.findIndex((e) => e.tipo === 'continuo' && esCostoBloqueo(e.costo))
    : -1
  etiquetarEter(s, [elegido.eterId], elegido.targetInstanceId, idxFuente, j)
  ctx.emit({ type: 'eter_bloqueado', jugador: j, eterIds: [elegido.eterId], campeonId: elegido.targetInstanceId })

  // Marcar opción usada en el Éter Pasivo
  const eterPasivo = s.instances[action.opcionId]
  if (eterPasivo) eterPasivo.opcionUsadaEsteTurno = true

  // Limpiar pendiente
  if (pendiente) s.opcionesPendientes = s.opcionesPendientes!.filter((o) => !(o.jugador === j && o.eterId === action.opcionId))
}

/**
 * C3 (D1): resolución por re-dispatch (patrón C2 contextoUso) — saca el FRENTE
 * de la cola FIFO y re-dispara el trigger que originó el pendiente con
 * contextoUso 'objetivo-elegido' + objetivoId. El handler registrado distingue:
 * si ya viene con ese contextoUso, APLICA el efecto sobre objetivoId; si no,
 * ARMA el pendiente. Así el estado es serializable (sin callbacks).
 */
export function ejecutarElegirObjetivo(s: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>, ctx: Ctx): void {
  const pendiente = s.objetivosPendientes?.[0]
  if (!pendiente) return // defensivo: ya validado en validarAccion
  s.objetivosPendientes = s.objetivosPendientes!.slice(1)

  // Capa 3b: pendiente de un TRAMO escalonado — el trigger re-dispatch no
  // aplica (el tramo vive dentro de efecto.tramos, no como efecto.raíz).
  // Se resuelve aquí directamente con el objetivo elegido.
  if (pendiente.tramoUmbral !== undefined) {
    ejecutarTramo(s, ctx, pendiente.instId, pendiente.tramoUmbral, action.objetivoId)
    return
  }

  dispararTrigger(s, ctx, pendiente.trigger as TriggerEfecto, pendiente.jugador, [pendiente.instId], {
    contextoUso: 'objetivo-elegido',
    objetivoId: action.objetivoId,
  })
}
