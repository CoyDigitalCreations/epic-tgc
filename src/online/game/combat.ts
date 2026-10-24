import { abrirCadena } from './chain'
import { dispararTrigger, keywordsDe, statsDe, tieneDoubleAttackActivo } from './efectos'
import { destruirCarta } from './replacements'
import { evaluarFinSteal } from './eter'
import { reglaBool, reglaNumero } from './reglas'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Sub-máquina de combate en Choque (9.1, ADR-11): `GameState.combate?` se crea
 * con la PRIMERA declarar_ataque en paso 'bloqueo' y auto-avanza a 'resolucion'
 * si el defensor no tiene enderezados (9.3) - sin evento bloqueo_declarado.
 * Validadores read-only + ejecutores puros sobre el clon (patrón ADR-5).
 * La resolución (daño simultáneo) y la Ruptura se aplican en el commit C3.
 * Combate = 0 extracciones RNG (contrato 89 intacto).
 * Stats consultados vía statsDe/keywordsDe de efectos.ts (C1, ADR-20/22): el
 * combate ve los modificadores (Σ aditivo) Y las auras de campo (C3b, D6:
 * Isolde/Thane/Elena/Marek se suman vía modificadoresJSONDe en statsDe).
 */

/** Consulta de keyword genérica (data paquetes.ts + overrides, sin hardcode por cardId). */
export const tieneKeyword = (state: GameState, id: string, kw: string): boolean =>
  keywordsDe(state, id).includes(kw)

/** Rupturas que el jugador activo ya hizo este turno (§9.4). */
const rupturasHechas = (state: GameState): number => state.rupturasEsteTurno ?? 0

/** true si el jugador activo ya agotó las Rupturas que le permite la regla `rupturasPorTurno` (§9.4). */
const rupturasAgotadas = (state: GameState): boolean =>
  rupturasHechas(state) >= reglaNumero(state, 'rupturasPorTurno', { jugador: state.turno })

/** Tras romper un Vínculo no se ataca más ese turno, salvo que la regla `atacarTrasRuptura` lo permita (§9.4). */
const atacarBloqueadoPorRuptura = (state: GameState): boolean =>
  rupturasHechas(state) > 0 && !reglaBool(state, 'atacarTrasRuptura', { jugador: state.turno })

/** Rival del jugador activo: el DEFENSOR en el Choque del turno en curso. */
export const rivalDe = (state: GameState): PlayerId => (state.turno === 'A' ? 'B' : 'A')

/**
 * Controlador actual de una instancia = jugador en cuyo campo de Campeones está
 * (D2: al robar control la instancia se MUEVE de campo; owner NO cambia).
 * Necesario para al-matar-en-combate: el killer puede morir en la MISMA
 * resolución y dejar el campo antes de su dispatch (snapshot pre-muertes).
 */
function controladorDe(s: GameState, id: string): PlayerId | null {
  for (const j of ['A', 'B'] as PlayerId[]) {
    if (s.players[j].campo.campeones.includes(id)) return j
  }
  return null
}

/**
 * Atacantes elegibles del jugador activo (9.2): Campeones enderezados (no
 * agotados) y sin invocación cansada (entraron este turno), salvo que la regla
 * `invocacionCansada` esté prohibida (keyword Carga, §10). Doble ataque activo
 * (Fase 2b, FB-015: "puede declarar 2 veces ataque mientras ese Éter esté
 * bloqueado"): la segunda declaración pese al agotamiento del primer ataque; la
 * invocación cansada del turno SÍ aplica, el doble ataque no la anula.
 * La regla `primerTurnoSinAtaques` prohíbe atacar en el primer turno del juego (§8.6).
 */
export function atacantesElegibles(state: GameState): string[] {
  if (state.primerTurno && reglaBool(state, 'primerTurnoSinAtaques')) return []
  if (atacarBloqueadoPorRuptura(state)) return []
  const p = state.players[state.turno]
  return p.campo.campeones.filter((id): id is string => {
    if (!id) return false
    const inst = state.instances[id]
    if (!inst) return false
    const doubleActivo = tieneDoubleAttackActivo(state, id)
    if (inst.atacoEsteTurno && !doubleActivo) return false
    if (inst.agotado) {
      // Doble ataque activo + ya atacó al menos una vez → puede declarar otra
      if (!(doubleActivo && inst.atacoEsteTurno)) return false
    }
    // Invocación cansada (§9.2): no ataca el turno en que entró (≠ agotado)
    if (inst.entradaEsteTurno && reglaBool(state, 'invocacionCansada', { instId: id })) return false
    return true
  })
}

/**
 * La Ruptura es FORZOSA (§9.4): hay una pendiente si ya se resolvió el combate, quedan
 * Rupturas por turno, algún atacante vivo quedó sin bloquear y el defensor tiene un Vínculo vivo.
 */
