import { esCampeon, getCardMeta } from './cards'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Sub-máquina de combate en Choque (9.1, ADR-11): `GameState.combate?` se crea
 * con la PRIMERA declarar_ataque en paso 'bloqueo' y auto-avanza a 'resolucion'
 * si el defensor no tiene enderezados (9.3) — sin evento bloqueo_declarado.
 * Validadores read-only + ejecutores puros sobre el clon (patrón ADR-5).
 * La resolución (daño simultáneo) y la Ruptura se aplican en el commit C3.
 * Combate = 0 extracciones RNG (contrato 89 intacto).
 */

const keywordsDe = (state: GameState, id: string): readonly string[] => {
  const inst = state.instances[id]
  const cardId = inst?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  const deData = meta && esCampeon(meta) ? meta.keywords : []
  // Override aditivo de la instancia (types.ts): el test inyecta keywords que
  // la data de paquetes.ts aún no tiene (p.ej. Vigor); efectos futuros que
  // otorgan keywords usarán el mismo canal.
  const deInstancia = inst?.keywords ?? []
  return [...new Set([...deData, ...deInstancia])]
}

/** Consulta de keyword genérica (data paquetes.ts, sin hardcode por cardId). */
export const tieneKeyword = (state: GameState, id: string, kw: string): boolean =>
  keywordsDe(state, id).includes(kw)

/** Rival del jugador activo: el DEFENSOR en el Choque del turno en curso. */
export const rivalDe = (state: GameState): PlayerId => (state.turno === 'A' ? 'B' : 'A')

/**
 * Atacantes elegibles del jugador activo (9.2): Campeones enderezados (no
 * agotados) salvo keyword Carga (L1207). La invocación cansada (L1090) es un
 * Campeón agotado por entrar al campo (C5 agota al invocar) — la única
 * excepción es Carga. primerTurno prohíbe atacar (§8.6, L1062).
 */
export function atacantesElegibles(state: GameState): string[] {
  if (state.primerTurno) return []
  const p = state.players[state.turno]
  return p.campo.campeones.filter((id): id is string => {
    if (!id) return false
    const inst = state.instances[id]
    if (!inst) return false
    if (inst.agotado && !tieneKeyword(state, id, 'Carga')) return false
    return true
  })
}

/** Bloqueadores disponibles del DEFENSOR: Campeones enderezados (L1095). */
export function bloqueadoresDisponibles(state: GameState): string[] {
  const defensor = rivalDe(state)
  const p = state.players[defensor]
  return p.campo.campeones.filter((id): id is string => {
    if (!id) return false
    const inst = state.instances[id]
    return !!inst && !inst.agotado
  })
}

/** Ataques declarados sin bloqueador (los únicos con Ruptura posible, 9.4-A). */
export function ataquesSinBloquear(state: GameState): string[] {
  const combate = state.combate
  if (!combate) return []
  return combate.atacantes.filter((a) => !(a in combate.bloqueos))
}

/**
 * Asignación greedy forzada (9.3, ADR-19): los primeros k bloqueadores
 * disponibles (orden 2B-2F) cubren los primeros k ataques sin bloquear,
 * con k = mín(disponibles, ataques). getValidActions emite SOLO esta
 * asignación (determinista; el payload nunca falla la validación).
 */
export function asignacionForzada(state: GameState): Record<string, string> | null {
  const combate = state.combate
  if (!combate || combate.paso !== 'bloqueo') return null
  const disponibles = bloqueadoresDisponibles(state)
  const sinBloquear = ataquesSinBloquear(state)
  const k = Math.min(disponibles.length, sinBloquear.length)
  if (k === 0) return null
  const asignaciones: Record<string, string> = {}
  for (let i = 0; i < k; i++) asignaciones[sinBloquear[i]] = disponibles[i]
  return asignaciones
}

/* ─────────────────── declarar_ataque (9.2) ─────────────────── */

