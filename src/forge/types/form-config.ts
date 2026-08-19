import type { CardType } from '../../shared/types/enums'
import { FACCIONES, ESENCIAS, ROLES, CAT_HABILIDAD } from '../../shared/types/enums'

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'multi-select' | 'paquete'
  required: boolean
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
  /** Valor mostrado cuando el campo no tiene valor en el draft */
  defaultValue?: string
}

/** Campos comunes a todos los tipos (metadata de autoría) */
export const META_FIELDS: FieldDef[] = [
  {
    name: 'paqueteId',
    label: 'Paquete',
    type: 'paquete',
    required: false,
  },
  {
    name: 'variante',
    label: 'Variante',
    type: 'select',
    required: false,
    options: ['normal', 'full-art'],
    defaultValue: 'normal',
  },
  {
    name: 'comentario',
    label: 'Comentario',
    type: 'textarea',
    required: false,
    placeholder: 'Notas del diseñador (no aparecen en la carta)...',
  },
]

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
      { name: 'facciones', label: 'Facciones (máx 3)', type: 'multi-select', required: true, options: [...FACCIONES], max: 3 },
      { name: 'esencia', label: 'Esencia', type: 'select', required: true, options: [...ESENCIAS] },
      { name: 'roles', label: 'Roles (máx 2)', type: 'multi-select', required: true, options: [...ROLES], max: 2 },
      { name: 'catHabilidad', label: 'Categoría de Habilidad', type: 'select', required: true, options: [...CAT_HABILIDAD] },
      { name: 'efectoPasivo', label: 'Efecto Pasivo', type: 'textarea', required: false, placeholder: 'Efecto siempre activo mientras está en campo...' },
      { name: 'efectoDisparo', label: 'Efecto Disparo', type: 'textarea', required: false, placeholder: 'Efecto que se activa pagando Éter...' },
      { name: 'disparoAgota', label: 'Disparo: ¿Agota al Campeón?', type: 'select', required: false, options: ['Sí', 'No'], placeholder: 'Solo si tiene efecto Disparo' },
      { name: 'disparoUnSoloUso', label: 'Disparo: ¿Es de un solo uso?', type: 'select', required: false, options: ['Sí', 'No'], placeholder: 'Solo si tiene efecto Disparo' },
      { name: 'efectoContinuo', label: 'Efecto Continuo', type: 'textarea', required: false, placeholder: 'Efecto permanente mientras la carta esté en campo...' },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false, placeholder: 'Ambientación...' },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
      ...META_FIELDS,
    ],
  },
  {
    type: 'Mística',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Tormenta de Maná' },
      { name: 'facciones', label: 'Facciones (máx 3)', type: 'multi-select', required: false, options: [...FACCIONES], max: 3 },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'efecto', label: 'Efecto', type: 'textarea', required: true, placeholder: 'Describe el efecto mágico...' },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
      ...META_FIELDS,
    ],
  },
  {
    type: 'Arcana',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: El Juicio Final' },
      { name: 'facciones', label: 'Facciones (máx 3)', type: 'multi-select', required: false, options: [...FACCIONES], max: 3 },
      { name: 'cost', label: 'Coste de Éter', type: 'number', required: true, min: 0, max: 20 },
      { name: 'condicion', label: 'Condición de Activación', type: 'textarea', required: true },
      { name: 'recompensa', label: 'Recompensa', type: 'textarea', required: true },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
      ...META_FIELDS,
    ],
  },
  {
    type: 'Éter',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Corazón del Éter' },
      { name: 'cost', label: 'Valor de Éter', type: 'number', required: true, min: 1, max: 1 },
      { name: 'efectoReserva', label: 'Efecto en Reserva (2A)', type: 'textarea', required: false, placeholder: 'Efecto que da mientras está en la zona Reserva (solo 2 asignados)...' },
      { name: 'variantePago', label: 'Variante de Efecto de Pago', type: 'select', required: false, options: ['Pasivo', 'Gatillo'], placeholder: 'Sin efecto de pago' },
      { name: 'efectoPago', label: 'Efecto en Pago (1A)', type: 'textarea', required: false, placeholder: 'Pasivo: efecto constante al asignarse para pagar. Gatillo: efecto al activarse...' },
      { name: 'efectoBloqueo', label: 'Efecto en Bloqueo (1B-1F)', type: 'textarea', required: false, placeholder: 'Efecto que activa el rival al bloquear con esta carta...' },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
      ...META_FIELDS,
    ],
  },
  {
    type: 'Vínculo',
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Pacto de Sangre' },
      { name: 'facciones', label: 'Facciones (máx 3)', type: 'multi-select', required: false, options: [...FACCIONES], max: 3 },
      { name: 'efecto', label: 'Efecto PERMANENTE', type: 'textarea', required: true, placeholder: 'Efecto permanente a favor del dueño cuando es destruido (solo Ruptura lo destruye)...' },
      { name: 'keywords', label: 'Palabras Clave', type: 'multi-select', required: false },
      { name: 'flavorText', label: 'Texto de Sabor', type: 'textarea', required: false },
      { name: 'limiteCopias', label: 'Límite por Mazo', type: 'select', required: false, options: ['1', '2', '3'] },
      ...META_FIELDS,
    ],
  },
]

export function getFormConfig(type: CardType): CardFormConfig {
  return FORM_CONFIGS.find((c) => c.type === type) ?? FORM_CONFIGS[0]
}
