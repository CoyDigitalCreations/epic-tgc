import { ALL_CARDS } from '../../shared/data/paquetes'
import type { AnyCard, ArcanaCard, CampeonCard, CombateCard, EterCard, MisticaCard, TacticaCard, VinculoCard, Faccion } from '../../shared/types'

export type { AnyCard }

/**
 * Índice cardId → AnyCard sobre ALL_CARDS (60 diseños).
 * Construido UNA vez al cargar el módulo: getCardMeta no re-indexa por llamada.
 * Fuente única de metadatos: paquetes.ts (ADR-2: el meta vive en shared, no en el estado).
 */

const INDICE_CARTAS: Map<string, AnyCard> = new Map(ALL_CARDS.map((c) => [c.id, c]))

export function getCardMeta(cardId: string): AnyCard | null {
  return INDICE_CARTAS.get(cardId) ?? null
}

/**
 * Registra cartas de la colección de la forja en el catálogo del motor.
 * Aditivo y determinístico: si una carta ya existe con el mismo id, la
 * reemplaza; el resto de ALL_CARDS queda intacto. Se llama ANTES de
 * createInitialState para que getCardMeta resuelva las cartas custom.
 */
export function registrarCartas(cartas: AnyCard[]): void {
  for (const c of cartas) {
    if (c?.id) INDICE_CARTAS.set(c.id, c)
  }
}

/** true si las facciones A y B comparten al menos una facción. */
export function faccionesCompartidas(a?: Faccion[], b?: Faccion[]): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false
  return a.some((f) => b.includes(f))
}

/* ── Guards de tipo (uniones discriminadas de AnyCard) ── */

export function esCampeon(card: AnyCard): card is CampeonCard {
  return card.type === 'Campeón'
}
export function esMistica(card: AnyCard): card is MisticaCard {
  return card.type === 'Mística'
}
export function esTactica(card: AnyCard): card is TacticaCard {
  return card.type === 'Táctica'
}
export function esArcana(card: AnyCard): card is ArcanaCard {
  return card.type === 'Arcana'
}
export function esCombate(card: AnyCard): card is CombateCard {
  return card.type === 'Combate'
}
export function esEter(card: AnyCard): card is EterCard {
  return card.type === 'Éter'
}
export function esVinculo(card: AnyCard): card is VinculoCard {
  return card.type === 'Vínculo'
}

/**
 * Extrae el costo en Éteres de una habilidad activa desde efectoActivo.
 * Patrones soportados: "Paga N Éter", "paga N Éter", "hasta un máximo de N Éter".
 * Retorna 0 si no se puede parsear (fallback seguro).
 */
export function costeEterHabilidad(card: AnyCard): number {
  if (!('efectoActivo' in card) || !card.efectoActivo) return 0
  // Matchea "Paga 2 Éter", "paga 1 Éter", "hasta un máximo de 2 Éter"
  const match = card.efectoActivo.match(/(?:de\s+)?(\d+)\s+Éter/)
  return match ? parseInt(match[1], 10) : 0
}