export function validarDeclararAtaque(state: GameState, atacanteIds: string[]): string | null {
  if (state.fase !== 'choque') return 'declarar_ataque solo en Choque'
  if (state.combate) return 'el combate ya fue declarado'
  if (state.primerTurno) return 'nadie ataca en el primer turno (§8.6)'
  if (atacanteIds.length === 0) return 'no declaraste atacantes'
  if (new Set(atacanteIds).size !== atacanteIds.length) return 'atacantes duplicados'
  const elegibles = atacantesElegibles(state)
  for (const id of atacanteIds) {
    if (!elegibles.includes(id)) return `el Campeón no puede atacar: ${id}`
  }
  return null
}

export function ejecutarDeclararAtaque(s: GameState, atacanteIds: string[], ctx: Ctx): void {
  s.combate = {
    paso: 'bloqueo',
    atacantes: atacanteIds,
    bloqueos: {},
    rupturaDisponible: true,
    rupturaUsadaEsteTurno: false,
  }
  for (const id of atacanteIds) {
    const inst = s.instances[id]
    // Agotar AL DECLARAR (L1089); Vigor no agota (L1208)
    if (!tieneKeyword(s, id, 'Vigor')) inst.agotado = true
    // Recarga (L1211): 1 Éter bloqueado del atacante vuelve a la Reserva 2A
    if (tieneKeyword(s, id, 'Recarga') && inst.eterBloqueado && inst.eterBloqueado.length > 0) {
      const eter = inst.eterBloqueado.shift()!
      s.players[inst.owner].eterReserva.push(eter)
      ctx.emit({ type: 'eter_reagrupado', jugador: inst.owner, eterIds: [eter] })
    }
  }
  ctx.emit({ type: 'ataque_declarado', jugador: s.turno, atacanteIds })
  // Auto-avance (9.3, ADR-11): defensor sin enderezados → resolución sin
  // evento bloqueo_declarado (los ataques quedan sin bloquear)
  if (bloqueadoresDisponibles(s).length === 0) {
    s.combate.paso = 'resolucion'
  }
}

/* ─────────────────── declarar_bloqueo (9.3, forzoso) ─────────────────── */

export function validarDeclararBloqueo(state: GameState, asignaciones: Record<string, string>): string | null {
  if (state.fase !== 'choque') return 'declarar_bloqueo solo en Choque'
  const combate = state.combate
  if (!combate || combate.paso !== 'bloqueo') return 'no hay bloqueo pendiente'
  const pares = Object.entries(asignaciones)
  if (pares.length === 0) return 'no asignaste bloqueadores'
  const disponibles = bloqueadoresDisponibles(state)
  const sinBloquear = ataquesSinBloquear(state)
  const k = Math.min(disponibles.length, sinBloquear.length)
  if (pares.length !== k) {
    return `el bloqueo es forzoso: asigna exactamente ${k} bloqueador(es) (9.3)`
  }
  const bloqueadoresUsados = new Set<string>()
  for (const [atacanteId, bloqueadorId] of pares) {
    if (!sinBloquear.includes(atacanteId)) return `no es un ataque sin bloquear: ${atacanteId}`
    if (!disponibles.includes(bloqueadorId)) return `el bloqueador no está disponible: ${bloqueadorId}`
    if (bloqueadoresUsados.has(bloqueadorId)) return 'un bloqueador no puede cubrir 2 ataques (L1099)'
    bloqueadoresUsados.add(bloqueadorId)
  }
  return null
}

export function ejecutarDeclararBloqueo(s: GameState, asignaciones: Record<string, string>, ctx: Ctx): void {
  const combate = s.combate!
  combate.bloqueos = { ...combate.bloqueos, ...asignaciones }
  combate.paso = 'resolucion'
  combate.rupturaDisponible = ataquesSinBloquear(s).length > 0
  ctx.emit({ type: 'bloqueo_declarado', jugador: rivalDe(s), asignaciones })
}
