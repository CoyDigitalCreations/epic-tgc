import { ALL_CARDS, ESTASIS_CARDS, DISONANCIA_CARDS, PURGA_CARDS, MUTACION_CARDS, getPaquete } from '../shared/data/paquetes'
import type { AnyCard, Faccion } from '../shared/types'
import { getCardMeta } from './game/cards'

/** Expande diseños a copias según limiteCopias (mazo jugable de 66 cardIds). */
function expandirMazo(cards: AnyCard[]): string[] {
  return cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))
}

/** Sets preestablecidos del modo vs bot. */
export type SetId = 'estasis' | 'disonancia' | 'purga' | 'mutacion'

/**
 * Receta de un mazo oficial con el set estándar (ST-xxx): qué COPIAS se recortan del paquete temático (no se quita ningún diseño) y
 * qué cartas estándar entran. Siempre 10 espacios: 1 Vínculo, 2 Éter y 7 de Principal. Vive aquí y NO en `limiteCopias` porque ese
 * tope también rige los mazos personalizados (bajarlo invalidaría mazos ya guardados). Los Campeones estándar son de la facción del mazo.
 */
interface RecetaOficial {
  quitar: Record<string, number>
  poner: Record<string, number>
}

const RECETAS: Record<SetId, RecetaOficial> = {
  estasis: {
    quitar: { 'FB-009': 1, 'FB-008': 1, 'FB-011': 1, 'FB-015': 1, 'FB-014': 1, 'FB-020': 2, 'FB-021': 1, 'FB-032': 1, 'FB-027': 1 },
    poner: { 'ST-001': 1, 'ST-003': 1, 'ST-010': 2, 'ST-011': 1, 'ST-020': 1, 'ST-021': 1, 'ST-024': 2, 'ST-040': 1 },
  },
  disonancia: {
    quitar: { 'DS-006': 1, 'DS-009': 1, 'DS-013': 1, 'DS-012': 1, 'DS-015': 1, 'DS-019': 1, 'DS-022': 1, 'DS-032': 1, 'DS-023': 1, 'DS-027': 1 },
    poner: { 'ST-002': 1, 'ST-004': 1, 'ST-012': 2, 'ST-013': 1, 'ST-020': 1, 'ST-022': 1, 'ST-030': 1, 'ST-031': 1, 'ST-042': 1 },
  },
  purga: {
    quitar: { 'PU-004': 1, 'PU-006': 1, 'PU-012': 1, 'PU-011': 1, 'PU-022': 1, 'PU-024': 1, 'PU-030': 1, 'PU-029': 1, 'PU-026': 1, 'PU-033': 1 },
    poner: { 'ST-001': 1, 'ST-003': 1, 'ST-014': 1, 'ST-015': 1, 'ST-020': 1, 'ST-023': 1, 'ST-034': 2, 'ST-033': 1, 'ST-041': 1 },
  },
  mutacion: {
    quitar: { 'MU-006': 1, 'MU-003': 1, 'MU-013': 1, 'MU-016': 1, 'MU-012': 1, 'MU-025': 1, 'MU-023': 1, 'MU-029': 1, 'MU-030': 1, 'MU-035': 1 },
    poner: { 'ST-005': 1, 'ST-004': 1, 'ST-016': 2, 'ST-017': 1, 'ST-020': 1, 'ST-021': 1, 'ST-030': 1, 'ST-031': 1, 'ST-043': 1 },
  },
}

/** Mazo oficial: el paquete expandido por `limiteCopias`, menos las copias recortadas, más las cartas estándar de su receta. */
function mazoOficial(cards: AnyCard[], receta: RecetaOficial): string[] {
  const pendientes = { ...receta.quitar }
  const base = expandirMazo(cards).filter((id) => {
    if ((pendientes[id] ?? 0) <= 0) return true
    pendientes[id] -= 1
    return false
  })
  const agregados = Object.entries(receta.poner).flatMap(([id, n]) => Array.from({ length: n }, () => id))
  return [...base, ...agregados]
}

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
    cardIds: mazoOficial(ESTASIS_CARDS, RECETAS.estasis),
  },
  {
    id: 'disonancia',
    nombre: getPaquete('disonancia')?.nombre ?? 'Disonancia',
    color: getPaquete('disonancia')?.color ?? '#3b82f6',
    cardIds: mazoOficial(DISONANCIA_CARDS, RECETAS.disonancia),
  },
  {
    id: 'purga',
    nombre: getPaquete('purga')?.nombre ?? 'Purga',
    color: getPaquete('purga')?.color ?? '#ec4899',
    cardIds: mazoOficial(PURGA_CARDS, RECETAS.purga),
  },
  {
    id: 'mutacion',
    nombre: getPaquete('mutacion')?.nombre ?? 'Mutación',
    color: getPaquete('mutacion')?.color ?? '#84cc16',
    cardIds: mazoOficial(MUTACION_CARDS, RECETAS.mutacion),
  },
]

/** El rival natural de cada set (las parejas espejo del Eje): Estásis↔Disonancia, Purga↔Mutación. */
const RIVAL_DE: Record<SetId, SetId> = { estasis: 'disonancia', disonancia: 'estasis', purga: 'mutacion', mutacion: 'purga' }

/** Facción de un set oficial (Estásis → Orden, Disonancia → Caos, Purga → Purga, Mutación → Mutación), tomada de su paquete. */
export const faccionDeSet = (id: SetId): Faccion => (getPaquete(id)?.facciones?.[0] as Faccion | undefined) ?? 'Orden'

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