function rupturaPendiente(s: GameState): boolean {
  const combate = s.combate
  if (!combate || combate.paso !== 'resolucion' || rupturasAgotadas(s)) return false
  const hayVinculoVivo = s.players[rivalDe(s)].vinculos.some((id) => !!id && !s.instances[id]?.bocaArriba)
  if (!hayVinculoVivo) return false
  return ataquesSinBloquear(s).some((id) => s.players[s.turno].campo.campeones.includes(id))
}

/**
 * Cierra la sub-máquina de combate si algún atacante SOBREVIVIENTE tiene
 * doble ataque activo (Fase 2b): permite declarar una segunda ola de ataque
 * en el mismo turno de Choque. Si nadie tiene doble ataque, el combate
 * persiste hasta salir de Choque (Ruptura/pasar_turno) — comportamiento previo.
 * Con una Ruptura pendiente NO se cierra: primero se rompe el Vínculo (§9.4) y
 * después ya no se puede atacar (regla `atacarTrasRuptura`).
 */
export function cerrarCombateSiDoubleAttack(s: GameState): void {
  const combate = s.combate
  if (!combate) return
  if (rupturaPendiente(s)) return
  const dobles = combate.atacantes.some(
    (id) =>
      s.players[s.turno].campo.campeones.includes(id) &&
      tieneDoubleAttackActivo(s, id),
  )
  if (dobles) s.combate = undefined
}

/**
 * Bloqueadores disponibles del DEFENSOR: Campeones enderezados (§9.3). Uno cansado
 * (recién invocado) SÍ bloquea; uno agotado NO, salvo que la regla `agotadoPuedeBloquear`
 * lo permita. Cada Campeón bloquea `bloqueosPorTurno` veces por turno (no por combate).
 */
