import { esCampeon, faccionesCompartidas, getCardMeta } from './cards'
import type { AnyCard } from '../../shared/types'
import type { Rol } from '../../shared/types'
import type { GameState, PlayerId } from './types'

/**
 * Reglas de colocación e invocación (manual 5.1-5.6, 6.1): roles (Soberano =
 * 1 sacrificio / Emperador = 2), Singular (máx 1 copia en campo) y conteos.
 */

/** Sacrificios exigidos por el rol del Campeón: Soberano 1, Emperador 2, resto 0. */
export function sacrificiosRequeridos(roles: Rol[] | undefined): number {
  if (!roles) return 0
  if (roles.includes('Soberano')) return 1
  if (roles.includes('Emperador')) return 2
  return 0
}

/** true si el Campeón es Singular (catHabilidad 'Singular'): solo 1 copia en el campo. */
export function esSingular(card: AnyCard): boolean {
  return card.type === 'Campeón' && card.catHabilidad === 'Singular'
}

/** Copias del cardId presentes en el campo 2B-2F del jugador. */
export function copiasEnCampo(state: GameState, jugador: PlayerId, cardId: string): number {
  const p = state.players[jugador]
  return p.campo.campeones.filter((id) => id !== null && state.instances[id]?.cardId === cardId).length
}

/** Campeones propios en 2B-2F con facción compartida con el Campeón invocado (sacrificables). */
export function campeonesSacrificables(state: GameState, jugador: PlayerId, campeonCardId: string): string[] {
  const meta = getCardMeta(campeonCardId)
  if (!meta) return []
  const p = state.players[jugador]
  return p.campo.campeones.filter((id): id is string => {
    if (!id) return false
    const inst = state.instances[id]
    const m = inst?.cardId ? getCardMeta(inst.cardId) : null
    return m !== null && esCampeon(m) && faccionesCompartidas(m.facciones, meta.facciones)
  })
}
