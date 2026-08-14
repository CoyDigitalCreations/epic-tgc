import type { Faccion } from './enums'

/** Tipos de paquete / bloque de cartas */
export const PAQUETE_TIPOS = [
  'Set Básico',
  'Expansión',
  'Mazo Temático',
] as const
export type PaqueteTipo = (typeof PAQUETE_TIPOS)[number]

/** Un paquete es un set completo de cartas con identidad propia */
export interface Paquete {
  id: string
  nombre: string
  tipo: PaqueteTipo
  /** Color distintivo del paquete */
  color: string
  /** Facción(es) a la que pertenecen sus cartas — la runa se deriva de facciones[0] */
  facciones: Faccion[]
  /** Entrega/set comercial al que pertenece el mazo (p.ej. la entrega "Primogénitos") */
  entrega?: string
  /** Distribución oficial del mazo: 15 Éter + 45 Principal + 6 Vínculos */
  distribucion: {
    eter: number
    principal: number
    vinculos: number
  }
  lore: string
}

/** Total de cartas que debe sumar un paquete (66) */
export const MAZO_TOTAL = 66
