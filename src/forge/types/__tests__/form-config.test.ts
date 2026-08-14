import { describe, it, expect } from 'vitest'
import { META_FIELDS, FORM_CONFIGS } from '../form-config'

describe('form-config — campo paquete (paquetes personalizados)', () => {
  it('META_FIELDS incluye paqueteId con type "paquete" en primera posición', () => {
    const paquete = META_FIELDS.find((f) => f.name === 'paqueteId')
    expect(paquete).toBeDefined()
    expect(paquete?.type).toBe('paquete')
    expect(paquete?.label).toBe('Paquete')
    expect(paquete?.required).toBe(false)
    expect(META_FIELDS[0].name).toBe('paqueteId')
  })

  it('todos los FORM_CONFIGS heredan el campo paquete vía META_FIELDS', () => {
    for (const config of FORM_CONFIGS) {
      expect(config.fields.some((f) => f.name === 'paqueteId')).toBe(true)
    }
  })
})
