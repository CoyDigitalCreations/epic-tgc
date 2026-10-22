import { ALL_CARDS } from '../../shared/data/paquetes'
import type { AnyCard, ArcanaCard, CampeonCard, EfectoData, EterCard, MisticaCard, VinculoCard, Faccion } from '../../shared/types'

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
 * §5.3/§5.4 (fix A4, 2026-10-22): ¿la carta PERMANECE en su slot tras
 * resolverse o es de UN SOLO USO (→ Cementerio y libera slot)?
 *
 * Criterio mecánico (el mismo que usa el manual para describir ambos casos):
 * - EFECTO CONTINUO: el Éter va de la Reserva directo a la carta (costo
 *   bloqueo_fijo / eter_bloqueado) → la carta DEBE quedarse (su Éter vive ahí).
 * - ARTEFACTO (equipable): para servir de soporte equipado permanece en mesa.
 * - Cualquier otro caso = hechizo/recompensa de un solo uso (pago a 1A) →
 *   tras resolverse va al Cementerio (§5.3 L796, §5.4 L809).
 */
export function esPermanenteEnMesa(card: AnyCard): boolean {
  if ('efectos' in card && card.efectos) {
    if (card.efectos.some((e) => e.costo?.tipo === 'eter_bloqueado' || e.costo?.tipo === 'bloqueo_fijo')) {
      return true
    }
    // REDISEÑO obs 1874: la excepción 'negar' se ELIMINÓ — Marcha es un
    // contador de un solo uso (resuelve su negación y va al Cementerio §5.3,
    // como cualquier hechizo sin continuo-con-Éter).
  }
  if ('keywords' in card && card.keywords?.includes('Artefacto')) return true
  return false
}

/**
 * true si el costo del efecto se paga BLOQUEANDO Éter (activación vía
 * bloquear_eter, manual §7.7) en vez de pagarlo a 1A (activar_habilidad).
 * Genérico: aplica a Campeones y Artefactos, cualquier efecto con
 * costo eter_bloqueado/bloqueo_fijo.
 */
export function esCostoBloqueo(costo?: { tipo?: string } | null): boolean {
  return costo?.tipo === 'eter_bloqueado' || costo?.tipo === 'bloqueo_fijo'
}

/**
 * Efecto que activar_habilidad activa en esta carta — SELECCIÓN por tipo de
 * costo (data-driven, sin cardIds). REGLA UNIFICADA (§7.7):
 * - con objetivoId → el continuo de PAGO (aura/buff pagado con objetivo);
 * - sin → el disparo (pago → patrón Agota; costo-bloqueo → patrón Bloqueado:
 *   bloquea N y ejecuta, 1/turno), o en su ausencia el continuo de pago.
 * Continuos con costo-bloqueo (steal_champion Aurora, double_attack FB-015,
 * grant_keyword DS-001) NO son seleccionables acá: se activan exclusivamente
 * vía bloquear_eter → aura derivada / dispararUmbralBloqueo (manual §7.7).
 */
export function efectoActivableDe(card: AnyCard, conObjetivo: boolean): EfectoData | null {
  if (!('efectos' in card) || !card.efectos) return null
  if (conObjetivo) {
    return card.efectos.find((e) => e.tipo === 'continuo' && !esCostoBloqueo(e.costo)) ?? null
  }
  const continuoPago = card.efectos.find((e) => e.tipo === 'continuo' && !esCostoBloqueo(e.costo))
  return card.efectos.find((e) => e.tipo === 'disparo') ?? continuoPago ?? null
}

/**
 * true si la carta recibe Éter bloqueado vía la acción bloquear_eter: tiene
 * algún efecto con costo-bloqueo que NO es disparo (continuo/hechizo/vinculo
 * → aura derivada o one-shot de umbral). Los disparos con costo-bloqueo son
 * habilidad "Bloqueado" — se activan vía activar_habilidad (bloquean y
 * ejecutan), nunca vía bloquear_eter (evita doble camino).
 */
export function cartaBloqueaPorAccion(card: AnyCard): boolean {
  return efectoBloqueoAccion(card) !== null
}

/**
 * Fase 2 (éter por fuente): el EFECTO que paga la acción bloquear_eter —
 * primer NO-disparo con costo-bloqueo (mismo criterio que
 * cartaBloqueaPorAccion, ahora con su ÍNDICE para etiquetar
 * eterBloqueadoPorEfecto y contar/validar límites contra la FUENTE, no
 * contra "el primer costo de la carta"). null si no hay (el efecto pagaría
 * vía activar_habilidad).
 */
export function efectoBloqueoAccion(card: AnyCard): { efecto: EfectoData; indice: number } | null {
  if (!('efectos' in card) || !card.efectos) return null
  const indice = card.efectos.findIndex((e) => esCostoBloqueo(e.costo) && e.tipo !== 'disparo')
  return indice === -1 ? null : { efecto: card.efectos[indice], indice }
}

/**
 * Extrae el costo en Éteres de la habilidad activa que activar_habilidad
 * ejecuta (patrón Agota/Bloqueado del disparo; continuos solo si pagan).
 * Lee de efectos[] — el sistema unificado.
 */
export function costeEterHabilidad(card: AnyCard): number {
  if ('efectos' in card && card.efectos) {
    const disparo = card.efectos.find((e) => e.tipo === 'disparo')
    if (disparo?.costo?.cantidad !== undefined) return disparo.costo.cantidad
    const continuo = card.efectos.find((e) => e.tipo === 'continuo' && !esCostoBloqueo(e.costo))
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

/**
 * true si el Campeón es elegible para recibir Éter bloqueado vía elegir_opcion
 * (Pasivo 1A FB-005/DS-006). Solo campeones con efecto CONTINUO que usa
 * costo eter_bloqueado/bloqueo_fijo. Campeones con solo pasivo/disparo NO
 * califican (ej: Vaela solo tiene pasivo al_matar_en_combate).
 */
export function campeonElegibleBloqueoEter(card: AnyCard): boolean {
  if (!esCampeon(card)) return false
  if (!('efectos' in card) || !card.efectos) return false
  return card.efectos.some(
    (e) => e.tipo === 'continuo' && (e.costo?.tipo === 'eter_bloqueado' || e.costo?.tipo === 'bloqueo_fijo'),
  )
}
