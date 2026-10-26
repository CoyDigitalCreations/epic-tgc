/**
 * Catálogo de reglas base del juego (Capa 1: el manual) y su resolución.
 *
 * Doctrina de capas: el manual es el valor BASE y el fallback de cada regla; un efecto de carta
 * (Capa 2) puede modificarla y, si lo hace, gana. Este módulo es puro y compartido: lo usan el
 * motor (reglaVigente) y el Card-Maker (para ofrecer las reglas en su formulario).
 *
 * Para agregar una regla: una entrada en REGLAS con la sección del manual que la define. El motor
 * la consume SIEMPRE vía reglaVigente — nunca con un literal.
 */

/** A quién afecta una regla: `sujeto` de reglaVigente. */
export type AmbitoRegla = 'partida' | 'jugador' | 'campeon' | 'carta'

export interface DefRegla {
  /** Nombre legible (Card-Maker, logs). */
  etiqueta: string
  /** Sección del manual que fija el valor base. */
  manual: string
  ambito: AmbitoRegla
  /** El valor del manual: el fallback cuando nada la modifica. */
  base: number | boolean
  /** Solo numéricas: cotas del resultado. */
  min?: number
  max?: number
}

export const REGLAS = {
  /* ── partida ── */
  primerTurnoSinAtaques: { etiqueta: 'Nadie ataca en el primer turno del juego', manual: '§8.6', ambito: 'partida', base: true },

  /* ── jugador ── */
  limiteMano: { etiqueta: 'Límite de mano', manual: '§7.1, §8.5', ambito: 'jugador', base: 6, min: 0 },
  cartasPorAlba: { etiqueta: 'Cartas que se roban en el Alba', manual: '§8.2', ambito: 'jugador', base: 1, min: 0 },
  rupturasPorTurno: { etiqueta: 'Vínculos que rompe la Ruptura por turno', manual: '§9.4', ambito: 'jugador', base: 1, min: 0 },
  atacarTrasRuptura: { etiqueta: 'Se puede seguir atacando tras romper un Vínculo', manual: '§9.4', ambito: 'jugador', base: false },
  derrotaPorVinculos: { etiqueta: 'Pierde la partida al quedarse sin Vínculos', manual: '§13', ambito: 'jugador', base: true },

  /* ── campeón ── */
  agotadoPuedeBloquear: { etiqueta: 'Un Campeón agotado puede bloquear', manual: '§9.3', ambito: 'campeon', base: false },
  invocacionCansada: { etiqueta: 'No ataca el turno en que es invocado', manual: '§9.2', ambito: 'campeon', base: true },
  atacarAgota: { etiqueta: 'Atacar agota al Campeón', manual: '§9.2', ambito: 'campeon', base: true },
  disparoAgota: { etiqueta: 'Un Disparo con Éter pagado agota al Campeón', manual: '§5.2, §8.3a', ambito: 'campeon', base: true },
  ataquesPorTurno: { etiqueta: 'Ataques por turno', manual: '§9.2', ambito: 'campeon', base: 1, min: 0 },
  bloqueosPorTurno: { etiqueta: 'Bloqueos por turno', manual: '§9.3', ambito: 'campeon', base: 1, min: 0 },
  puedeSerExiliada: { etiqueta: 'Puede ser exiliada', manual: '§10', ambito: 'campeon', base: true },
  puedeSerDestruidaPorEfecto: { etiqueta: 'Puede ser destruida por efectos', manual: '§10', ambito: 'campeon', base: true },
  puedeSerDestruidaEnBatalla: { etiqueta: 'Puede ser destruida en batalla', manual: '§10', ambito: 'campeon', base: true },

  /* ── carta ── */
  eterBloqueadoExtra: { etiqueta: 'Éter bloqueado extra sobre el tope del efecto', manual: '§7.7', ambito: 'carta', base: 0, min: 0 },
} as const satisfies Record<string, DefRegla>

export type ReglaId = keyof typeof REGLAS
export const REGLA_IDS = Object.keys(REGLAS) as ReglaId[]

/**
 * - `fijar`: el valor pasa a ser `valor` (numéricas). Si hay varios, gana el más reciente.
 * - `sumar`: suma `valor` (puede ser negativo) sobre el resultado (numéricas).
 * - `permitir` / `prohibir`: booleanas. **Lo que prohíbe gana a lo que permite.**
 */
export type OperacionRegla = 'fijar' | 'sumar' | 'permitir' | 'prohibir'

/** Un cambio a una regla. `orden` desempata los `fijar` (mayor = más reciente). */
export interface ModificadorRegla {
  regla: ReglaId
  operacion: OperacionRegla
  valor?: number
  orden: number
}

/** Un efecto de carta que modifica una regla (parte del esquema EfectoData). */
export interface ModificacionRegla {
  id: ReglaId
  operacion: OperacionRegla
  valor?: number
}

export function esReglaNumerica(id: ReglaId): boolean {
  return typeof REGLAS[id].base === 'number'
}

/** Operaciones que tienen sentido para el tipo de la regla (el Card-Maker las valida con esto). */
export function operacionesDe(id: ReglaId): readonly OperacionRegla[] {
  return esReglaNumerica(id) ? ['fijar', 'sumar'] : ['permitir', 'prohibir']
}

/**
 * Valor vigente de una regla: la base del manual con los modificadores aplicados.
 * Los modificadores de OTRA regla o de un tipo que no corresponde se ignoran (nunca rompen).
 */
export function resolverRegla(id: ReglaId, modificadores: readonly ModificadorRegla[]): number | boolean {
  const def: DefRegla = REGLAS[id]
  const propios = modificadores.filter((m) => m.regla === id)

  if (typeof def.base === 'boolean') {
    if (propios.some((m) => m.operacion === 'prohibir')) return false
    if (propios.some((m) => m.operacion === 'permitir')) return true
    return def.base
  }

  let valor: number = def.base
  const fijados = propios.filter((m) => m.operacion === 'fijar' && m.valor !== undefined)
  if (fijados.length > 0) {
    valor = fijados.reduce((a, b) => (b.orden >= a.orden ? b : a)).valor as number
  }
  for (const m of propios) {
    if (m.operacion === 'sumar' && m.valor !== undefined) valor += m.valor
  }
  if (def.min !== undefined) valor = Math.max(def.min, valor)
  if (def.max !== undefined) valor = Math.min(def.max, valor)
  return valor
}

/**
 * Keywords = atajos para una regla modificada. La palabra clave NO tiene lógica propia en el
 * motor: solo declara qué regla del manual cambia.
 */
export const KEYWORD_REGLAS: Readonly<Record<string, readonly Omit<ModificadorRegla, 'orden'>[]>> = {
  Carga: [{ regla: 'invocacionCansada', operacion: 'prohibir' }],
  Vigor: [{ regla: 'atacarAgota', operacion: 'prohibir' }],
  Tirador: [{ regla: 'disparoAgota', operacion: 'prohibir' }],
  Inexiliable: [{ regla: 'puedeSerExiliada', operacion: 'prohibir' }],
  Inmortal: [{ regla: 'puedeSerDestruidaPorEfecto', operacion: 'prohibir' }],
  Indestructible: [{ regla: 'puedeSerDestruidaEnBatalla', operacion: 'prohibir' }],
}
