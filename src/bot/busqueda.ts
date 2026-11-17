/**
 * Búsqueda de poca profundidad sobre el motor (puro y determinista: `applyAction` clona el estado, no lo muta).
 *
 * - En un nodo donde decide `yo` se toma la MEJOR acción; donde decide el rival, la PEOR para `yo` (minimax): así un ataque
 *   se valora contra la mejor defensa posible, no contra una regla fija.
 * - La búsqueda se corta en el primer estado «libre» (alguien puede jugar a gusto: Forja, Choque sin combate u Ocaso) y se evalúa.
 * - Se simula con un RNG de mentira: nunca se toca el flujo aleatorio real de la partida.
 */
import { actorActual, applyAction, getValidActions, statsDe } from '../online/game'
import type { Action, Ctx, GameState, PlayerId } from '../online/game'
import { evaluar, PESOS } from './evaluar'
import type { Pesos } from './evaluar'

/** RNG de mentira para simular: constante, sin eventos. */
function ctxSimulado(): Ctx {
  return { next: () => 0.5, emit: () => {}, events: [], draws: 0 }
}

export function simular(s: GameState, a: Action): GameState | null {
  const r = applyAction(s, a, ctxSimulado())
  return r.ok ? r.state : null
}

/** Acciones que el bot nunca juega por su cuenta. */
export const esUtil = (a: Action): boolean => a.type !== 'rendirse' && a.type !== 'usar_transmutar'

/**
 * Quita alternativas equivalentes que solo multiplicarían la búsqueda: los distintos Éter con que se paga el mismo bloqueo, y los
 * distintos Vínculos que puede romper un atacante (el slot se elige a ciegas: da igual cuál).
 */
export function sinRepetidos(acciones: Action[]): Action[] {
  const vistas = new Set<string>()
  return acciones.filter((a) => {
    const clave =
      a.type === 'bloquear_eter' ? `bloq:${a.targetInstanceId}:${a.efectoIdx ?? ''}`
      : a.type === 'elegir_ruptura' ? `rupt:${a.atacanteId}`
      : null
    if (clave === null) return true
    if (vistas.has(clave)) return false
    vistas.add(clave)
    return true
  })
}

/**
 * Los subconjuntos de atacantes que merece la pena considerar: el motor ofrece los 2^n-1, pero casi todo el valor está en
 * atacar con todos, con todos menos uno, con los N más fuertes o con uno solo.
 */
export function atacantesRelevantes(s: GameState, acciones: Action[]): Action[] {
  const ataques = acciones.filter((a): a is Extract<Action, { type: 'declarar_ataque' }> => a.type === 'declarar_ataque')
  if (ataques.length <= 6) return acciones
  const todos = ataques.reduce((m, a) => (a.atacanteIds.length > m.length ? a.atacanteIds : m), [] as string[])
  const porPoder = [...todos].sort((x, y) => statsDe(s, y).poder - statsDe(s, x).poder)
  const permitidos = new Set<string>()
  const clave = (ids: string[]) => [...ids].sort().join('|')
  for (let k = 1; k <= porPoder.length; k++) permitidos.add(clave(porPoder.slice(0, k)))
  for (const id of todos) { permitidos.add(clave([id])); permitidos.add(clave(todos.filter((x) => x !== id))) }
  return acciones.filter((a) => a.type !== 'declarar_ataque' || permitidos.has(clave(a.atacanteIds)))
}

/**
 * Acciones del RIVAL que solo existen porque tiene información oculta para quien busca: una respuesta que sale de su mano
 * (`jugar_respuesta`) o de una carta suya boca abajo (`responder_cadena`, `activar_arcana`). Bloquear, pasar prioridad o activar la
 * habilidad de un Campeón en mesa son públicas: se deducen del tablero.
 */
export const ACCIONES_CON_INFO_OCULTA: ReadonlySet<Action['type']> = new Set<Action['type']>(['jugar_respuesta', 'responder_cadena', 'activar_arcana'])

/**
 * Lo que un jugador real puede suponer que hará el rival: sin sus cartas ocultas. Si no queda nada público (no debería pasar: en una
 * ventana siempre se puede pasar prioridad) se devuelve la lista entera para no dejar la búsqueda sin salida.
 */
export function soloPublicas(acciones: Action[]): Action[] {
  const publicas = acciones.filter((a) => !ACCIONES_CON_INFO_OCULTA.has(a.type))
  return publicas.length > 0 ? publicas : acciones
}

/** Jugada «libre»: el que actúa elige a gusto (no es una respuesta forzosa a algo pendiente). */
export function esLibre(s: GameState, acciones: Action[]): boolean {
  return !s.combate && acciones.some((a) => a.type === 'pasar_turno')
}

