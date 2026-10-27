import { describe, it, expect } from 'vitest'
import { validateCard, isValidCardType, isValidRarity, isValidKeywords } from './validation'

describe('isValidCardType', () => {
  it('returns true for valid types', () => {
    expect(isValidCardType('Campeón')).toBe(true)
    expect(isValidCardType('Éter')).toBe(true)
  })

  it('returns false for invalid types', () => {
    expect(isValidCardType('Mago')).toBe(false)
    expect(isValidCardType('')).toBe(false)
  })
})

describe('isValidRarity', () => {
  it('returns true for valid rarities', () => {
    expect(isValidRarity('Legendaria')).toBe(true)
    expect(isValidRarity('Común')).toBe(true)
  })

  it('returns false for invalid rarities', () => {
    expect(isValidRarity('Ultra Rara')).toBe(false)
  })
})

describe('isValidKeywords', () => {
  it('returns true for valid keywords', () => {
    expect(isValidKeywords(['Carga', 'Vigor'])).toBe(true)
  })

  it('returns false if any keyword is invalid', () => {
    expect(isValidKeywords(['Carga', 'Invencible'])).toBe(false)
  })

  it('returns true for empty array', () => {
    expect(isValidKeywords([])).toBe(true)
  })
})

describe('validateCard', () => {
  it('returns error for missing name on Campeón', () => {
    const errors = validateCard({ type: 'Campeón', name: '' })
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('returns error for negative cost', () => {
    const errors = validateCard({ type: 'Campeón', name: 'Test', stats: { cost: -1, poder: 100, resistencia: 100 } })
    expect(errors.some((e) => e.field === 'cost')).toBe(true)
  })

  it('returns error for invalid card type', () => {
    const errors = validateCard({ type: 'Invalido' as never })
    expect(errors.some((e) => e.field === 'type')).toBe(true)
  })

  it('passes for a valid Campeón with minimum fields', () => {
    const errors = validateCard({
      type: 'Campeón',
      name: 'Aurelion',
      facciones: ['Orden'],
      esencia: 'Mago',
      roles: ['Normal'],
      catHabilidad: 'Efecto',
      stats: { cost: 3, poder: 1000, resistencia: 800 },
    })
    expect(errors.filter((e) => e.field !== 'name')).toHaveLength(0)
  })

  it('returns error for poder exceeding max', () => {
    const errors = validateCard({
      type: 'Campeón',
      name: 'Test',
      stats: { cost: 1, poder: 99999, resistencia: 1 },
    })
    expect(errors.some((e) => e.field === 'poder')).toBe(true)
  })

  it('validates Arcana fields', () => {
    // condicion is optional — empty value should NOT trigger an error
    const errors = validateCard({ type: 'Arcana', condicion: '' })
    expect(errors.some((e) => e.field === 'condicion')).toBe(false)
  })
})

describe('validateCard — efectos a medio configurar (se jugarían sin hacer nada)', () => {
  const mistica = (efecto: object) => ({
    id: 'T-1', name: 'Prueba', type: 'Mística', rarity: 'Común', keywords: [], flavorText: '', paqueteId: 'test', limiteCopias: '1',
    createdAt: '', updatedAt: '', facciones: ['Orden'], stats: { cost: 1 }, efectos: [{ tipo: 'hechizo', ...efecto }],
  }) as never
  const mensajes = (efecto: object) => validateCard(mistica(efecto)).filter((e) => e.field === 'efectos').map((e) => e.message)

  it('modificar_regla sin regla, con una operación que no sirve o sin valor numérico', () => {
    expect(mensajes({ efecto: 'modificar_regla' })).toEqual(['Efecto 1: elige qué regla del manual modifica'])
    expect(mensajes({ efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'prohibir' } })).toHaveLength(1)
    expect(mensajes({ efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar' } })).toEqual(['Efecto 1: indica el valor de la regla'])
    expect(mensajes({ efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 2 } })).toEqual([])
    expect(mensajes({ efecto: 'modificar_regla', regla: { id: 'atacarAgota', operacion: 'prohibir' } })).toEqual([])
  })
  it('change_type exige al menos Facción, Esencia o Rol', () => {
    expect(mensajes({ efecto: 'change_type' })).toHaveLength(1)
    expect(mensajes({ efecto: 'change_type', cambioTipo: {} })).toHaveLength(1)
    expect(mensajes({ efecto: 'change_type', cambioTipo: { faccion: 'Caos' } })).toEqual([])
  })
  it('copy, grant_keyword, negar e invocar_y_equipar exigen su dato', () => {
    expect(mensajes({ efecto: 'copy' })).toHaveLength(1)
    expect(mensajes({ efecto: 'grant_keyword' })).toHaveLength(1)
    expect(mensajes({ efecto: 'negar' })).toHaveLength(1)
    expect(mensajes({ efecto: 'invocar_y_equipar' })).toHaveLength(1)
    expect(mensajes({ efecto: 'grant_keyword', keyword: 'Carga' })).toEqual([])
  })
  it('negar solo acepta los tipos de negación que el motor ejecuta', () => {
    for (const tipoNegacion of ['activacion', 'efecto_activo']) expect(mensajes({ efecto: 'negar', tipoNegacion })).toEqual([])
    for (const tipoNegacion of ['invocacion', 'resolucion', 'pago', 'ataque', 'bloqueo', 'robo']) {
      expect(mensajes({ efecto: 'negar', tipoNegacion })).toEqual([`Efecto 1: negar «${tipoNegacion}» todavía no está implementado: usa «activacion» o «efecto_activo»`])
    }
  })
  describe('prevent_destroy y su trigger (Rowena): solo funcionan juntos', () => {
    const campeon = (efecto: object) => ({
      id: 'T-2', name: 'Rowena', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '', paqueteId: 'test', limiteCopias: '1',
      createdAt: '', updatedAt: '', facciones: ['Orden'], esencia: 'Constructo', roles: ['Normal'], catHabilidad: ['Efecto'],
      stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [{ tipo: 'pasivo', ...efecto }],
    }) as never
    const msj = (efecto: object) => validateCard(campeon(efecto)).filter((e) => e.field === 'efectos').map((e) => e.message)
    const BIEN = { efecto: 'prevent_destroy', trigger: 'cuando_vinculo_seria_destruido', costo: { tipo: 'exile_self' } }

    it('completo, como Rowena, es válido', () => expect(msj(BIEN)).toEqual([]))
    it('sin el trigger, o sin pagar exiliando la carta, no hace nada y se rechaza', () => {
      expect(msj({ ...BIEN, trigger: undefined })).toHaveLength(1)
      expect(msj({ ...BIEN, costo: undefined })).toHaveLength(1)
      expect(msj({ ...BIEN, costo: { tipo: 'eter', cantidad: 1 } })).toHaveLength(1)
    })
    it('el trigger con otro efecto tampoco sirve', () => {
      expect(msj({ efecto: 'draw', trigger: 'cuando_vinculo_seria_destruido' })).toEqual(['Efecto 1: el trigger «Cuando Vínculo sería destruido» solo sirve con el efecto «Prevenir destrucción»'])
    })
    it('solo un Campeón puede tenerlo', () => {
      expect(validateCard(mistica(BIEN)).filter((e) => e.field === 'efectos')).toHaveLength(1)
    })
  })
  it('los efectos sin dato obligatorio (scry, redirect, direct_attack...) no dan error', () => {
    for (const efecto of ['scry', 'redirect', 'direct_attack', 'draw']) expect(mensajes({ efecto })).toEqual([])
  })
})
