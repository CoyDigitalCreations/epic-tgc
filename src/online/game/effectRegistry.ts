/**
 * Effect Registry — ACCIONES pendientes por fase del turno.
 *
 * DOMINIO (Fase 2b — unificación de expiración):
 * - ESTE módulo: acciones que se ejecutan en una fase futura —
 *   p.ej. liberar-eter/reagrupar de Aurora/Ragnar (activaron continuo con
 *   reagrupar alba). Se registran al activar y resuelven en la fase indicada.
 * - Purga clásica ADR-22 (efectos.ts purgarEfectosTemporales/
 *   purgarKeywordsTemporales): expiración de stats/keywords temporales
 *   (modificadores.turnosRestantes, keywordsTemporales). Es el ÚNICO sistema
 *   de expiración de modificadores — este registry NO la reemplaza.
 *
 * Uso:
 *   1. `registrarEfectoPendiente()` cuando un efecto se activa
 *   2. `resolverFaseEfectos()` se llama al inicio de cada fase (phases.ts/partida.ts)
 *   3. `purgarEfectosPendientes()` interna elimina los que expiraron
 *   4. Los pendientes mueren con su fuente (limpiarFuente al salir del campo)
 */

import type { Ctx, GameState, PlayerId, Zona } from './types'
import { enviarAlCementerio } from './replacements'
import { getCardMeta } from './cards'

/* ───────────────────── Types ───────────────────── */

/** Fase del turno en que el efecto se resuelve. */
export type FaseTrigger = 'alba' | 'forja' | 'choque' | 'ocaso'

/** Condición de_OWNER del trigger (quién controla la carta fuente). */
export type OwnerTrigger = 'dueño' | 'rival' | 'cualquiera'

/** Acción concreta que el efecto pendiente ejecuta al resolverse.
 * Fase 3e: renombrado de EfectoAccion → AccionPendiente (resolvía la colisión
 * de nombre con el string union EfectoAccion de shared/types/cards.ts). */
export type AccionPendiente =
  | { tipo: 'modificar'; objetivo: string; stat: 'poder' | 'resistencia'; delta: number }
  | { tipo: 'liberar-eter'; eterIds: string[]; destino: 'reserva' }
  | { tipo: 'destruir'; objetivo: string }
  | { tipo: 'agotar'; objetivo: string }
  | { tipo: 'robar-cartas'; cantidad: number }
  | { tipo: 'keyword-temporal'; objetivo: string; keyword: string }
  | { tipo: 'enviar-cementerio'; objetivo: string }

/** Duración del efecto: cuánto tiempo vive. */
export interface EfectoDuracion {
  tipo: 'turnos' | 'hasta-fase' | 'permanente'
  /** Solo para tipo='turnos': cuántos ocasos del dueño faltan. */
  restantes?: number
  /** Solo para tipo='hasta-fase': fase específica. */
  hastaFase?: FaseTrigger
  /** Quién debe pasar por esa fase para que expire. */
  ownerTrigger?: OwnerTrigger
}

/** Efecto pendiente registrado en el registry. */
export interface EfectoPendiente {
  /** ID único (uuid o counter incremental). */
  id: string
  /** cardInstanceId que originó este efecto. */
  fuente: string
  /** Jugador que controla la carta fuente (dueño original). */
  owner: PlayerId
  /** Fase del turno en que se resuelve. */
  triggerFase: FaseTrigger
  /** ¿En cuyo turno se resuelve? */
  triggerOwner: OwnerTrigger
  /** La acción a ejecutar. */
  accion: AccionPendiente
  /** Cuánto tiempo vive el efecto. */
  duracion: EfectoDuracion
  /** Si el efecto ya fue resuelto esta fase (evita doble-resolución). */
  resuelto?: boolean
}

/* ───────────────────── Registry ───────────────────── */

/** Genera un ID único para efectos pendientes (basado en estado, no en counter global). */
function generarId(s: GameState): string {
  const count = s.efectosPendientes?.length ?? 0
  return `ep-${count + 1}`
}

/**
 * Registra un efecto pendiente en el GameState.
 * Retorna el ID generado para poder cancelarlo después si es necesario.
 */
export function registrarEfectoPendiente(
  s: GameState,
  params: {
    fuente: string
    owner: PlayerId
    triggerFase: FaseTrigger
    triggerOwner?: OwnerTrigger
    accion: AccionPendiente
    duracion: EfectoDuracion
  },
): string {
  if (!s.efectosPendientes) s.efectosPendientes = []
  const id = generarId(s)
  const efecto: EfectoPendiente = {
    id,
    fuente: params.fuente,
    owner: params.owner,
    triggerFase: params.triggerFase,
    triggerOwner: params.triggerOwner ?? 'dueño',
    accion: params.accion,
    duracion: params.duracion,
  }
  s.efectosPendientes.push(efecto)
  return id
}

