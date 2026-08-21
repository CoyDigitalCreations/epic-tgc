/**
 * Selectores de stats comparativos y focos de estado para el tablero.
 * Puros: solo leen GameState, no mutan.
 */
import type { GameState } from './types'
import { statsDe, aurasDe, hasAuraCampoRegistrada } from './efectos'
import { getCardMeta, esCampeon } from './cards'

export interface StatChip {
  base: number
  actual: number
  color: 'rojo' | 'amarillo' | 'verde'
}

export interface StatsComparativos {
  atq: StatChip
  res: StatChip
}

export type FocoEstado = 'gris' | 'verde' | 'rojo'

export interface FocosState {
  continuo: FocoEstado
  temporal: FocoEstado
  disparo: FocoEstado
}

function colorFor(base: number, actual: number): StatChip['color'] {
  if (actual > base) return 'verde'
  if (actual < base) return 'rojo'
  return 'amarillo'
}

/** Stats base vs efectivos de un Campeón para el strip visual. null si no es Campeón o no existe. */
export function statsComparativos(s: GameState, id: string): StatsComparativos | null {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  if (!meta || !esCampeon(meta)) return null

  const baseAtq = meta.stats?.poder ?? 0
  const baseRes = meta.stats?.resistencia ?? 0
  const effective = statsDe(s, id)

  return {
    atq: { base: baseAtq, actual: effective.poder, color: colorFor(baseAtq, effective.poder) },
    res: { base: baseRes, actual: effective.resistencia, color: colorFor(baseRes, effective.resistencia) },
  }
}

/**
 * Estado de focos de un Campeón:
 * - continuo: 'gris' sin efectos continuos | 'verde' aura activa | 'rojo' aura registrada pero inactiva
 * - temporal: 'gris' sin efectos temporales | 'verde' tiene mods temporales o keywords temporales
 */
export function focosState(s: GameState, id: string): FocosState | null {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  if (!meta || !esCampeon(meta)) return null

  const auras = aurasDe(s, id)
  const hasContinuo = auras.campo.length > 0 || auras.reserva.length > 0 || auras.bloqueo.length > 0
  const hasAuraRegistrada = cardId ? hasAuraCampoRegistrada(cardId) : false

  let continuo: FocoEstado = 'gris'
  if (hasContinuo) {
    continuo = 'verde'
  } else if (hasAuraRegistrada) {
    continuo = 'rojo' // aura registrada pero condición no se cumple
  }

  const hasTemporal =
    (inst.modificadores?.some((m) => m.expira !== 'permanente') ?? false) ||
    (inst.keywordsTemporales?.length ?? 0) > 0

  // Disparo: tiene efectoDisparo o efectoContinuo (habilidad activa)
  const tieneDisparo = !!meta.efectoContinuo || !!('efectoDisparo' in meta && (meta as any).efectoDisparo)

  return {
    continuo,
    temporal: hasTemporal ? 'verde' : 'gris',
    disparo: tieneDisparo ? 'verde' : 'gris',
  }
}
