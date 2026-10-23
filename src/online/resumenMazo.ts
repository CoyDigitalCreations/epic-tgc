import { RARITIES } from '../shared/types'
import { getCardMeta } from './game'
import { conteosDe } from './mazos'

/** Cuántas cartas del abanico de portada se muestran por mazo. */
export const CARTAS_PORTADA = 5

/**
 * Cartas de portada de un mazo: únicas, Campeones primero y las más raras antes (así la portada
 * muestra lo mejor del mazo y no las primeras cartas de la lista, que suelen ser Éter).
 * A igual peso se respeta el orden del mazo (el sort de Array es estable).
 */
export function cartasDePortada(cardIds: string[], cantidad: number = CARTAS_PORTADA): string[] {
  const unicas = Array.from(new Set(cardIds))
  const peso = (id: string) => {
    const meta = getCardMeta(id)
    const rareza = meta ? RARITIES.indexOf(meta.rarity) : -1
    return (meta?.type === 'Campeón' ? 100 : 0) + rareza
  }
  return [...unicas].sort((a, b) => peso(b) - peso(a)).slice(0, cantidad)
}

export interface ResumenMazo {
  eter: number
  principal: number
  vinculos: number
  campeones: number
  misticas: number
  arcanas: number
}

/** Composición de un mazo: Éter / Principal / Vínculos y el desglose del Principal por tipo. */
export function resumenMazo(cardIds: string[]): ResumenMazo {
  const base = conteosDe(cardIds)
  let campeones = 0
  let misticas = 0
  let arcanas = 0
  for (const id of cardIds) {
    const tipo = getCardMeta(id)?.type
    if (tipo === 'Campeón') campeones += 1
    else if (tipo === 'Mística') misticas += 1
    else if (tipo === 'Arcana') arcanas += 1
  }
  return { ...base, campeones, misticas, arcanas }
}