/**
 * Resuelve todos los efectos pendientes para una fase específica.
 * Se llama al inicio de cada fase (Alba, Forja, Choque, Ocaso).
 *
 * @param s Estado del juego (mutado in-place).
 * @param ctx Contexto de ejecución (emite eventos).
 * @param fase Fase actual del turno.
 * @param jugadorActual Jugador cuyo turno está en curso.
 */
export function resolverFaseEfectos(
  s: GameState,
  ctx: Ctx,
  fase: FaseTrigger,
  jugadorActual: PlayerId,
): void {
  if (!s.efectosPendientes || s.efectosPendientes.length === 0) return

  const aResolver = s.efectosPendientes.filter((ep) => {
    // Solo efectos de esta fase
    if (ep.triggerFase !== fase) return false
    // Filtro por owner del trigger
    if (ep.triggerOwner === 'dueño' && ep.owner !== jugadorActual) return false
    if (ep.triggerOwner === 'rival' && ep.owner === jugadorActual) return false
    // No resolver dos veces en la misma fase
    if (ep.resuelto) return false
    return true
  })

  for (const ep of aResolver) {
    ejecutarAccionEfecto(s, ctx, ep)
    ep.resuelto = true
  }

  // Limpiar efectos resueltos y expirados
  purgarEfectosPendientes(s, fase, jugadorActual)
}

/**
 * Ejecuta la acción concreta de un efecto pendiente sobre el estado.
 */
function ejecutarAccionEfecto(s: GameState, ctx: Ctx, ep: EfectoPendiente): void {
  const accion = ep.accion

  switch (accion.tipo) {
    case 'modificar': {
      const inst = s.instances[accion.objetivo]
      if (!inst) return
      if (!inst.modificadores) inst.modificadores = []
      inst.modificadores.push({
        stat: accion.stat,
        valor: accion.delta,
        expira: duracionAExpira(ep.duracion),
        turnosRestantes: ep.duracion.tipo === 'turnos' ? ep.duracion.restantes : undefined,
      })
      break
    }

    case 'liberar-eter': {
      const inst = s.instances[ep.fuente]
      // Si la carta ya no existe o no tiene eterBloqueado, los éteres ya fueron
      // liberados por liberarEterBloqueado (destrucción/sacrificio) — no duplicar.
      if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) break
      const eteresVivos = accion.eterIds.filter((id) => inst.eterBloqueado!.includes(id))
      if (eteresVivos.length === 0) break
      inst.eterBloqueado = inst.eterBloqueado.filter((id) => !eteresVivos.includes(id))
      const p = s.players[ep.owner]
      p.eterReserva.push(...eteresVivos)
      ctx.emit({ type: 'eter_reagrupado', jugador: ep.owner, eterIds: eteresVivos })
      // Steal 'mientras_ester_bloqueado' (Aurora): al liberar el Éter del efecto
      // termina el robo — retorno condicional al rival si hay slot libre.
      if (inst.cardId) {
        const meta = getCardMeta(inst.cardId)
        const stealEfecto = meta && 'efectos' in meta
          ? meta.efectos?.find((e) => e.efecto === 'steal_champion')
          : undefined
        if (stealEfecto?.duracion === 'mientras_ester_bloqueado') {
          for (const other of Object.values(s.instances)) {
            if (other.stolenBy !== ep.fuente) continue
            const enCampoLadron = s.players[ep.owner].campo.campeones.includes(other.cardInstanceId)
            if (!enCampoLadron) {
              delete other.stolenBy
              continue
            }
            const duenoOriginal = other.owner
            const campoOriginal = s.players[duenoOriginal].campo.campeones
            const slotLibre = campoOriginal.indexOf(null)
            if (slotLibre !== -1 && duenoOriginal !== ep.owner) {
              const idxLadron = s.players[ep.owner].campo.campeones.indexOf(other.cardInstanceId)
              if (idxLadron !== -1) s.players[ep.owner].campo.campeones[idxLadron] = null
              campoOriginal[slotLibre] = other.cardInstanceId
            }
            delete other.stolenBy
          }
        }
      }
      break
    }

    case 'destruir': {
      const inst = s.instances[accion.objetivo]
      if (!inst) return
      // Buscar en campo del owner
      const p = s.players[inst.owner]
      const slotIdx = p.campo.campeones.indexOf(accion.objetivo)
      if (slotIdx !== -1) {
        p.campo.campeones[slotIdx] = null
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: accion.objetivo, zona: `2${String.fromCharCode(66 + slotIdx)}` as Zona, jugador: inst.owner })
        enviarAlCementerio(s, ctx, accion.objetivo)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: accion.objetivo, zona: '2G', jugador: inst.owner, bocaArriba: true })
      }
      break
    }

    case 'agotar': {
      const inst = s.instances[accion.objetivo]
      if (inst) inst.agotado = true
      break
    }

    case 'robar-cartas': {
      const p = s.players[ep.owner]
      for (let i = 0; i < accion.cantidad; i++) {
        if (p.mazo.length === 0) break
        const cartaId = p.mazo.shift()!
        p.mano.push(cartaId)
        ctx.emit({ type: 'carta_robada', jugador: ep.owner, cardInstanceId: cartaId })
      }
      break
    }

    case 'keyword-temporal': {
      const inst = s.instances[accion.objetivo]
      if (!inst) return
      if (!inst.keywordsTemporales) inst.keywordsTemporales = []
      if (!inst.keywordsTemporales.includes(accion.keyword)) {
        inst.keywordsTemporales.push(accion.keyword)
      }
      break
    }

    case 'enviar-cementerio': {
      const inst = s.instances[accion.objetivo]
      if (!inst) break
      const p = s.players[inst.owner]
      // Buscar en místicas/tácticas (3A-3C)
      const slotMT = p.campo.misticasTacticas.indexOf(accion.objetivo)
      if (slotMT !== -1) {
        const zona = `3${String.fromCharCode(65 + slotMT)}` as Zona
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: accion.objetivo, zona, jugador: inst.owner })
        p.campo.misticasTacticas[slotMT] = null
        p.cementerio.push(accion.objetivo)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: accion.objetivo, zona: '2G', jugador: inst.owner, bocaArriba: true })
        break
      }
      // Buscar en arcanas/combate (3D-3F)
      const slotAC = p.campo.arcanasCombate.indexOf(accion.objetivo)
      if (slotAC !== -1) {
        const zona = `3${String.fromCharCode(68 + slotAC)}` as Zona
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: accion.objetivo, zona, jugador: inst.owner })
        p.campo.arcanasCombate[slotAC] = null
        p.cementerio.push(accion.objetivo)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: accion.objetivo, zona: '2G', jugador: inst.owner, bocaArriba: true })
        break
      }
      // Buscar en campeones (2B-2F)
      const slotCP = p.campo.campeones.indexOf(accion.objetivo)
      if (slotCP !== -1) {
        const zona = `2${String.fromCharCode(66 + slotCP)}` as Zona
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: accion.objetivo, zona, jugador: inst.owner })
        p.campo.campeones[slotCP] = null
        enviarAlCementerio(s, ctx, accion.objetivo)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: accion.objetivo, zona: '2G', jugador: inst.owner, bocaArriba: true })
      }
      break
    }
  }
}

