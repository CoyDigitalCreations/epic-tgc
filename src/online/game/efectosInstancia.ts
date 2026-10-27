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
