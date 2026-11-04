import type { Rarity } from '../../shared/types/enums'

/**
 * Constantes de PRESENTACIÓN de las vistas (márgenes, tamaños, colores). No son reglas de
 * balance: esas viven en config.ts. Esta carpeta queda fuera de la guardia sinConstantes
 * (que solo revisa los módulos de cálculo de primer nivel de src/balance).
 */
export const MARGEN_GRAFICA = { top: 8, right: 16, bottom: 8, left: 0 }

/** Alto de la gráfica horizontal del ranking: una barra por carta mostrada. */
export const ALTO_POR_BARRA = 28
export const ANCHO_ETIQUETA_BARRA = 170

/** Intensidad máxima (en %) del color de una celda del mapa de calor. */
export const INTENSIDAD_MAXIMA = 70

export const RADIO_PUNTO = 70
export const OPACIDAD_BANDA = 0.18

/** Cuántas cartas muestra la gráfica del ranking. */
export const TOP_RANKING = 10

export const COLOR_RAREZA: Record<Rarity, string> = {
  Común: '#9ca3af',
  'Poco Común': '#22c55e',
  Rara: '#3b82f6',
  Épica: '#a855f7',
  Legendaria: '#f97316',
  Única: '#eab308',
}
