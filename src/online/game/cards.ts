import { ALL_CARDS } from '../../shared/data/paquetes'
import type { AnyCard, ArcanaCard, CampeonCard, EterCard, MisticaCard, VinculoCard, Faccion } from '../../shared/types'

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
export function esArcana(card: AnyCard): card is ArcanaCard {
  return card.type === 'Arcana'
}
export function esEter(card: AnyCard): card is EterCard {
  return card.type === 'Éter'
}
export function esVinculo(card: AnyCard): card is VinculoCard {
  return card.type === 'Vínculo'
}

/**
 * Extrae el costo en Éteres de una habilidad activa.
 * Prefiere efectos[].costoMax si está disponible.
 * Fallback: regex sobre efectoDisparo (backward compatible).
 */
export function costeEterHabilidad(card: AnyCard): number {
  // 1. Prefer efectos[] array (unified system)
  if ('efectos' in card && card.efectos) {
    const disparo = card.efectos.find((e) => e.tipo === 'disparo')
    if (disparo?.costoMax !== undefined) return disparo.costoMax
    const continuo = card.efectos.find((e) => e.tipo === 'continuo')
    if (continuo?.costoMax !== undefined) return continuo.costoMax
  }
  // 2. Fallback: legacy efectoDisparoData
  if ('efectoDisparoData' in card && (card as any).efectoDisparoData?.costoMax !== undefined) {
    return (card as any).efectoDisparoData.costoMax
  }
  // 3. Fallback: regex parsing (backward compatible)
  if (!('efectoDisparo' in card) || !card.efectoDisparo) return 0
  const match = card.efectoDisparo.match(/(?:de\s+)?(\d+)\s+Éter/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Determina si un campeón tiene alguna razón para tener Éter bloqueado.
 *
 * Retorna true si:
 * 1. Su efectoDisparo contiene 'bloqueado' (habilidad activa: Korr, Cassandra, Aurora, Ragnar)
 * 2. Su efectoPasivo referencia 'Éter bloqueado' (pasivo: FB-005, DS-006)
 *
 * Retorna false para campeones como Draven, Emisario, etc. que NO se benefician
 * de tener éter bloqueado.
 */
/**
 * true si el campeón tiene una habilidad que requiere (o puede usar) éter bloqueado.
 * Prefiere efectos[] si está disponible.
 * Fallback: text pattern matching (backward compatible).
 */
export function campeonNecesitaEterBloqueado(card: AnyCard): boolean {
  // 1. Prefer efectos[] array (unified system)
  if ('efectos' in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costoTipo === 'eter_bloqueado') return true
      if (e.trigger === 'inicio_alba' && e.condicion?.includes('bloqueado')) return true
    }
  }
  // 2. Fallback: legacy efectoDisparoData / efectoPasivoData
  const efectoData = (card as any).efectoDisparoData
  if (efectoData?.costoTipo === 'eter_bloqueado') return true
  const efectoPasivoData = (card as any).efectoPasivoData
  if (efectoPasivoData?.trigger === 'al-inicio-alba' && efectoPasivoData?.condicion?.includes('bloqueado')) return true

  // 3. Fallback: text pattern matching (backward compatible)
  if ('efectoContinuo' in card && card.efectoContinuo?.includes('bloqueado')) return true
  if ('efectoDisparo' in card && !('disparoAgota' in card && (card as any).disparoAgota) && card.efectoDisparo?.includes('bloqueado')) return true
  if ('efectoPasivo' in card && card.efectoPasivo?.includes('Éter bloqueado')) return true
  return false
}

/** true si el campeón tiene efecto Continuo (bloquea éter, agota al activar). */
export function esContinuo(card: AnyCard): boolean {
  // 1. Prefer efectos[] array (unified system)
  if ('efectos' in card && card.efectos) {
    return card.efectos.some((e) => e.tipo === 'continuo')
  }
  // 2. Fallback: legacy field
  return 'efectoContinuo' in card && !!(card as AnyCard & { efectoContinuo?: string }).efectoContinuo
}
