/**
 * Habilidades y efectos — activar arcana, activar habilidad, transmutar, elegir.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 */
import type { GameState, Ctx } from './types'
import { getCardMeta, costeEterHabilidad, faccionesCompartidas } from './cards'
import { validarPago, aplicarPago, type ContextoUso } from './payments'
import { SLOTS_CAMPEONES } from './zones'
import { dispararTrigger, type TriggerEfecto } from './efectos'
import { registrarEfectoPendiente, hastaAlba } from './effectRegistry'
import { tieneKeyword } from './combat'
import { liberarEterBloqueado, enviarAlCementerio } from './replacements'
import { slotAZona } from './zones'
import { validarBloqueo } from './payments'
import { abrirCadenaGlobal } from './chain'
import { validarRequisito } from './effects-guards'
import type { Action } from './core'

/* ─────────────────────── Validadores ─────────────────────── */

/** Activar_arcana: revela la Arcana boca arriba y paga su coste de éter. */
export function validarActivarArcana(state: GameState, action: Extract<Action, { type: 'activar_arcana' }>): string | null {
  if (state.fase !== 'forja') return 'activar_arcana solo en Forja'
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
 * Validar activar_habilidad — Campeón propio con efectoDisparo
 * en campo del jugador activo. Dos patrones de coste:
 *  - "Bloqueado": eterIds de la Reserva que comparten facción → bloqueados en el Campeón.
 *  - "Agota": eterIds de la Reserva → pagados (1A) + campeón agotado + 1/turno.
 */
export function validarActivarHabilidad(state: GameState, action: Extract<Action, { type: 'activar_habilidad' }>): string | null {
  const p = state.players[state.turno]
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'la carta no existe'
  if (!p.campo.campeones.includes(action.cardInstanceId)) return 'la carta no está en tu campo'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  const tieneContinuo = 'efectoContinuo' in meta && !!(meta as any).efectoContinuo
  const tieneDisparo = 'efectoDisparo' in meta && !!(meta as any).efectoDisparo
  if (!tieneContinuo && !tieneDisparo) return 'esta carta no tiene efecto activo'

  const esContinuo = tieneContinuo
  // Patrón "Bloqueado": solo si NO es agota (Vorlag tiene "bloqueado" en texto pero es Agota)
  const esBloqueado = esContinuo || (!('disparoAgota' in meta && (meta as any).disparoAgota) && ((meta as any).efectoDisparo?.includes('bloqueado') ?? false))

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

/** C2: validar elegir_opcion — solo en forja del jugador con opción pendiente. */
export function validarElegirOpcion(state: GameState, action: Extract<Action, { type: 'elegir_opcion' }>): string | null {
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
export function validarElegirObjetivo(state: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>): string | null {
  const pendiente = state.objetivosPendientes?.[0]
  if (!pendiente) return 'no hay objetivo pendiente'
  if (pendiente.jugador !== state.turno) return 'no es tu turno para elegir objetivo'
  if (!pendiente.opciones.includes(action.objetivoId)) return 'el objetivo no está entre las opciones válidas'
  return null
}

/* ──────────────────── Ejecución ──────────────────── */

/** Revela la Arcana (boca arriba) y paga su coste de éter. */
export function ejecutarActivarArcana(s: GameState, action: Extract<Action, { type: 'activar_arcana' }>, ctx: Ctx): void {
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

/**
 * Ejecutar activar_habilidad — dos patrones:
 *  - "Bloqueado" (Cassandra/Korr): eterIds de Reserva → Campeón.eterBloqueado.
 *    El aura se aplica dinámicamente via aurasDe (detección automática).
 *  - "Agota" (Seraphina/Nymeria/Varek/Vorlag): eterIds → 1A + agota + 1/turno
 *    + disparar trigger 'al-activar-habilidad' (handler aplica efecto).
 */
export function ejecutarActivarHabilidad(s: GameState, action: Extract<Action, { type: 'activar_habilidad' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const inst = s.instances[action.cardInstanceId]!
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return

  // Continuo (efectoContinuo): bloquea éter, agota al activar
  const esContinuo = 'efectoContinuo' in meta && !!(meta as any).efectoContinuo
  // Disparo con éter bloqueado (legacy): no agota
  const esBloqueadoLegacy = !esContinuo && ('efectoDisparo' in meta && ((meta as any).efectoDisparo?.includes('bloqueado') ?? false))

  if (esContinuo || esBloqueadoLegacy) {
    // Patrón "Bloqueado": mueve éteres de Reserva → Campeón.eterBloqueado
    for (const eterId of action.eterIds) {
      p.eterReserva.splice(p.eterReserva.indexOf(eterId), 1)
    }
    inst.eterBloqueado = [...(inst.eterBloqueado ?? []), ...action.eterIds]
    // Si el texto indica "Alba" → registrar efecto pendiente para liberar en Alba del dueño
    const textoEfecto = esContinuo ? (meta as any).efectoContinuo : (meta as any).efectoDisparo
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

/** C2: ejecutar elegir_opcion — greedy determinista (anti-cheat 6.2). */
export function ejecutarElegirOpcion(s: GameState, action: Extract<Action, { type: 'elegir_opcion' }>, ctx: Ctx): void {
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
export function ejecutarElegirObjetivo(s: GameState, action: Extract<Action, { type: 'elegir_objetivo' }>, ctx: Ctx): void {
  const pendiente = s.objetivosPendientes?.[0]
  if (!pendiente) return // defensivo: ya validado en validarAccion
  s.objetivosPendientes = s.objetivosPendientes!.slice(1)
  dispararTrigger(s, ctx, pendiente.trigger as TriggerEfecto, pendiente.jugador, [pendiente.instId], {
    contextoUso: 'objetivo-elegido',
    objetivoId: action.objetivoId,
  })
}
