export const CARD_TYPES = [
  'Campeón',
  'Mística',
  'Táctica',
  'Arcana',
  'Combate',
  'Éter',
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
  'Guardián',
  'Protector',
  'Carga',
  'Espectro',
  'Recarga',
  'Vanguardia',
  'Inmortal',
  'Éter-Furia',
  'Fracturar',
  'Restaurar',
  'Golpe Letal',
  'Inquebrantable',
] as const

export type Keyword = (typeof KEYWORDS)[number]

export const ELEMENTS = [
  'Fuego',
  'Agua',
  'Tierra',
  'Aire',
  'Luz',
  'Tinieblas',
] as const

export type Element = (typeof ELEMENTS)[number]

/* ───────── Taxonomía ───────── */

export const FACCIONES = [
  'Orden',
  'Caos',
  'Sabiduría',
  'Naturaleza',
  'Firstborne',
] as const
export type Faccion = (typeof FACCIONES)[number]

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
  'Único',
  'Legendario',
  'Maldito',
  'Bendito',
  'Normal',
] as const
export type CatHabilidad = (typeof CAT_HABILIDAD)[number]
