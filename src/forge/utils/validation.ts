import { CARD_TYPES, RARITIES, KEYWORDS } from '../../shared/types'
import type { CardType, AnyCard } from '../../shared/types'
import { FORM_CONFIGS } from '../types/form-config'
import { REGLA_IDS, esReglaNumerica, operacionesDe } from '../../shared/rules/reglas'

/** Tipos de negación que el motor ejecuta (el resto se jugaría como «activacion»). Ver executeEffect `negar`. */
const TIPOS_NEGACION_IMPLEMENTADOS: readonly string[] = ['activacion', 'efecto_activo']

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
      if (field.type === 'multi-select' && Array.isArray(value) && value.length === 0) {
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

    if (field.type === 'select' && field.options && value !== undefined && value !== null && value !== '') {
      const strValue = String(value)
      if (!field.options.includes(strValue)) {
        errors.push({ field: field.name, message: `${field.label} inválido` })
      }
    }
  }

  errors.push(...validarEfectos(card))
  return errors
}

/**
 * Un efecto con un dato obligatorio sin completar se juega SIN HACER NADA (el motor no tiene en qué actuar), así que
 * el Card-Maker no deja guardarlo: `modificar_regla` necesita su regla, `change_type` en qué se convierte, `copy` qué
 * copiar, `grant_keyword` la keyword, `negar` qué niega e `invocar_y_equipar` de dónde.
 */
function validarEfectos(card: Partial<AnyCard>): ValidationError[] {
  const efectos = 'efectos' in card && Array.isArray(card.efectos) ? card.efectos : []
  const errors: ValidationError[] = []
  efectos.forEach((e, i) => {
    const donde = `Efecto ${i + 1}`
    const falta = (message: string) => errors.push({ field: 'efectos', message: `${donde}: ${message}` })
    // Ese trigger solo lo lee el sistema de prevención de destrucción: con cualquier otro efecto nunca se dispara
    if (e.trigger === 'cuando_vinculo_seria_destruido' && e.efecto !== 'prevent_destroy') {
      return falta('el trigger «Cuando Vínculo sería destruido» solo sirve con el efecto «Prevenir destrucción»')
    }
    switch (e.efecto) {
      case 'modificar_regla': {
        const regla = e.regla
        if (!regla || !REGLA_IDS.includes(regla.id)) return falta('elige qué regla del manual modifica')
        if (!operacionesDe(regla.id).includes(regla.operacion)) return falta(`la operación '${regla.operacion}' no sirve para esa regla`)
        if (esReglaNumerica(regla.id) && regla.valor === undefined) return falta('indica el valor de la regla')
        return
      }
      case 'change_type':
        if (!e.cambioTipo || !(e.cambioTipo.esencia || e.cambioTipo.rol || e.cambioTipo.faccion)) return falta('elige Facción, Esencia o Rol en que se convierte')
        return
      case 'copy':
        if (!e.copyAttributes?.length) return falta('elige qué atributos copia')
        return
      case 'grant_keyword':
        if (!e.keyword) return falta('elige la keyword que otorga')
        return
      case 'negar':
        if (!e.tipoNegacion) return falta('elige qué niega')
        // El motor solo implementa negar la activación pendiente y los efectos activos de un Campeón; los otros tipos se
        // jugarían como «activacion» (no hacen lo que dicen)
        if (!TIPOS_NEGACION_IMPLEMENTADOS.includes(e.tipoNegacion)) {
          return falta(`negar «${e.tipoNegacion}» todavía no está implementado: usa «activacion» o «efecto_activo»`)
        }
        return
      case 'prevent_destroy':
        // Lo único que el motor sabe prevenir: la destrucción de un Vínculo, con ESTE trigger, pagando exiliar la carta
        if (card.type !== 'Campeón') return falta('«Prevenir destrucción» solo funciona en un Campeón en el campo')
        if (e.trigger !== 'cuando_vinculo_seria_destruido') return falta('«Prevenir destrucción» necesita el trigger «Cuando Vínculo sería destruido»')
        if (e.costo?.tipo !== 'exile_self') return falta('«Prevenir destrucción» se paga exiliando esta carta (costo «Exiliar esta carta»)')
        return
      case 'invocar_y_equipar':
        if (!e.zonaOrigen) return falta('elige de qué zona invoca')
        return
    }
  })
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
