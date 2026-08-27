/**
 * Movimientos de cartas — invocar, colocar, equipar.
 * Extraído de actions.ts para separación de dominios (change: refactor-engine).
 */
import type { GameState, PlayerId, CardInstance, Zona } from './types'
import { esCampeon, esMistica, esArcana, esVinculo, faccionesCompartidas, getCardMeta } from './cards'
import { esSingular, sacrificiosRequeridos, copiasEnCampo, campeonesSacrificables } from './campo'
import { aplicarPago, validarPago, etersParaPagar, type ContextoUso } from './payments'
import { SLOTS_CAMPEONES, SLOTS_MISTICAS_TACTICAS, SLOTS_ARCANAS_COMBATE, slotAZona } from './zones'
import { dispararTrigger } from './efectos'
import { liberarEterBloqueado, enviarAlCementerio } from './replacements'
import { abrirCadenaGlobal } from './chain'
import { validarRequisito } from './effects-guards'
import type { Action } from './core'
import type { Ctx } from './types'

/* ─────────────────────── Helpers compartidos ─────────────────────── */

/** Base común: fase forja + carta propia en mano del jugador activo. */
export function cartaEnMano(state: GameState, cardInstanceId: string): { error: string } | { inst: CardInstance; cardId: string } {
  const p = state.players[state.turno]
  if (!p.mano.includes(cardInstanceId)) return { error: 'la carta no está en tu mano' }
  const inst = state.instances[cardInstanceId]
  const cardId = inst?.cardId ?? null
  if (!inst || cardId === null) return { error: 'carta desconocida' }
  return { inst, cardId }
}

/* ─────────────────────── Validadores ─────────────────────── */

export function validarJugarCampeon(state: GameState, action: Extract<Action, { type: 'jugar_campeon' }>): string | null {
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

export function validarJugarMistica(state: GameState, action: Extract<Action, { type: 'jugar_mistica' }>): string | null {
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

export function validarColocarArcana(state: GameState, action: Extract<Action, { type: 'colocar_arcana' }>): string | null {
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

/** Colocar Vínculo: mano → slot 4A-4F boca abajo (§5.5). */
export function validarColocarVinculo(state: GameState, action: Extract<Action, { type: 'colocar_vinculo' }>): string | null {
  if (state.fase !== 'pre_partida') return 'colocar_vinculo solo en pre_partida'
  const inst = state.instances[action.cardInstanceId]
  if (!inst) return 'instancia no encontrada'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta || !esVinculo(meta)) return 'no es un Vínculo'
  const p = state.players[state.turno]
  if (!p.mano.includes(action.cardInstanceId)) return 'el Vínculo no está en tu mano'
  if (action.slot < 0 || action.slot > 5) return 'slot inválido (0-5)'
  if (p.vinculos[action.slot] !== null) return 'el slot de Vínculo ya está ocupado'
  return null
}

/**
 * Validar equipar_artefacto: Mística/Arcana con keyword ARTEFACTO en campo,
 * se equipa a un Campeón propio en el campo.
 */
export function validarEquiparArtefacto(state: GameState, action: Extract<Action, { type: 'equipar_artefacto' }>): string | null {
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

/* ──────────────────── Ejecución ──────────────────── */

/** Invoca: pago → sacrificios (slot → 2G) → mano → 2B-2F boca arriba CANSADO. */
export function ejecutarJugarCampeon(s: GameState, action: Extract<Action, { type: 'jugar_campeon' }>, ctx: Ctx): void {
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
  // §9.6: abrir cadena global — el rival puede responder con efectos
  const metaC = getCardMeta(s.instances[id]!.cardId!)
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: metaC?.name ?? id })
}

/** Paga y coloca la Mística boca arriba en 3A-3C. */
export function ejecutarJugarMistica(s: GameState, action: Extract<Action, { type: 'jugar_mistica' }>, ctx: Ctx): void {
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
  // §9.6: abrir cadena global — el rival puede responder con efectos
  const metaM = getCardMeta(s.instances[id]!.cardId!)
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: metaM?.name ?? id })
}

/** Coloca la Arcana BOCA ABAJO en 3D-3F SIN pagar (pago al activar). */
export function ejecutarColocarArcana(s: GameState, action: Extract<Action, { type: 'colocar_arcana' }>, ctx: Ctx): void {
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

/** Coloca el Vínculo BOCA ABAJO en 4A-4F (§5.5). */
export function ejecutarColocarVinculo(s: GameState, action: Extract<Action, { type: 'colocar_vinculo' }>, ctx: Ctx): void {
  const p = s.players[s.turno]
  const id = action.cardInstanceId
  p.mano.splice(p.mano.indexOf(id), 1)
  const zona = `4${String.fromCharCode(65 + action.slot)}` as Zona
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: 'mano', jugador: s.turno })
  p.vinculos[action.slot] = id
  s.instances[id]!.bocaArriba = false
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false })
  ctx.emit({ type: 'carta_invocada', cardInstanceId: id, tipo: 'Vínculo', slot: action.slot })
}

/** Equipa un ARTEFACTO a un Campeón: la carta queda en su slot, efecto aplica al campeón. */
export function ejecutarEquiparArtefacto(s: GameState, action: Extract<Action, { type: 'equipar_artefacto' }>, ctx: Ctx): void {
  const inst = s.instances[action.cardInstanceId]
  if (!inst) return
  inst.equipadoA = action.campeonInstanceId
  ctx.emit({ type: 'carta_activada', cardInstanceId: action.cardInstanceId, jugador: s.turno, slot: -1 })
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
      // Soberano: baja en el slot del sacrificado
      // Emperador: baja en el slot del primer sacrificado (el usuario elegirá)
      // Sin sacrificio: busca slot libre
      let slot: number
      if (requeridos > 0 && sacrificios.length > 0) {
        slot = p.campo.campeones.indexOf(sacrificios[0])
      } else {
        slot = p.campo.campeones.findIndex((c) => c === null)
        if (slot === -1) return null
      }
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