export function bloqueadoresDisponibles(state: GameState): string[] {
  const defensor = rivalDe(state)
  const p = state.players[defensor]
  return p.campo.campeones.filter((id): id is string => {
    if (id === null) return false
    const inst = state.instances[id]
    if (!inst) return false
    if ((inst.bloqueosEsteTurno ?? 0) >= reglaNumero(state, 'bloqueosPorTurno', { instId: id })) return false
    return !inst.agotado || reglaBool(state, 'agotadoPuedeBloquear', { instId: id })
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
  if (state.primerTurno && reglaBool(state, 'primerTurnoSinAtaques')) return 'nadie ataca en el primer turno (§8.6)'
  if (atacarBloqueadoPorRuptura(state)) return 'no se puede atacar después de una Ruptura (§9.4)'
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
    rupturaUsadaEsteTurno: rupturasAgotadas(s),
  }
  for (const id of atacanteIds) {
    const inst = s.instances[id]
    // Ya atacó este turno (un ataque por turno; cierra re-ataque Carga/Vigor)
    inst.atacoEsteTurno = true
    // Agotar AL DECLARAR (§9.2) salvo que la regla `atacarAgota` esté prohibida (Vigor, §10)
    if (reglaBool(s, 'atacarAgota', { instId: id })) inst.agotado = true
    // Recarga (§10): 1 Éter bloqueado del atacante vuelve a la Reserva 2A
    // del PAGADOR (Fase 2 (f)) — y si era el último de una fuente steal,
    // evaluarFinSteal termina el robo.
    if (tieneKeyword(s, id, 'Recarga') && inst.eterBloqueado && inst.eterBloqueado.length > 0) {
      const eter = inst.eterBloqueado.shift()!
      const pagador = s.instances[eter]?.pagadoPor ?? inst.owner
      const e = s.instances[eter]
      if (e) {
        delete e.bloqueadoPorEfecto
        delete e.pagadoPor
      }
      s.players[pagador].eterReserva.push(eter)
      ctx.emit({ type: 'eter_reagrupado', jugador: pagador, eterIds: [eter] })
      evaluarFinSteal(s, ctx, id)
    }
  }
  ctx.emit({ type: 'ataque_declarado', jugador: s.turno, atacanteIds })
  // C3 (D5): al-atacar se dispara con los atacantes YA declarados (antes de la cadena)
  dispararTrigger(s, ctx, 'al-atacar', s.turno, atacanteIds)
  // C4 (9.6): el DEFENSOR responde primero (§9.6) — si tiene respondibles la
  // cadena se abre y el auto-avance 9.3 queda DIFERIDO hasta cerrarla.
  if (abrirCadena(s, rivalDe(s))) return
  // Auto-avance (9.3, ADR-11): defensor sin enderezados → resolución sin
  // evento bloqueo_declarado (los ataques quedan sin bloquear)
  if (bloqueadoresDisponibles(s).length === 0) {
    s.combate.paso = 'resolucion'
    resolverCombate(s, ctx) // sin pares: sin muertes
    // Fase 2b: doble ataque activo → cerrar combate para permitir 2da ola
    cerrarCombateSiDoubleAttack(s)
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
    if (bloqueadoresUsados.has(bloqueadorId)) return 'un bloqueador no puede cubrir 2 ataques (§9.3)'
    bloqueadoresUsados.add(bloqueadorId)
  }
  return null
}

export function ejecutarDeclararBloqueo(s: GameState, asignaciones: Record<string, string>, ctx: Ctx): void {
  const combate = s.combate!
  combate.bloqueos = { ...combate.bloqueos, ...asignaciones }
  for (const bloqueadorId of Object.values(asignaciones)) {
    const b = s.instances[bloqueadorId]
    if (b) b.bloqueosEsteTurno = (b.bloqueosEsteTurno ?? 0) + 1
  }
  combate.paso = 'resolucion'
  combate.rupturaDisponible = ataquesSinBloquear(s).length > 0
  ctx.emit({ type: 'bloqueo_declarado', jugador: rivalDe(s), asignaciones })
  // F5c (9.6): el bloqueo abre ventana ANTES del daño. La prioridad inicial es del
  // DEFENSOR (F3, §9.6: responde primero para activar efectos antes de la resolución)
  // y luego alterna. El daño queda pendiente hasta cerrar la cadena
  // (continuarCombateTrasCadena) y se resuelve con el estado vigente al cierre.
  if (abrirCadena(s, rivalDe(s))) {
    combate.danoPendiente = true
    return
  }
  // Gate cerrado: sin ventana. Resolución (9.4-B, ADR-11/14): daño simultáneo EN LA TRANSICIÓN
  resolverCombate(s, ctx)
}

/* ─────────────────── resolución: daño simultáneo (9.4-B, ADR-14) ─────────────────── */

/**
 * Daño simultáneo (9.4-B, §9.4-B): con los pares atacante→bloqueador ya
 * fijados, decide TODAS las muertes sobre el estado PRE-daño (sin cascadas,
 * ADR-14; el daño no persiste, §9.4-B) y las aplica en orden determinista
 * (atacantes, luego bloqueadores) vía destruirCarta('combate') → 2G + Éter
 * 1A + carta_muerta + destruccion. Stats consultados vía statsDe (C1, ADR-20):
 * base meta + override de instancia + Σ modificadores + auras de campo (C3b).
 * C3 (D5): por cada muerte CONFIRMADA se dispara al-matar-en-combate con
 * payloadExtra { killerId, victimaId } y jugador = controlador del killer.
 */
function resolverCombate(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  if (!combate) return
  const muertosAtacantes: string[] = []
  const muertosBloqueadores: string[] = []
  const killerDe = new Map<string, string>() // victimaId → killerId (C3 D5)
  for (const atacante of combate.atacantes) {
    const bloqueador = combate.bloqueos[atacante]
    if (!bloqueador) continue // sin bloquear: no hay daño (Ruptura, no muerte)
    // F5c: durante la ventana de respuesta pudo salir de la zona alguno de los dos
    // (muerte, rebote, exilio, robo de control): ese par ya no intercambia daño.
    if (!s.players[s.turno].campo.campeones.includes(atacante)) continue
    if (!s.players[rivalDe(s)].campo.campeones.includes(bloqueador)) continue
    // Ambos deciden con el estado PRE-daño (los stats no cambian: sin marcas)
    const statsAtacante = statsDe(s, atacante)
    const statsBloqueador = statsDe(s, bloqueador)
    if (statsAtacante.poder >= statsBloqueador.resistencia) {
      muertosBloqueadores.push(bloqueador)
      killerDe.set(bloqueador, atacante)
    }
    if (statsBloqueador.poder >= statsAtacante.resistencia) {
      muertosAtacantes.push(atacante)
      killerDe.set(atacante, bloqueador)
    }
  }
  // C3 (D5): snapshot del controlador del killer PRE-muertes — el killer puede
  // morir en la misma resolución y quedar fuera del campo antes de su dispatch.
  const controladores = new Map<string, PlayerId>()
  for (const id of [...muertosAtacantes, ...muertosBloqueadores]) {
    const killerId = killerDe.get(id)
    if (killerId && !controladores.has(killerId)) {
      const c = controladorDe(s, killerId)
      if (c) controladores.set(killerId, c)
    }
  }
  for (const id of [...muertosAtacantes, ...muertosBloqueadores]) {
    const killerId = killerDe.get(id)
    const jugador = killerId ? controladores.get(killerId) : undefined
    // C3 (D5): al-matar-en-combate SOLO si la muerte se CONFIRMÓ (post-muerte).
    // Instancias = [víctima, killer]: los handlers keyed por el cardId del
    // ASESINO (C3c DS-012 Draven) también deben disparar.
    if (destruirCarta(s, ctx, id, 'combate') && killerId && jugador) {
      dispararTrigger(s, ctx, 'al-matar-en-combate', jugador, [id, killerId], { killerId, victimaId: id })
    }
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
  if (!combate || s.fase !== 'choque') return
  // F5c: tras la ventana del bloqueo se resuelve el daño con el estado vigente;
  // la Ruptura pendiente queda como en el flujo normal (una por turno, F3).
  if (combate.paso === 'resolucion') {
    if (combate.danoPendiente) {
      delete combate.danoPendiente
      resolverCombate(s, ctx)
    }
    return
  }
  // F5c: el ataque sigue vigente solo con los atacantes que siguen en el campo;
  // si una respuesta los sacó a todos, el ataque se anula y el combate se cierra.
  if (combate.paso === 'bloqueo') {
    combate.atacantes = combate.atacantes.filter((id) => s.players[s.turno].campo.campeones.includes(id))
    if (combate.atacantes.length === 0) {
      s.combate = undefined
      return
    }
  }
  if (combate.paso === 'bloqueo' && bloqueadoresDisponibles(s).length === 0) {
    combate.paso = 'resolucion'
    resolverCombate(s, ctx) // sin pares: sin muertes
    // Fase 2b: doble ataque activo → cerrar combate para permitir 2da ola
    cerrarCombateSiDoubleAttack(s)
  }
}

/* ─────────────────── Ruptura (9.4-A, FORZOSA — decisión 2026-10-14) ───────────────────
 * Cambio de regla (manual §9.4): la Ruptura ya NO es voluntaria. Si un ataque
 * fue declarado y el defensor no tiene forma de bloquearlo, romper 1 Vínculo
 * es OBLIGATORIO — la única forma voluntaria de no romper es NO ATACANDO.
 * Por lo tanto atacanteId: null ("no romper") ya NO es una acción válida. */

export function validarElegirRuptura(state: GameState, atacanteId: string | null, vinculoSlot?: number): string | null {
  if (state.fase !== 'choque') return 'elegir_ruptura solo en Choque'
  const combate = state.combate
  if (!combate || combate.paso !== 'resolucion') return 'no hay resolución pendiente'
  if (rupturasAgotadas(state)) return 'ya hiciste la Ruptura de este turno (§9.4)'
  if (atacanteId === null) {
    // Ruptura forzosa (§9.4): no existe "no romper" — la elección se hace al atacar
    return 'la Ruptura es obligatoria si hay un ataque sin bloquear (§9.4)'
  }
  if (!combate.rupturaDisponible) return 'no hay ataques sin bloquear para romper'
  if (!combate.atacantes.includes(atacanteId)) return 'no es un atacante declarado'
  if (atacanteId in combate.bloqueos) return 'el ataque fue bloqueado: no rompe (§9.4-B)'
  if (!state.players[state.turno].campo.campeones.includes(atacanteId)) return 'el atacante murió'
  if (vinculoSlot === undefined || vinculoSlot < 0 || vinculoSlot > 5) return 'vinculoSlot 0-5'
  const vinculoId = state.players[rivalDe(state)].vinculos[vinculoSlot]
  if (!vinculoId) return 'no hay Vínculo vivo en ese slot'
  if (state.instances[vinculoId]?.bocaArriba) return 'el Vínculo ya fue destruido'
  return null
}

export function ejecutarElegirRuptura(s: GameState, atacanteId: string | null, vinculoSlot: number | undefined, ctx: Ctx): void {
  // Ruptura forzosa (§9.4): la validación ya rechazó atacanteId === null
  if (atacanteId === null || vinculoSlot === undefined) return
  const vinculoId = s.players[rivalDe(s)].vinculos[vinculoSlot]!
  ctx.emit({ type: 'ruptura_realizada', atacanteId, vinculoSlot, vinculoId })
  destruirCarta(s, ctx, vinculoId, 'ruptura')
  s.rupturasEsteTurno = rupturasHechas(s) + 1
  if (s.combate) s.combate.rupturaUsadaEsteTurno = rupturasAgotadas(s)
  // Fase 2b: si algún atacante sobreviviente tiene doble ataque activo,
  // cerrar el combate para permitir la segunda ola en el mismo turno.
  cerrarCombateSiDoubleAttack(s)
  // Sin doble ataque: NO borramos s.combate aquí — que pasar_turno lo limpie
  // al salir de Choque. Si lo borramos, validarDeclararAtaque permite un
  // nuevo combate en el mismo turno (comportamiento previo al doble ataque).
}
