import type { CardType } from './enums'
import { FACCIONES, ESENCIAS, ROLES, CAT_HABILIDAD } from './enums'

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'multi-select'
  required: boolean
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}

export interface CardFormConfig {
  type: CardType
  fields: FieldDef[]
}

export const FORM_CONFIGS: CardFormConfig[] = [
  {
    type: 'Campeón',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Aurelion, Portador del Éter' },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'poder', label: 'Poder', type: 'number', required: true, min: 0, max: 9999 },
      { name: 'resistencia', label: 'Resistencia', type: 'number', required: true, min: 0, max: 9999 },
      { name: 'faccion', label: 'Facción', type: 'select', required: true, options: [...FACCIONES] },
      { name: 'esencia', label: 'Esencia', type: 'select', required: true, options: [...ESENCIAS] },
      { name: 'rol', label: 'Rol', type: 'select', required: true, options: [...ROLES] },
      { name: 'catHabilidad', label: 'Categoría de Habilidad', type: 'select', required: true, options: [...CAT_HABILIDAD] },
      { name: 'tipoEfecto', label: 'Tipo de Efecto', type: 'select', required: false, options: ['Pasivo', 'Activo', 'Especial'], placeholder: 'Sin efecto' },
      { name: 'efectoPasivo', label: 'Efecto Pasivo', type: 'textarea', required: false, placeholder: 'Describí el efecto pasivo (aura, mientras está en campo)...' },
      { name: 'efectoActivo', label: 'Efecto Activo', type: 'textarea', required: false, placeholder: 'Describí el efecto al activarlo (exiliar Éter asignado, etc.)...' },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false, placeholder: 'Ambientación...' },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
  {
    type: 'Mística',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Tormenta de Maná' },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'poder', label: 'Poder', type: 'number', required: true, min: 0, max: 9999 },
      { name: 'resistencia', label: 'Resistencia', type: 'number', required: true, min: 0, max: 9999 },
      { name: 'efecto', label: 'Efecto', type: 'textarea', required: true, placeholder: 'Describe el efecto mágico...' },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
  {
    type: 'Táctica',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Emboscada' },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'duracion', label: 'Duración (turnos)', type: 'number', required: true, min: 1, max: 10 },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
  {
    type: 'Arcana',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: El Juicio Final' },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'condicion', label: 'Condición de Activación', type: 'textarea', required: true },
      { name: 'recompensa', label: 'Recompensa', type: 'textarea', required: true },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
  {
    type: 'Combate',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Golpe Certero' },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
  {
    type: 'Éter',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Corazón del Éter' },
      { name: 'cost', label: 'Valor de Éter', type: 'number', required: true, min: 1, max: 5 },
      { name: 'tipoEfecto', label: 'Tipo de Efecto', type: 'select', required: false, options: ['Pasivo', 'Activo', 'Especial'], placeholder: 'Sin efecto' },
      { name: 'efectoPasivo', label: 'Efecto Pasivo', type: 'textarea', required: false, placeholder: 'Describí el efecto pasivo (mientras está en Reserva o asignada)...' },
      { name: 'efectoActivo', label: 'Efecto Activo', type: 'textarea', required: false, placeholder: 'Describí el efecto al activar esta carta (exiliar, descartar, etc.)...' },
      { name: 'element', label: 'Elemento', type: 'select', required: false, options: ['Fuego', 'Agua', 'Tierra', 'Aire', 'Luz', 'Tinieblas'] },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
    ],
  },
]

export function getFormConfig(type: CardType): CardFormConfig {
  return FORM_CONFIGS.find((c) => c.type === type) ?? FORM_CONFIGS[0]
}
