import { ALL_CARDS, ESTASIS_CARDS, DISONANCIA_CARDS, PURGA_CARDS, MUTACION_CARDS, getPaquete } from '../shared/data/paquetes'
import type { AnyCard } from '../shared/types'
import { getCardMeta } from './game/cards'

/** Expande diseños a copias según limiteCopias (mazo jugable de 66 cardIds). */
function expandirMazo(cards: AnyCard[]): string[] {
  return cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))
}

/** Sets preestablecidos del modo vs bot. */
export type SetId = 'estasis' | 'disonancia' | 'purga' | 'mutacion'

export interface MazoJugable {
  id: SetId
  nombre: string
  color: string
  /** 66 cardIds (15 Éter + 45 Principal + 6 Vínculos) — listo para createInitialState. */
  cardIds: string[]
}

/** Mazos disponibles para el modo vs bot. El humano elige uno; el bot usa el otro. */
export const MAZOS: MazoJugable[] = [
  {
    id: 'estasis',
    nombre: getPaquete('estasis')?.nombre ?? 'Estásis',
    color: getPaquete('estasis')?.color ?? '#e5e7eb',
    cardIds: expandirMazo(ESTASIS_CARDS),
  },
  {
    id: 'disonancia',
    nombre: getPaquete('disonancia')?.nombre ?? 'Disonancia',
    color: getPaquete('disonancia')?.color ?? '#3b82f6',
    cardIds: expandirMazo(DISONANCIA_CARDS),
  },
  {
    id: 'purga',
    nombre: getPaquete('purga')?.nombre ?? 'Purga',
    color: getPaquete('purga')?.color ?? '#ec4899',
    cardIds: expandirMazo(PURGA_CARDS),
  },
  {
    id: 'mutacion',
    nombre: getPaquete('mutacion')?.nombre ?? 'Mutación',
    color: getPaquete('mutacion')?.color ?? '#84cc16',
    cardIds: expandirMazo(MUTACION_CARDS),
  },
]

/** El rival natural de cada set (las parejas espejo del Eje): Estásis↔Disonancia, Purga↔Mutación. */
const RIVAL_DE: Record<SetId, SetId> = { estasis: 'disonancia', disonancia: 'estasis', purga: 'mutacion', mutacion: 'purga' }

export const mazoPorId = (id: string): MazoJugable | undefined => MAZOS.find((m) => m.id === id)

/** Rival elegido a mano: un set oficial concreto, o 'auto' para dejar que el juego decida (ver `mazoParaBot`). */
export type RivalElegido = SetId | 'auto'

/**
 * Mazo del bot:
 * - rival elegido a mano (cualquier set oficial, incluso el mismo del humano) → ese set.
 * - humano con set preestablecido → su pareja espejo (Estásis↔Disonancia, Purga↔Mutación).
 * - humano con mazo personalizado → Estásis o Disonancia, DETERMINISTA desde el seed
 *   (`seed % 2`): mismo seed → mismo rival (reproducibilidad).
 */
export function mazoParaBot(seed: number, humano: SetId | 'custom', rival: RivalElegido = 'auto'): MazoJugable {
  if (rival !== 'auto') return mazoPorId(rival) ?? MAZOS[0]
  if (humano === 'custom') return MAZOS[seed % 2]
  return mazoPorId(RIVAL_DE[humano]) ?? MAZOS[0]
}

/* ─────────────────────────────────────────────
   Mazos personalizados (editor del Online).

   Los sets preestablecidos juegan SIEMPRE con los diseños originales
   (efectos keyed por cardId). La colección local de la forja solo alimenta
   el editor: las cartas custom con id nuevo se pueden incluir en un mazo
   personalizado (juegan sin efectos de texto hasta que el motor los soporte).
   ───────────────────────────────────────────── */

/**
 * Catálogo completo para el editor: diseños de ALL_CARDS + cartas custom de la
 * colección con id NO registrado. Una custom que repite el id de un diseño NO
 * lo pisa (los sets quedan puros): el editor muestra la versión de diseño.
 */
export function cartasDisponibles(coleccion: AnyCard[]): AnyCard[] {
  const idsDiseno = new Set(ALL_CARDS.map((c) => c.id))
  const customNuevas = coleccion.filter((c) => !idsDiseno.has(c.id))
  return [...ALL_CARDS, ...customNuevas]
}

/** Conteo por tipo de un deck (para los contadores en vivo del editor). */
export function conteosDe(cardIds: string[]): {
  eter: number
  principal: number
  vinculos: number
} {
  let eter = 0
  let vinculos = 0
  for (const id of cardIds) {
    const tipo = getCardMeta(id)?.type
    if (tipo === 'Éter') eter += 1
    else if (tipo === 'Vínculo') vinculos += 1
  }
  return { eter, principal: cardIds.length - eter - vinculos, vinculos }
}

/** Expande una selección `cardId → copias` a un deck de cardIds en orden estable. */
export function buildDeck(seleccion: Map<string, number>): string[] {
  const deck: string[] = []
  for (const [cardId, copias] of seleccion) {
    for (let i = 0; i < copias; i++) deck.push(cardId)
  }
  return deck
}
