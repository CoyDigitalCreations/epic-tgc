/**
 * Poder de los EFECTOS de una carta, para que el bot distinga a una estratega (Ragnar, Aurora) de un Campeón cualquiera de su mismo coste.
 *
 * No hay ninguna tabla por carta: se reutiliza el índice de poder del Tablero de balance (`poderDeCarta`: verbo × tipo × trigger ×
 * activación × duración × objetivo, más keywords y costo), que ya puntúa CUALQUIER efecto del catálogo, también los de cartas futuras.
 * Una carta sin efectos ni keywords vale 0, así que los Campeones vanilla no se mueven.
 */
import { getCardMeta } from '../online/game'
import type { AnyCard } from '../shared/types'
import { cargarCartas } from '../balance/cargador'
import { poderDeCarta } from '../balance/poderEfecto'

/** Por objeto de carta (no por id): `registrarCartas` puede reemplazar una carta con el mismo id por otra distinta. */
const cache = new WeakMap<AnyCard, number>()

/** Índice de poder de los efectos (y keywords impresas) de la carta; 0 si no existe en el catálogo. */
export function poderEfectoDe(cardId: string | undefined | null): number {
  if (!cardId) return 0
  const meta = getCardMeta(cardId)
  if (!meta) return 0
  const guardado = cache.get(meta)
  if (guardado !== undefined) return guardado
  const [carta] = cargarCartas([meta]).cartas
  const poder = carta ? poderDeCarta(carta).indice : 0
  cache.set(meta, poder)
  return poder
}
