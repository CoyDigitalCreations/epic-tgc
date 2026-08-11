import type { Zona } from './types'

/** Constantes de slots del campo (manual v2.0 sección 6.1). */

export const SLOTS_CAMPEONES = 5 // 2B-2F (máx 5 Campeones)
export const SLOTS_MISTICAS_TACTICAS = 3 // 3A-3C
export const SLOTS_ARCANAS_COMBATE = 3 // 3D-3F
export const SLOTS_VINCULOS = 6 // 4A-4F
export const LIMITE_MANO = 6

export type GrupoSlot = 'campeones' | 'misticasTacticas' | 'arcanasCombate' | 'vinculos'

const LETRAS_CAMPEONES = ['B', 'C', 'D', 'E', 'F'] as const
const LETRAS_MISTICAS = ['A', 'B', 'C'] as const
const LETRAS_ARCANAS = ['D', 'E', 'F'] as const
const LETRAS_VINCULOS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export function limiteSlots(grupo: GrupoSlot): number {
  switch (grupo) {
    case 'campeones': return SLOTS_CAMPEONES
    case 'misticasTacticas': return SLOTS_MISTICAS_TACTICAS
    case 'arcanasCombate': return SLOTS_ARCANAS_COMBATE
    case 'vinculos': return SLOTS_VINCULOS
  }
}

/** Zona (2B-2F, 3A-3C, 3D-3F, 4A-4F) correspondiente a un slot del grupo; null si el slot es inválido. */
export function slotAZona(grupo: GrupoSlot, slot: number): Zona | null {
  if (slot < 0) return null
  switch (grupo) {
    case 'campeones':
      return slot < LETRAS_CAMPEONES.length ? (`2${LETRAS_CAMPEONES[slot]}` as Zona) : null
    case 'misticasTacticas':
      return slot < LETRAS_MISTICAS.length ? (`3${LETRAS_MISTICAS[slot]}` as Zona) : null
    case 'arcanasCombate':
      return slot < LETRAS_ARCANAS.length ? (`3${LETRAS_ARCANAS[slot]}` as Zona) : null
    case 'vinculos':
      return slot < LETRAS_VINCULOS.length ? (`4${LETRAS_VINCULOS[slot]}` as Zona) : null
  }
}
