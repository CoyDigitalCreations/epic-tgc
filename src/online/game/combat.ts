import { abrirCadena } from './chain'
import { keywordsDe, statsDe } from './efectos'
import { destruirCarta } from './replacements'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Sub-máquina de combate en Choque (9.1, ADR-11): `GameState.combate?` se crea
 * con la PRIMERA declarar_ataque en paso 'bloqueo' y auto-avanza a 'resolucion'
 * si el defensor no tiene enderezados (9.3) - sin evento bloqueo_declarado.
 * Validadores read-only + ejecutores puros sobre el clon (patrón ADR-5).
 * La resolución (daño simultáneo) y la Ruptura se aplican en el commit C3.
 * Combate = 0 extracciones RNG (contrato 89 intacto).
 * Stats consultados vía statsDe/keywordsDe de efectos.ts (C1, ADR-20/22): el
 * combate ve los modificadores (Σ aditivo) con la MISMA semántica pre-auras.
 */

/** Consulta de keyword genérica (data paquetes.ts + overrides, sin hardcode por cardId). */
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
    if (inst.atacoEsteTurno) return false
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
    // Ya atacó este turno (un ataque por turno; cierra re-ataque Carga/Vigor)
    inst.atacoEsteTurno = true
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
  // C4 (9.6): el DEFENSOR responde primero (L1181) — si tiene respondibles la
  // cadena se abre y el auto-avance 9.3 queda DIFERIDO hasta cerrarla.
  if (abrirCadena(s, rivalDe(s))) return
  // Auto-avance (9.3, ADR-11): defensor sin enderezados → resolución sin
  // evento bloqueo_declarado (los ataques quedan sin bloquear)
  if (bloqueadoresDisponibles(s).length === 0) {
    s.combate.paso = 'resolucion'
    resolverCombate(s, ctx) // sin pares: sin muertes
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
  // Resolución (9.4-B, ADR-11/14): daño simultáneo aplicado EN LA TRANSICIÓN
  resolverCombate(s, ctx)
  // C4 (9.6): tras la resolución, el ATACANTE puede responder (L1182); la
  // Ruptura queda pendiente hasta cerrar la cadena.
  abrirCadena(s, s.turno)
}

/* ─────────────────── resolución: daño simultáneo (9.4-B, ADR-14) ─────────────────── */

/**
 * Daño simultáneo (9.4-B, L1119-1124): con los pares atacante→bloqueador ya
 * fijados, decide TODAS las muertes sobre el estado PRE-daño (sin cascadas,
 * ADR-14; el daño no persiste, L1122) y las aplica en orden determinista
 * (atacantes, luego bloqueadores) vía destruirCarta('combate') → 2G + Éter
 * 1A + carta_muerta + destruccion. Stats consultados vía statsDe (C1, ADR-20):
 * base meta + override de instancia + Σ modificadores (misma semántica pre-auras).
 */
function resolverCombate(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  if (!combate) return
  const muertosAtacantes: string[] = []
  const muertosBloqueadores: string[] = []
  for (const atacante of combate.atacantes) {
    const bloqueador = combate.bloqueos[atacante]
    if (!bloqueador) continue // sin bloquear: no hay daño (Ruptura, no muerte)
    // Ambos deciden con el estado PRE-daño (los stats no cambian: sin marcas)
    const statsAtacante = statsDe(s, atacante)
    const statsBloqueador = statsDe(s, bloqueador)
    if (statsAtacante.poder >= statsBloqueador.resistencia) muertosBloqueadores.push(bloqueador)
    if (statsBloqueador.poder >= statsAtacante.resistencia) muertosAtacantes.push(atacante)
  }
  for (const id of [...muertosAtacantes, ...muertosBloqueadores]) {
    destruirCarta(s, ctx, id, 'combate')
  }
}

/**
 * Reanuda la sub-máquina tras CERRAR la cadena 9.6 (C4): si la cadena se abrió
 * tras declarar_ataque (paso 'bloqueo'), el auto-avance 9.3 que quedó diferido
 * ahora se evalúa; si se abrió tras declarar_bloqueo (paso 'resolucion'), la
 * Ruptura queda pendiente como en el flujo normal.
 */
export function continuarCombateTrasCadena(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  if (!combate) return
  if (combate.paso === 'bloqueo' && bloqueadoresDisponibles(s).length === 0) {
    combate.paso = 'resolucion'
    resolverCombate(s, ctx) // sin pares: sin muertes
  }
}

/* ─────────────────── Ruptura (9.4-A, ADR-13) ─────────────────── */

export function validarElegirRuptura(state: GameState, atacanteId: string | null, vinculoSlot?: number): string | null {
  if (state.fase !== 'choque') return 'elegir_ruptura solo en Choque'
  const combate = state.combate
  if (!combate || combate.paso !== 'resolucion') return 'no hay resolución pendiente'
  if (combate.rupturaUsadaEsteTurno) return 'ya usaste la Ruptura este turno de ataque'
  if (atacanteId === null) {
    if (vinculoSlot !== undefined) return 'sin atacante no hay slot de Vínculo'
    return null // no romper es voluntario (L1107)
  }
  if (!combate.rupturaDisponible) return 'no hay ataques sin bloquear para romper'
  if (!combate.atacantes.includes(atacanteId)) return 'no es un atacante declarado'
  if (atacanteId in combate.bloqueos) return 'el ataque fue bloqueado: no rompe (L1123)'
  if (!state.players[state.turno].campo.campeones.includes(atacanteId)) return 'el atacante murió'
  if (vinculoSlot === undefined || vinculoSlot < 0 || vinculoSlot > 5) return 'vinculoSlot 0-5'
  const vinculoId = state.players[rivalDe(state)].vinculos[vinculoSlot]
  if (!vinculoId) return 'no hay Vínculo vivo en ese slot'
  if (state.instances[vinculoId]?.bocaArriba) return 'el Vínculo ya fue destruido'
  return null
}

export function ejecutarElegirRuptura(s: GameState, atacanteId: string | null, vinculoSlot: number | undefined, ctx: Ctx): void {
  if (atacanteId !== null && vinculoSlot !== undefined) {
    const vinculoId = s.players[rivalDe(s)].vinculos[vinculoSlot]!
    ctx.emit({ type: 'ruptura_realizada', atacanteId, vinculoSlot, vinculoId })
    destruirCarta(s, ctx, vinculoId, 'ruptura') // bocaArriba + sexto Vínculo + derrota
    if (s.combate) s.combate.rupturaUsadaEsteTurno = true // defensivo
  }
  s.combate = undefined // elegir_ruptura cierra (ADR-11)
}
