import { esEter, getCardMeta, cartaNecesitaEterBloqueado, efectoBloqueoAccion } from './cards'
import { etiquetarEter, eterDeEfecto, esEterAjeno, eteresPropios, marcarContinuoActivado } from './eter'
import type { AnyCard } from '../../shared/types'
import { dispararTrigger } from './efectos'
import { iniciarElegirEsencia } from './esencia'
import { efectosNegados, reglaNumero } from './reglas'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Economía de Éter (manual §7.3):
 * - Aporte: cada Éter vale 1. El Éter NO tiene facción: todas las facciones lo usan por igual.
 * - NO hay sobrepago: el jugador debe seleccionar exactamente el coste.
 * - Bloquear (Fase 3a): 2A → targetInstanceId.eterBloqueado.
 *   Targets: Campeones (2B-2F) y — Fase 3a Phase B — Artefactos (3A-3F)
 *   con costo-bloqueado en efectos[]. Límite por carta según efecto.
 * - Reagrupar: en tu Alba, 1A → 2A; el Éter bloqueado permanece en la carta.
 *
 * Las funciones mutan el estado YA clonado (ADR-5) y devuelven `s` para encadenar;
 * `validarPago` es read-only y no muta ni consume RNG.
 */

/** Contexto de uso del Éter pagado (C2): gatillos dependen de cómo se pagó. */
export interface ContextoUso {
  tipo: 'invocar' | 'jugar' | 'habilidad' | 'combate'
  /** Instancia del Campeón/Mística/Arcana que se está invocando/jugando. */
  cardInstanceId?: string
}

export interface ResultadoPago {
  ok: boolean
  error?: string
  /** Σ aportes (cada Éter aporta 1). */
  aportado?: number
}

/** Resultado de validación de pago (sin sobrepago). */
export interface ResultadoPago {
  ok: boolean
  error?: string
  /** Σ aportes (cada Éter aporta 1). */
  aportado?: number
}

/** Aporte de un Éter: siempre 1 (el Éter no tiene facción). */
export function aporteDe(eterCardId: string, _objetivoCardId: string): number {
  const eter = getCardMeta(eterCardId)
  if (!eter) return 0
  return 1
}

/**
 * Coste en Éter de INVOCAR a un Campeón por `jugador`: el impreso más lo que le sumen las reglas (`costeCampeonesExtra`,
 * p. ej. el tributo de Aurora a los Campeones del rival). Fuente ÚNICA: la validación, el pago, las acciones que genera el
 * motor y la UI (Tablero) leen el coste por aquí. Una carta que no es Campeón cuesta lo impreso.
 */
export function costeDeCampeon(state: GameState, jugador: PlayerId, cardId: string): number {
  const meta = getCardMeta(cardId)
  if (!meta) return 0
  if (meta.type !== 'Campeón') return meta.stats.cost
  return meta.stats.cost + reglaNumero(state, 'costeCampeonesExtra', { jugador })
}

/** Coste a pagar: el de invocar (con recargos de Campeón) o el impreso (Místicas, Arcanas, habilidades). */
function costeAPagar(state: GameState, jugador: PlayerId, cardId: string, invocacion: boolean): number {
  return invocacion ? costeDeCampeon(state, jugador, cardId) : (getCardMeta(cardId)?.stats.cost ?? 0)
}

/** Validación read-only: exactamente el coste, sin sobrepago. `invocacion`: se paga la invocación de un Campeón (coste con recargos). */
export function validarPago(
  state: GameState,
  jugador: PlayerId,
  eterIds: string[],
  objetivoCardId: string,
  invocacion = false,
): ResultadoPago {
  if (eterIds.length === 0) return { ok: false, error: 'no indicaste Éteres para pagar' }
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return { ok: false, error: `carta objetivo desconocida: ${objetivoCardId}` }
  const p = state.players[jugador]
  const vistos = new Set<string>()
  let suma = 0
  for (const id of eterIds) {
    if (vistos.has(id)) return { ok: false, error: `Éter duplicado: ${id}` }
    vistos.add(id)
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!inst || !meta || !esEter(meta)) return { ok: false, error: `no es un Éter: ${id}` }
    if (!p.eterReserva.includes(id)) return { ok: false, error: `el Éter no está en tu Reserva: ${id}` }
    suma += aporteDe(meta.id, objetivoCardId)
  }
  const coste = costeAPagar(state, jugador, objetivoCardId, invocacion)
  if (suma < coste) return { ok: false, error: 'pago insuficiente' }
  if (suma > coste) return { ok: false, error: 'sobrepago no permitido — selecciona exactamente el coste' }
  return { ok: true, aportado: suma }
}