export interface Config {
  pesos: Pesos
  /** Profundidad máxima (en pasos del motor) de la búsqueda tras la acción raíz. */
  profundidad: number
  /** Máximo de alternativas que se exploran en un nodo del RIVAL (acota la explosión de bloqueos). */
  anchoRival: number
  /** Simulaciones máximas por decisión (se reparten entre las alternativas del nodo raíz). Hace el coste predecible y determinista. */
  presupuesto: number
  /** Probabilidad (0-1) de elegir al azar una de las 3 mejores jugadas en vez de la mejor: es lo que baja el nivel. Determinista. */
  ruido: number
  /**
   * Experimento de información oculta. Con `true`, en los nodos del RIVAL la búsqueda no considera respuestas que salen de su mano
   * ni de sus cartas boca abajo (ver `soloPublicas`): asume que pasa prioridad, como lo haría quien no puede ver esas cartas.
   * Por defecto (ausente/false) el rival se explora con sus acciones reales, que incluyen lo oculto.
   */
  infoPublica?: boolean
  /**
   * Completar el turno al llegar a un estado libre MÍO (ver `completarTurno`). Sin esto la búsqueda corta en el primer estado libre y
   * evalúa en el acto, así que un efecto que rinde en el combate de ESTE turno (un truco «hasta el final del turno», una Carga, un
   * Inmortal, +ATQ, un Campeón recién invocado con Carga) es invisible: solo se ven los stats permanentes. Con `true` se simula también
   * pasar a Choque y el mejor ataque, y se evalúa el resultado real, para CUALQUIER carta sin describir cuánto vale cada efecto.
   * Cuesta más simulaciones por decisión: súbele el `presupuesto`. Por defecto (ausente/false) la búsqueda es la de siempre.
   */
  continuarTurno?: boolean
}

/** Contador mutable de simulaciones que le quedan a UNA alternativa raíz. */
export interface Gasto { restante: number }

export const CONFIG: Config = { pesos: PESOS, profundidad: 7, anchoRival: 3, presupuesto: 1500, ruido: 0 }

/** El Difícil completando el turno en la búsqueda (ver `Config.continuarTurno`). Presupuesto doble: cada alternativa simula también el ataque. */
export const CONFIG_CONTINUO: Config = { ...CONFIG, continuarTurno: true, presupuesto: 3000 }

/** Valor para `yo` del estado `s`, buscando `prof` pasos más. */
export function valor(s: GameState, yo: PlayerId, prof: number, cfg: Config, gasto: Gasto): number {
  if (s.fase === 'terminada' || prof <= 0 || gasto.restante <= 0) return evaluar(s, yo, cfg.pesos)
  const actor: PlayerId = actorActual(s) ?? s.turno
  const acciones = sinRepetidos(getValidActions(s, actor).filter(esUtil))
  if (acciones.length === 0) return evaluar(s, yo, cfg.pesos)
  if (esLibre(s, acciones)) {
    // Hoja: alguien juega a gusto. Si es mi turno y la opción está activa, no se evalúa en frío: se completa el turno para ver lo que rinde
    if (cfg.continuarTurno && actor === yo && prof > 0) return completarTurno(s, yo, prof, cfg, gasto)
    return evaluar(s, yo, cfg.pesos)
  }

  const mio = actor === yo
  const candidatas = mio ? acciones : (cfg.infoPublica ? soloPublicas(acciones) : acciones).slice(0, cfg.anchoRival)
  let mejor = mio ? -Infinity : Infinity
  for (const a of candidatas) {
    gasto.restante--
    const n = simular(s, a)
    if (!n) continue
    const v = valor(n, yo, prof - 1, cfg, gasto)
    if (mio ? v > mejor : v < mejor) mejor = v
  }
  return Number.isFinite(mejor) ? mejor : evaluar(s, yo, cfg.pesos)
}

/**
 * Valor de un estado LIBRE mío (Forja o Choque sin combate) completando el turno: desde Forja se pasa a Choque, y en Choque se toma lo
 * mejor entre no atacar (evaluar tal cual) y cada ataque relevante, que la búsqueda de siempre resuelve contra la mejor defensa del
 * rival. Así un truco, una Carga o un +ATQ que solo importan en el combate de este turno se evalúan por lo que DE VERDAD logran.
 *
 * Se aplica igual a TODAS las alternativas (jugar algo, invocar o pasar), así que ninguna sale favorecida: lo que cambia es que ahora
 * todas se miden después de su mejor ataque. No recursiona sin fin: cada paso resta profundidad y un estado con combate (o en Ocaso)
 * se evalúa sin más.
 */
function completarTurno(s: GameState, yo: PlayerId, prof: number, cfg: Config, gasto: Gasto): number {
  let actual = s
  if (actual.fase === 'forja') {
    const siguiente = simular(actual, { type: 'pasar_turno' })
    if (!siguiente) return evaluar(s, yo, cfg.pesos)
    actual = siguiente
  }
  if (actual.fase !== 'choque' || actual.combate || (actorActual(actual) ?? actual.turno) !== yo) return evaluar(actual, yo, cfg.pesos)
  const ataques = atacantesRelevantes(actual, sinRepetidos(getValidActions(actual, yo).filter(esUtil))).filter((a) => a.type === 'declarar_ataque')
  let mejor = evaluar(actual, yo, cfg.pesos) // no atacar
  for (const a of ataques) {
    if (gasto.restante <= 0) break
    gasto.restante--
    const n = simular(actual, a)
    if (!n) continue
    mejor = Math.max(mejor, valor(n, yo, prof - 1, cfg, gasto))
  }
  return mejor
}

/** Valor de jugar `a` ahora (desde un estado donde actúa `yo`). */
export function valorDe(s: GameState, a: Action, yo: PlayerId, cfg: Config, alternativas = 1): number {
  const n = simular(s, a)
  const gasto: Gasto = { restante: Math.max(40, Math.floor(cfg.presupuesto / Math.max(1, alternativas))) }
  return n ? valor(n, yo, cfg.profundidad, cfg, gasto) : -Infinity
}
