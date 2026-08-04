export const CARD_TYPES = [
  'Éter',
  'Campeón',
  'Mística',
  'Táctica',
  'Arcana',
  'Combate',
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
  'Resonancia',
  'Transmutar',
  'Frenesí',
  'Protector',
  'Fracturar',
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
 * Runas legendarias del Éter — un glifo original por facción.
 * Son paths SVG (viewBox 24x24, trazo), no caracteres Unicode, porque el
 * soporte de fuentes rúnicas en Windows es inconsistente y así cada runa es
 * 100% propia y escalable en cualquier tamaño (ver RuneIcon).
 *
 * Semántica de cada runa:
 * - Orden       : pilar de jerarquía — estructura y ley del norte
 * - Caos        : X del choque — fuerzas opuestas en conflicto
 * - Creación    : espiga ascendente — brote, vida, nacimiento
 * - Destrucción : fractura descendente — colapso, caída
 * - Ley         : dos pilares en balance — juicio y equilibrio
 * - Purga       : rayo purificador — fuego que limpia y sube
 * - Entropía    : espiral que se deshace — descomposición gradual
 * - Mutación    : cruce con núcleo — fusión y transformación
 */
export const FACCION_RUNES: Record<Faccion, string> = {
  Orden: 'M12 2v20M6 6h12M6 18h12',
  Caos: 'M4 4l16 16M20 4L4 20M12 7v10',
  Creación: 'M12 20V4M12 4L6 12M12 4l6 8',
  Destrucción: 'M5 5h14l-7 16zM12 5v6',
  Ley: 'M6 4v16M18 4v16M4 12h16',
  Purga: 'M12 20V4M12 4L7 10M12 8l5 6',
  Entropía: 'M12 12a6 6 0 1 1-6 6a4 4 0 1 1 4-4a2 2 0 1 1-2 2',
  Mutación: 'M5 5l14 14M19 5L5 19M12 5v6M12 13v6',
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
  'Asalto',
  'Guardia',
  'Soporte',
  'Control',
  'Sacrificio',
  'Evolución',
  'Éter',
  'Normal',
] as const
export type Rol = (typeof ROLES)[number]

export const CAT_HABILIDAD = [
  'Efecto',
  'Singular',
  'Legendario',
  'Maldito',
  'Bendito',
  'Normal',
] as const
export type CatHabilidad = (typeof CAT_HABILIDAD)[number]