/** Paga: mueve eterIds 2A → 1A, emite eter_pagado y dispara gatillos al-pagar-eter (C2). */
export function aplicarPago(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  objetivoCardId: string,
  contextoUso?: ContextoUso,
): GameState {
  const invocacion = contextoUso?.tipo === 'invocar'
  const validado = validarPago(s, jugador, eterIds, objetivoCardId, invocacion)
  if (!validado.ok || validado.aportado === undefined) return s
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return s // defensivo: validarPago ya lo comprobó
  const p = s.players[jugador]
  for (const id of eterIds) {
    const idx = p.eterReserva.indexOf(id)
    if (idx !== -1) p.eterReserva.splice(idx, 1)
    p.eterPagado.push(id)
  }
  ctx.emit({
    type: 'eter_pagado',
    jugador,
    eterIds,
    costo: costeAPagar(s, jugador, objetivoCardId, invocacion),
    aportado: validado.aportado,
  })

  dispararAlPagarEter(s, ctx, jugador, eterIds, contextoUso)
  return s
}

/**
 * Lote 4B · Peaje (regla `costeBloqueo`, Ragnar): Éter que `jugador` paga al DECLARAR el bloqueo, por cada Campeón que bloquea.
 * Es un pago normal: el Éter va de la Reserva a la zona de pago (1A), emite `eter_pagado` y dispara los «al pagar» de ese Éter
 * (contexto 'combate'). Sale de los PRIMEROS Éteres PROPIOS de la Reserva, sin selector: el Éter arrebatado no sirve para el Peaje.
 * Devuelve false (sin tocar nada) si no hay suficientes.
 */
export function pagarPeaje(s: GameState, ctx: Ctx, jugador: PlayerId, cantidad: number): boolean {
  if (cantidad <= 0) return true
  const eterIds = eteresPropios(s, s.players[jugador].eterReserva, jugador).slice(0, cantidad)
  if (eterIds.length < cantidad) return false
  const p = s.players[jugador]
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1)
    p.eterPagado.push(id)
  }
  ctx.emit({ type: 'eter_pagado', jugador, eterIds, costo: cantidad, aportado: cantidad })
  dispararAlPagarEter(s, ctx, jugador, eterIds, { tipo: 'combate' })
  return true
}

/**
 * C2 (ADR-25): gatillos al-pagar-eter por cada Éter con trigger='al_pagar_eter' en sus efectos.
 * Lo llaman TODOS los caminos que pagan Éter a la zona de pago (`aplicarPago`, `pagarPeaje` y `pagarHabilidad`): un Éter «Cuando
 * pagues esta carta» se dispara pagues lo que pagues, salvo que el propio Éter lo restrinja (DS-005: «para invocar un Campeón»).
 */
export function dispararAlPagarEter(s: GameState, ctx: Ctx, jugador: PlayerId, eterIds: string[], contextoUso?: ContextoUso): void {
  const gatillos = eterIds.filter((id) => {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta || !esEter(meta)) return false
    // R1 (Éter arrebatado): se gasta como cualquiera, pero NO activa sus efectos para quien lo arrebató
    if (esEterAjeno(s, id, jugador)) return false
    // Check efectos[] with trigger='al_pagar_eter' (JSON interpreter path)
    if ('efectos' in meta && meta.efectos) {
      return meta.efectos.some((e) => e.trigger === 'al_pagar_eter')
    }
    return false
  })
  for (const id of gatillos) {
    dispararTrigger(s, ctx, 'al-pagar-eter', jugador, [id], {
      contextoUso: contextoUso?.tipo,
      objetivoId: contextoUso?.cardInstanceId,
    })
  }
}

/**
 * Éteres de la Reserva (en orden) que cubren el coste de la carta objetivo,
 * o null si la Reserva completa no alcanza (aporteDe). Read-only.
 * Usado por getValidActions/bot para generar pagos "nunca fallarán".
 */
/**
 * Selecciona Éteres de la Reserva que sumen EXACTAMENTE el coste (sin sobrepago).
 * Busca la combinación más pequeña que sume exactamente el coste.
 */
