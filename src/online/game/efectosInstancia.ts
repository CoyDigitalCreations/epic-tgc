/**
 * Efectos VIGENTES de una carta en juego: los impresos más los que copió de otro Campeón (`copy` con «efecto»,
 * `GameState.efectosPrestados`). Los efectos prestados se agregan AL FINAL, así que los índices de los impresos no cambian
 * y los de los prestados son los siguientes (efectoIdx, objetivos elegidos y opener siguen siendo posiciones de este array).
 *
 * El motor debe leer los efectos de una carta EN JUEGO por aquí (`metaDeInstancia`) y no con `getCardMeta(cardId)`: así
 * una copia es un efecto más, sin ramas especiales. Módulo hoja: solo lee el catálogo y el estado.
 */
import type { AnyCard, EfectoData } from '../../shared/types'
import { esCostoBloqueo, getCardMeta } from './cards'
import type { GameState } from './types'

/**
 * ¿Se puede copiar este efecto de un Campeón? Pasivos, continuos y Disparos, NO el de Comandante (inmutable, §10). Quedan fuera
 * los que bloquean Éter (el Éter bloqueado dura más que la copia y quedaría etiquetado con un efecto que ya no existe) y los
 * `copy` (copiar una copia no aporta nada y se enreda).
 */
export function esEfectoCopiable(efecto: EfectoData): boolean {
  if (efecto.tipo !== 'pasivo' && efecto.tipo !== 'continuo' && efecto.tipo !== 'disparo') return false
  if (efecto.efecto === 'copy') return false
  if (esCostoBloqueo(efecto.costo) || efecto.tramos?.length) return false
  return true
}

/* ───────── Continuos con coste de Éter bloqueado ───────── */

/** Éteres que deben seguir bloqueados para que un efecto de bloqueo valga: el umbral del coste, el coste exacto si es fijo, o 1. */
export function umbralDeBloqueo(efecto: EfectoData): number {
  return efecto.costo?.umbral ?? (efecto.costo?.tipo === 'bloqueo_fijo' ? efecto.costo.cantidad : undefined) ?? 1
}

/** Un Continuo cuyo coste bloquea Éter: dura mientras ese Éter siga bloqueado. */
export function esContinuoDeBloqueo(efecto: EfectoData): boolean {
  return efecto.tipo === 'continuo' && esCostoBloqueo(efecto.costo)
}

/**
 * Cómo se comporta el efecto RAÍZ de un Continuo de bloqueo (sin tramos) al alcanzar su umbral:
 *  - `sostenido`: vale MIENTRAS el Éter siga bloqueado (buff, debuff y keyword sin duración propia, y fix_exhaust). Con
 *    objetivo «tú mismo / todos tus Campeones / todos los rivales» es un aura derivada; con «un Campeón» se elige al bloquear.
 *  - `instantaneo`: ocurre UNA vez al alcanzar el umbral (destroy, exile, draw, ...); se rearma al liberar el Éter.
 *  - `propio`: tiene su sistema (robo, doble ataque, prevenir destrucción, reglas, copia, invocar y equipar) o necesita una
 *    pila (redirect, negar una activación): no pasa por aquí.
 */
export type ClaseContinuo = 'sostenido' | 'instantaneo' | 'propio'

const SISTEMA_PROPIO = new Set([
  'steal_champion', 'invocar_y_equipar', 'double_attack', 'prevent_destroy', 'modificar_regla', 'direct_attack', 'copy', 'block_ether', 'redirect',
])
const SOSTENIBLES = new Set(['buff', 'debuff', 'grant_keyword'])

export function claseDeContinuo(efecto: EfectoData): ClaseContinuo {
  const accion = efecto.efecto
  if (!accion || SISTEMA_PROPIO.has(accion)) return 'propio'
  if (accion === 'negar' && efecto.tipoNegacion !== 'efecto_activo') return 'propio' // negar una activación necesita la pila
  if (accion === 'fix_exhaust') return 'sostenido'
  if (SOSTENIBLES.has(accion) && (efecto.duracion === undefined || efecto.duracion === 'mientras_ester_bloqueado')) return 'sostenido'
  return 'instantaneo'
}

/** Efectos cuyo «objetivo» solo DESCRIBE de dónde sale algo: no se elige (mismo criterio que `needsPlayerChoice` del intérprete). */
const SIN_ELECCION = new Set(['draw', 'scry', 'rival_discard', 'block_ether', 'double_attack'])

/** ¿El objetivo del efecto se ELIGE («un Campeón...») o está fijado por el propio efecto (tú mismo, todos, robar...)? */
export function eligeObjetivo(efecto: EfectoData): boolean {
  if (!efecto.efecto || SIN_ELECCION.has(efecto.efecto)) return false
  if (efecto.efecto === 'negar' && efecto.tipoNegacion !== 'efecto_activo') return false
  const tipo = efecto.objetivo?.tipo
  return !!tipo && !['self', 'todos_campeones_propios', 'todos_campeones_rivales', 'equipped_champion', 'rival_hand'].includes(tipo)
}

/** Los efectos que `instId` tiene prestados ahora, en el orden en que los copió. */
export function efectosPrestadosDe(s: GameState, instId: string): EfectoData[] {
  const lista = s.efectosPrestados
  if (!lista?.length) return []
  return lista.filter((p) => p.instId === instId).flatMap((p) => p.efectos)
}

/**
 * La carta de la instancia con sus efectos vigentes (impresos + prestados). Si no tiene prestados devuelve la MISMA carta del
 * catálogo (sin copiar nada), así que es barato en el caso normal.
 */
export function metaDeInstancia(s: GameState, instId: string): AnyCard | null {
  const cardId = s.instances[instId]?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  if (!meta || !('efectos' in meta)) return meta
  const prestados = efectosPrestadosDe(s, instId)
  if (prestados.length === 0) return meta
  return { ...meta, efectos: [...(meta.efectos ?? []), ...prestados] } as AnyCard
}
