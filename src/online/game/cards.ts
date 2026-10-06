import { ALL_CARDS } from '../../shared/data/paquetes'
import type { AnyCard, ArcanaCard, CampeonCard, EterCard, MisticaCard, VinculoCard, Faccion } from '../../shared/types'

export type { AnyCard }

/**
 * Índice cardId → AnyCard sobre ALL_CARDS.
 * Construido UNA vez al cargar el módulo: getCardMeta no re-indexa por llamada.
 * Fuente única de metadatos: seed/PrimerColeccionEfectos.json vía
 * shared/data/paquetes.ts (ADR-2: el meta vive en shared, no en el estado).
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

/** true si las facciones A y B comparten al menos una facción.
 *  Si alguno no tiene facciones (undefined/vacío), es compatible con todo (v2.0). */
export function faccionesCompartidas(a?: Faccion[], b?: Faccion[]): boolean {
  // Si alguno no tiene facciones definidas, es compatible con cualquier otra
  if (!a || a.length === 0 || !b || b.length === 0) return true
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
 * true si la carta es un ARTEfacto que requiere selección manual de campeón.
 * - Keyword 'Artefacto' presente
 * - NO tiene efecto invocar_y_equipar (ese se auto-equipa al invocar)
 * Aplica a Místicas y Arcanas con esa keyword.
 */
export function esArtefactoEquipable(card: AnyCard): boolean {
  if (!('keywords' in card) || !card.keywords?.includes('Artefacto')) return false
  if ('efectos' in card && card.efectos) {
    if (card.efectos.some((e) => e.efecto === 'invocar_y_equipar')) return false
  }
  return true
}

/**
 * Extrae el costo en Éteres de una habilidad activa.
 * Lee de efectos[] — el sistema unificado.
 */
export function costeEterHabilidad(card: AnyCard): number {
  if ('efectos' in card && card.efectos) {
    const disparo = card.efectos.find((e) => e.tipo === 'disparo')
    if (disparo?.costo?.cantidad !== undefined) return disparo.costo.cantidad
    const continuo = card.efectos.find((e) => e.tipo === 'continuo')
    if (continuo?.costo?.cantidad !== undefined) return continuo.costo.cantidad
  }
  return 0
}

/**
 * true si la carta tiene una habilidad que requiere (o puede usar) éter bloqueado.
 * Lee de efectos[] — el sistema unificado. Genérico: Campeones y Artefactos
 * (Místicas/Arcanas con costo eter_bloqueado/bloqueo_fijo — Fase 3a).
 */
export function campeonNecesitaEterBloqueado(card: AnyCard): boolean {
  return cartaNecesitaEterBloqueado(card)
}

/** Alias genérico (Fase 3a): cualquier carta con costo-bloqueado en efectos[]. */
export function cartaNecesitaEterBloqueado(card: AnyCard): boolean {
  if ('efectos' in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costo?.tipo === 'eter_bloqueado' || e.costo?.tipo === 'bloqueo_fijo') return true
    }
  }
  return false
}