export function etersParaPagar(state: GameState, jugador: PlayerId, objetivoCardId: string, invocacion = false): string[] | null {
  const objetivo = getCardMeta(objetivoCardId)
  if (!objetivo) return null
  const p = state.players[jugador]
  const coste = costeAPagar(state, jugador, objetivoCardId, invocacion)

  // Preparar éteres con su contribución
  const eteres: { id: string; contrib: number }[] = []
  for (const id of p.eterReserva) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    eteres.push({ id, contrib: aporteDe(meta.id, objetivoCardId) })
  }

  // Buscar combinación que sume exactamente el coste (backtrack)
  function buscar(start: number, sumaActual: number, seleccionados: string[]): string[] | null {
    if (sumaActual === coste) return seleccionados
    if (sumaActual > coste) return null
    for (let i = start; i < eteres.length; i++) {
      const resultado = buscar(i + 1, sumaActual + eteres[i].contrib, [...seleccionados, eteres[i].id])
      if (resultado) return resultado
    }
    return null
  }

  return buscar(0, 0, [])
}

/**
 * Validación read-only del bloqueo: null = válido, string = motivo de rechazo.
 * Fase 3a: targetInstanceId — Campeón (2B-2F) o Artefacto (3A-3F, Fase 3a Phase B).
 * El Éter bloqueado vive en `inst.eterBloqueado` de CUALQUIER carta en campo.
 *
 * Fase 2 (b): el LÍMITE se valida contra la FUENTE del efecto que paga la
 * acción (efectoBloqueoAccion / `efectoIdx` explícito en cartas multi-efecto),
 * no contra "el primer costo de la carta"; `actuales` cuenta SOLO el Éter de
 * esa fuente (eterDeEfecto — sin tag cuenta como propio, fallback).
 */
export function validarBloqueo(
  state: GameState,
  jugador: PlayerId,
  eterIds: string[],
  targetInstanceId: string,
  efectoIdx?: number,
  opciones?: { externo?: boolean },
): string | null {
  // Decisión A (Pasivo 1A ajeno, FB-005/DS-006): un Éter EXTERNO se bloquea desde la
  // Reserva y NO ocupa el cupo ni el pago exacto de la carta («bloqueo fijo» o «hasta N»).
  const externo = opciones?.externo === true
  const inst = state.instances[targetInstanceId]
  if (!inst) return 'la carta no existe'
  const p = state.players[jugador]
  // El target debe estar en el campo del jugador (campeones + artefactos)
  const enCampo =
    p.campo.campeones.includes(targetInstanceId) ||
    p.campo.misticasTacticas.includes(targetInstanceId) ||
    p.campo.arcanasCombate.includes(targetInstanceId)
  if (!enCampo) return 'la carta no está en tu campo'
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta) return 'carta desconocida'
  // Negar un «efecto activo»: el Campeón no puede activar (bloquear Éter) sus efectos Continuos hasta que acabe
  if (efectosNegados(state, targetInstanceId)) return 'los efectos de esta carta están negados'
  // Fase 3a: Campeones siempre; Artefactos (Místicas/Arcanas) solo si tienen
  // efecto con costo-bloqueado en efectos[] (manual §7.7 — soporte continua).
  if (!p.campo.campeones.includes(targetInstanceId)) {
    if (!cartaNecesitaEterBloqueado(meta)) {
      return 'esta carta no tiene efecto que use Éter bloqueado'
    }
  }
  if (eterIds.length === 0) return 'no indicaste Éteres para bloquear'

  // Fase 2 (b): fuente = el efecto que paga ESTA acción (`efectoIdx` explícito
  // en cartas con 2+ efectos costo-bloqueo, o el primero NO-disparo).
  // bloqueo_fijo ("Bloquea X Éter") → EXACTO; eter_bloqueado ("hasta X") → ≤ X.
  // Campeón sin efecto fuente → default 1 (comportamiento previo).
  const fuente = efectoIdx !== undefined && 'efectos' in meta && meta.efectos?.[efectoIdx]
    ? { efecto: meta.efectos[efectoIdx], indice: efectoIdx }
    : efectoBloqueoAccion(meta)
  const maxEter = fuente?.efecto.costo?.cantidad ?? 1
  const fijo = fuente?.efecto.costo?.tipo === 'bloqueo_fijo'
  const actuales = fuente
    ? eterDeEfecto(state, targetInstanceId, fuente.indice).length
    : (inst.eterBloqueado?.length ?? 0)
  const total = actuales + eterIds.length
  if (!externo) {
    // Fase B: bloqueo_fijo = N EXACTOS POR ACTIVACIÓN (cada acción es una activación, repetible).
    // Ya no se mide contra el total acumulado: 8 Éter = 2 activaciones de 4.
    if (fijo) {
      if (eterIds.length !== maxEter) {
        return `bloqueo fijo: debes bloquear exactamente ${maxEter} Éter(es) por activación (seleccionaste ${eterIds.length})`
      }
      // «Una vez por turno» (opcional, Fase B): la misma activación del mismo efecto no se repite este turno
      if (fuente && fuente.efecto.activacion === 'una_por_turno' && (inst.efectosUsadosEsteTurno ?? []).includes(fuente.indice)) {
        return 'ya usaste este efecto este turno (una vez por turno)'
      }
      // «Una sola vez mientras siga bloqueado»: mientras el efecto tenga Éter PROPIO bloqueado no se activa otra vez
      // (`actuales` ya excluye el externo, que no cuenta para el efecto)
      if (fuente && fuente.efecto.activacion === 'una_mientras_bloqueado' && actuales > 0) {
        return 'este efecto ya está activo: su Éter sigue bloqueado (solo una vez mientras siga bloqueado)'
      }
    } else if (total > maxEter) {
      return `máximo ${maxEter} Éter(es) bloqueado(s) en esta carta (ya tiene ${actuales})`
    }
  }

  for (const id of eterIds) {
    const eterInst = state.instances[id]
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
    if (!eterInst || !eterMeta || !esEter(eterMeta)) return `no es un Éter: ${id}`
    // R1 (Éter arrebatado): el Éter de otro jugador se puede gastar, pero no bloquear
    if (esEterAjeno(state, id, jugador)) return `el Éter ${id} es arrebatado: no se puede bloquear`
    // Fase 2 (c): zona de ORIGEN del pago — 'reserva' (2A) o 'pagado' (1A)
    // El externo lo paga el Pasivo 1A desde la Reserva (nunca desde 1A)
    const origenPagado = !externo && fuente?.efecto.costo?.origen === 'pagado'
    const zonaOrigen = origenPagado ? p.eterPagado : p.eterReserva
    if (!zonaOrigen.includes(id)) {
      return origenPagado ? `el Éter no está en tu Éter Pagado (1A): ${id}` : `el Éter no está en tu Reserva: ${id}`
    }
    // Verificar que el éter no esté ya bloqueado en esta carta ni en ninguna otra del jugador
    if (inst.eterBloqueado?.includes(id)) return `el Éter ya está bloqueado en esta carta`
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      for (const cid of p.campo[grupo]) {
        if (cid && cid !== targetInstanceId) {
          const ci = state.instances[cid]
          if (ci?.eterBloqueado?.includes(id)) return `el Éter ya está bloqueado en otra carta`
        }
      }
    }
  }
  return null
}

