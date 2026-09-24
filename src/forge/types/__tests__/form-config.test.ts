import { describe, it, expect } from 'vitest'
import { META_FIELDS, FORM_CONFIGS } from '../form-config'

describe('form-config — campo paquete (paquetes personalizados)', () => {
  it('META_FIELDS incluye paqueteId con type "paquete"', () => {
    const paquete = META_FIELDS.find((f) => f.name === 'paqueteId')
    expect(paquete).toBeDefined()
    expect(paquete?.type).toBe('paquete')
    expect(paquete?.label).toBe('Paquete')
    expect(paquete?.required).toBe(false)
  })

  it('META_FIELDS incluye id para número de serie', () => {
    const idField = META_FIELDS.find((f) => f.name === 'id')
    expect(idField).toBeDefined()
    expect(idField?.type).toBe('text')
  })

  it('todos los FORM_CONFIGS heredan el campo paquete vía META_FIELDS', () => {
    for (const config of FORM_CONFIGS) {
      expect(config.fields.some((f) => f.name === 'paqueteId')).toBe(true)
    }
  })
})