/**
 * Purga efectos expirados después de resolver una fase.
 * - tipo='turnos': decrementa restantes en cada Ocaso del dueño; purga cuando llega a 0.
 * - tipo='hasta-fase': purga cuando la fase objetivo se cumplió.
 * - tipo='permanente': nunca se purga automáticamente.
 */
function purgarEfectosPendientes(s: GameState, fase: FaseTrigger, jugadorActual: PlayerId): void {
  if (!s.efectosPendientes) return

  s.efectosPendientes = s.efectosPendientes.filter((ep) => {
    // Siempre purgar los ya resueltos que no son recurring
    if (ep.resuelto && ep.duracion.tipo !== 'permanente') {
      // Los de tipo 'turnos' con restantes > 0 deben permanecer (recurring)
      if (ep.duracion.tipo === 'turnos' && ep.duracion.restantes !== undefined && ep.duracion.restantes > 0) {
        return true
      }
      return false
    }

    // Para 'turnos': decrementar en Ocaso del dueño
    if (ep.duracion.tipo === 'turnos' && fase === 'ocaso' && ep.owner === jugadorActual) {
      if (ep.duracion.restantes !== undefined) {
        ep.duracion.restantes -= 1
        if (ep.duracion.restantes <= 0) return false // expiró
      }
      return true
    }

    // Para 'hasta-fase': purgar si la fase objetivo se cumplió
    if (ep.duracion.tipo === 'hasta-fase' && ep.duracion.hastaFase === fase) {
      if (ep.duracion.ownerTrigger === 'dueño' && ep.owner === jugadorActual) return false
      if (ep.duracion.ownerTrigger === 'rival' && ep.owner !== jugadorActual) return false
      if (ep.duracion.ownerTrigger === 'cualquiera') return false
    }

    return true
  })
}

/* ───────────────────── Helpers ───────────────────── */

/** Convierte una EfectoDuracion al tipo ExpiraModificador (type bridge). */
function duracionAExpira(duracion: EfectoDuracion): 'ocaso' | 'alba-dueño' | 'permanente' {
  switch (duracion.tipo) {
    case 'turnos':
      return 'ocaso'
    case 'hasta-fase':
      return duracion.hastaFase === 'alba' ? 'alba-dueño' : 'ocaso'
    case 'permanente':
      return 'permanente'
  }
}

/**
 * Helper: crea un EfectoDuracion para "hasta tu próxima Alba".
 */
export function hastaAlba(): EfectoDuracion {
  return { tipo: 'hasta-fase', hastaFase: 'alba', ownerTrigger: 'dueño' }
}
