import { CARD_TYPES, RARITIES, KEYWORDS } from '../types'
import type { CardType, AnyCard } from '../types'
import { FORM_CONFIGS } from '../types/form-config'

/** Fields that live inside `stats` sub-object instead of flat on the card */
const STATS_FIELDS = new Set(['cost', 'poder', 'resistencia', 'duracion'])

export interface ValidationError {
  field: string
  message: string
}

export function validateCard(card: Partial<AnyCard>): ValidationError[] {
  const errors: ValidationError[] = []
  const config = FORM_CONFIGS.find((c) => c.type === card.type)

  if (!config) {
    errors.push({ field: 'type', message: 'Tipo de carta inválido' })
    return errors
  }

  for (const field of config.fields) {
    const value = STATS_FIELDS.has(field.name)
      ? (card.stats as unknown as Record<string, unknown>)?.[field.name]
      : (card as Record<string, unknown>)[field.name]

    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors.push({ field: field.name, message: `${field.label} es requerido` })
        continue
      }
    }

    if (field.type === 'number' && value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      if (isNaN(num)) {
        errors.push({ field: field.name, message: `${field.label} debe ser un número` })
      } else if (field.min !== undefined && num < field.min) {
        errors.push({ field: field.name, message: `${field.label} mínimo es ${field.min}` })
      } else if (field.max !== undefined && num > field.max) {
        errors.push({ field: field.name, message: `${field.label} máximo es ${field.max}` })
      }
    }

    if (field.type === 'select' && field.options && value) {
      if (!field.options.includes(value as string)) {
        errors.push({ field: field.name, message: `${field.label} inválido` })
      }
    }
  }

  return errors
}

export function isValidCardType(type: string): type is CardType {
  return CARD_TYPES.includes(type as CardType)
}

export function isValidRarity(rarity: string): boolean {
  return RARITIES.includes(rarity as never)
}

export function isValidKeywords(kws: string[]): boolean {
  return kws.every((kw) => KEYWORDS.includes(kw as never))
}