/** Extrae el máximo de éteres bloqueados desde efectos[]. Exportado (Fase 3a) — usado por validActions. */
export function maxEterBloqueado(card: AnyCard): number {
  if ('efectos' in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costo?.tipo === 'eter_bloqueado' && e.costo.cantidad !== undefined) {
        return e.costo.cantidad
      }
      if (e.costo?.tipo === 'bloqueo_fijo' && e.costo.cantidad !== undefined) {
        return e.costo.cantidad
      }
    }
  }
  return 1 // default: 1 Éter
}

/**
 * ¿El costo de bloqueo es FIJO? ("Bloquea X Éter" → pago exacto)
 * vs flexible ("hasta un máximo de X" → eter_bloqueado, hasta X).
 * Aurora FB-010 y FB-032 usan bloqueo_fijo; FB-022 usa eter_bloqueado.
 */
export function esBloqueoFijo(card: AnyCard): boolean {
  if ('efectos' in card && card.efectos) {
    return card.efectos.some((e) => e.costo?.tipo === 'bloqueo_fijo')
  }
  return false
}

/**
 * Bloqueo de Éter: valida TODO (sin mutar) y luego mueve 2A → target.eterBloqueado.
 * Fase 3a: targetInstanceId — Campeón o (Phase B) Artefacto en campo.
 * Fase 2: etiqueta cada Éter con su fuente/efecto (`efectoIdx` o el primero
 * NO-disparo con costo-bloqueo) y su PAGADOR — la liberación le devolverá el
 * Éter a ÉL (§7.8). Devuelve null si fue válido, o el motivo de rechazo.
 */
