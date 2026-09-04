export const CARD_TYPES = [
  'Éter',
  'Campeón',
  'Mística',
  'Arcana',
  'Vínculo',
] as const

export type CardType = (typeof CARD_TYPES)[number]

export const RARITIES = [
  'Común',
  'Poco Común',
  'Rara',
  'Épica',
  'Legendaria',
  'Única',
] as const

export type Rarity = (typeof RARITIES)[number]

export const KEYWORDS = [
  'Carga',
  'Vigor',
  'Inmortal',
  'Indestructible',
  'Recarga',
  'Protector',
  'Artefacto',
  'Presteza',
  'Fugaz',
  'Inegable',
] as const

export type Keyword = (typeof KEYWORDS)[number]

/* ───────── Taxonomía ───────── */

export const FACCIONES = [
  'Orden',
  'Caos',
  'Creación',
  'Destrucción',
  'Ley',
  'Purga',
  'Entropía',
  'Mutación',
] as const
export type Faccion = (typeof FACCIONES)[number]

/** Colores oficiales de facción — alineados con los medallones de public/facciones_*.png */
export const FACCION_COLORS: Record<Faccion, string> = {
  Orden: '#e5e7eb',
  Caos: '#3b82f6',
  Creación: '#22c55e',
  Destrucción: '#ef4444',
  Ley: '#eab308',
  Purga: '#f97316',
  Entropía: '#a855f7',
  Mutación: '#22d3ee',
}

/**
 * Medallón oficial de cada facción (public/facciones_*.png).
 * La imagen ya incluye el símbolo rúnico — reemplaza a los círculos
 * radiales + RuneIcon que se renderizaban antes en el preview.
 */
export const FACCION_IMAGES: Record<Faccion, string> = {
  Orden: '/facciones_white.png',
  Caos: '/facciones_blue.png',
  Creación: '/facciones_green.png',
  Destrucción: '/facciones_red.png',
  Ley: '/facciones_gold.png',
  Purga: '/facciones_orange.png',
  Entropía: '/facciones_purple.png',
  Mutación: '/facciones_cyan.png',
}

/**
 * Runas legendarias del Éter — un glifo original por facción, dibujado según
 * la cosmología del Eje (ver FACCION_LORE y primogenitos.html, sección 1).
 * Son paths SVG (viewBox 24x24, trazo), no caracteres Unicode, porque el
 * soporte de fuentes rúnicas en Windows es inconsistente y así cada runa es
 * 100% propia y escalable en cualquier tamaño (ver RuneIcon).
 *
 * Semántica de cada runa:
 * - Orden       : el ANCLA — anillo, palo, travesaño y brazos (Norte)
 * - Caos        : la TORMENTA — rayo y viento (Sur)
 * - Creación    : la ESPIRAL que se enrosca — el crecimiento (Este)
 * - Destrucción : la CRUZ ROTA — la X partida en su centro (Oeste)
 * - Ley         : la ESCUADRA — el triángulo sobre el cimiento (Noreste)
 * - Purga       : la FLECHA — el corte ascendente (Noroeste)
 * - Entropía    : la BRECHA — grietas que se abren (Sudoeste)
 * - Mutación    : el VÓRTICE — el ocho infinito del cambio (Sudeste)
 */
export const FACCION_RUNES: Record<Faccion, string> = {
  Orden: 'M12 3a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2zM12 5v15M7 8h10M5 21c0-4.5 3-7 7-7s7 2.5 7 7',
  Caos: 'M12 2L7 14h5l-3 8 9-13h-6l3-7M4 19q2-2 4 0t4 0t4 0',
  Creación: 'M12 12a2 2 0 0 1 0 4a4 4 0 0 1 0-8a6 6 0 0 1 0 12a8 8 0 0 1 0-16',
  Destrucción: 'M6 6l5 5M13 13l5 5M18 6l-5 5M11 13l-5 5',
  Ley: 'M5 19V5l14 14zM3 21h18M9 21v-2M15 21v-2',
  Purga: 'M5 19L17 7M13 11L17 7l-4-4M5 19l-3 2M5 19l3 2',
  Entropía: 'M5 4l4 5-3 4 5 6M13 4l-3 5 5 4-4 6M19 8l-3 3',
  Mutación: 'M12 6c-6 0-6 12 0 12s6-12 0-12',
}

/**
 * Cosmología del Eje — el nombre legendario de cada facción en el mapa de
 * las 8 facetas (ver primogenitos.html, sección 1 y 2).
 *
 * - faceta   : nombre primigenio en el cosmos. Orden y Caos son los DOS
 *              POLOS del Eje (Estásis y Disonancia); Creación y Destrucción
 *              se conocen en el cosmos como Vitalidad y Vacío. Las demás
 *              facetas llevan el mismo nombre que la facción.
 * - runa     : nombre legendario de la runa de la facción (los glifos SVG
 *              están en FACCION_RUNES).
 * - posicion : punto cardinal que ocupa en el mapa del Eje.
 */
export const FACCION_LORE: Record<Faccion, { faceta: string; runa: string; posicion: string }> = {
  Orden: { faceta: 'Estásis', runa: 'El Ancla / El Eje', posicion: 'Norte' },
  Caos: { faceta: 'Disonancia', runa: 'La Tormenta / El Nudo', posicion: 'Sur' },
  Creación: { faceta: 'Vitalidad', runa: 'La Espiral / El Crecimiento', posicion: 'Este' },
  Destrucción: { faceta: 'Vacío', runa: 'La Cruz Rota', posicion: 'Oeste' },
  Ley: { faceta: 'Ley', runa: 'La Escuadra / El Cimiento', posicion: 'Noreste' },
  Purga: { faceta: 'Purga', runa: 'La Flecha / El Corte', posicion: 'Noroeste' },
  Entropía: { faceta: 'Entropía', runa: 'La Brecha / El Desgaste', posicion: 'Sudoeste' },
  Mutación: { faceta: 'Mutación', runa: 'El Vórtice / El Cambio', posicion: 'Sudeste' },
}

export const ESENCIAS = [
  'Mago',
  'Guerrero',
  'Bestia',
  'Dragón',
  'Espectro',
  'Céleste',
  'Abisal',
  'Elemental',
  'Constructo',
  'Humano',
] as const
export type Esencia = (typeof ESENCIAS)[number]

export const ROLES = [
  'Soberano',
  'Emperador',
  'Soporte',
  'Éter',
  'Normal',
] as const
export type Rol = (typeof ROLES)[number]

export const CAT_HABILIDAD = [
  'Efecto',
  'Singular',
  'Comandante',
  'Legendario',
  'Maldito',
  'Bendito',
  'Normal',
] as const
export type CatHabilidad = (typeof CAT_HABILIDAD)[number]