export function bloquearEter(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  eterIds: string[],
  targetInstanceId: string,
  efectoIdx?: number,
): string | null {
  const error = validarBloqueo(s, jugador, eterIds, targetInstanceId, efectoIdx)
  if (error) return error
  const p = s.players[jugador]
  const instTarget = s.instances[targetInstanceId]
  instTarget.eterBloqueado = [...(instTarget.eterBloqueado ?? []), ...eterIds]
  // Fase 2 (c): filiación del Éter — fuente/efecto + pagador. El mismo
  // derivador decide la ZONA DE ORIGEN (2A Reserva / 1A Éter Pagado).
  const meta = instTarget.cardId ? getCardMeta(instTarget.cardId) : null
  const fuente = efectoIdx !== undefined && meta && 'efectos' in meta && meta.efectos?.[efectoIdx]
    ? { efecto: meta.efectos[efectoIdx], indice: efectoIdx }
    : meta ? efectoBloqueoAccion(meta) : null
  const zonaOrigen = fuente?.efecto.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
  for (const id of eterIds) {
    const idx = zonaOrigen.indexOf(id)
    if (idx !== -1) zonaOrigen.splice(idx, 1)
  }
  etiquetarEter(s, eterIds, targetInstanceId, fuente?.indice ?? -1, jugador)
  if (fuente) marcarContinuoActivado(s, targetInstanceId, fuente.indice) // Lote 2: «mientras tenga Éter bloqueado» se enciende al pagar
  // Fase B: «una vez por turno» se GASTA al pagar (aunque la activación luego sea negada)
  if (fuente?.efecto.costo?.tipo === 'bloqueo_fijo' && fuente.efecto.activacion === 'una_por_turno') {
    instTarget.efectosUsadosEsteTurno = [...(instTarget.efectosUsadosEsteTurno ?? []), fuente.indice]
  }
  // Mutación: un Éter que dice «mientras esté bloqueado, el Campeón que lo tenga se convierte en la esencia que elijas» pide la
  // Esencia al bloquearse y la mantiene solo mientras ese Éter siga sobre el Campeón (atributos.ts, `mientrasEter`)
  for (const id of eterIds) {
    const eterMeta = s.instances[id]?.cardId ? getCardMeta(s.instances[id].cardId!) : null
    const pide = !!eterMeta && 'efectos' in eterMeta && !!eterMeta.efectos?.some((e) => e.tipo === 'bloqueo' && e.efecto === 'change_type' && e.cambioTipo?.esenciaElegida)
    if (pide) iniciarElegirEsencia(s, jugador, [targetInstanceId], { duenio: jugador, expira: 'permanente', mientrasEter: id })
  }
  // campeonId = id de instancia target (Campeón o Artefacto) — ver events.ts
  ctx.emit({ type: 'eter_bloqueado', jugador, eterIds, campeonId: targetInstanceId })
  return null
}

/**
 * Alba del dueño: 1A → 2A (eter_reagrupado). El Éter bloqueado permanece en el Campeón.
 * R1 (Éter arrebatado): ADEMÁS vuelve a la Reserva de su dueño todo su Éter que esté en las zonas del otro jugador (Reserva o zona de
 * pago): es el «todo el Éter fuera de la Reserva se reagrupa» de §8.2. Lo arrebatado es prestado hasta el Alba de su dueño.
 */
export function reagruparEter(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]
  // Lote 3 (Runa de Ancla): el Éter ANCLADO se queda en 1A esta Alba. El ancla dura UNA sola Alba: se vacía siempre aquí
  // (también si el Éter ya no está en 1A). Va en el propio reagrupar, no en purgarHastaFase('alba'), porque la purga corre
  // ANTES de reagruparEter (resolverAlba) y el ancla no habría protegido nada.
  const anclados = new Set(p.eterAnclado ?? [])
  delete p.eterAnclado
  const reagrupados = p.eterPagado.filter((id) => !anclados.has(id))
  if (reagrupados.length > 0) {
    // El Pasivo 1A de una carta de Éter (una vez por turno) se estrena de nuevo la próxima vez que se pague
    for (const id of reagrupados) delete s.instances[id]?.opcionUsadaEsteTurno
    p.eterReserva.push(...reagrupados)
    p.eterPagado = p.eterPagado.filter((id) => anclados.has(id))
    ctx.emit({ type: 'eter_reagrupado', jugador, eterIds: reagrupados })
  }
  // R1: lo que arrebató el rival (en su Reserva o en su zona de pago) regresa a MI Reserva
  const rival = s.players[jugador === 'A' ? 'B' : 'A']
  const devueltos = [...rival.eterReserva, ...rival.eterPagado].filter((id) => s.instances[id]?.owner === jugador)
  if (devueltos.length > 0) {
    rival.eterReserva = rival.eterReserva.filter((id) => !devueltos.includes(id))
    rival.eterPagado = rival.eterPagado.filter((id) => !devueltos.includes(id))
    for (const id of devueltos) delete s.instances[id]?.opcionUsadaEsteTurno
    p.eterReserva.push(...devueltos)
    ctx.emit({ type: 'eter_reagrupado', jugador, eterIds: devueltos })
  }
}
