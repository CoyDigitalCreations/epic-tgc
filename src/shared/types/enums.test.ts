import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CARD_TYPES,
  RARITIES,
  KEYWORDS,
  FACCIONES,
  FACCION_COLORS,
  FACCION_IMAGES,
  ROLES,
  FACCION_LORE,
} from './enums'

describe('CARD_TYPES', () => {
  it('contiene los 5 tipos de carta', () => {
    expect(CARD_TYPES).toHaveLength(5)
    expect(CARD_TYPES).toContain('Éter')
    expect(CARD_TYPES).toContain('Campeón')
    expect(CARD_TYPES).toContain('Mística')
    expect(CARD_TYPES).toContain('Arcana')
    expect(CARD_TYPES).toContain('Vínculo')
  })
})

describe('RARITIES', () => {
  it('contiene 6 rarezas en orden ascendente', () => {
    expect(RARITIES).toHaveLength(6)
    expect(RARITIES[0]).toBe('Común')
    expect(RARITIES[RARITIES.length - 1]).toBe('Única')
  })
})

describe('KEYWORDS', () => {
  it('contiene las 10 keywords oficiales v2.0', () => {
    expect(KEYWORDS).toHaveLength(9)
    expect(KEYWORDS).toContain('Carga')
    expect(KEYWORDS).toContain('Vigor')
    expect(KEYWORDS).toContain('Inmortal')
    expect(KEYWORDS).toContain('Indestructible')
    expect(KEYWORDS).toContain('Recarga')
    expect(KEYWORDS).toContain('Protector')
    expect(KEYWORDS).toContain('Artefacto')
    expect(KEYWORDS).toContain('Presteza')
    expect(KEYWORDS).toContain('Fugaz')
  })

  it('no contiene keywords eliminadas', () => {
    expect(KEYWORDS).not.toContain('Resonancia')
    expect(KEYWORDS).not.toContain('Transmutar')
    expect(KEYWORDS).not.toContain('Frenesí')
    expect(KEYWORDS).not.toContain('Fracturar')
  })
})

describe('FACCIONES', () => {
  it('contiene las 8 facciones v2.0', () => {
    expect(FACCIONES).toHaveLength(8)
    expect(FACCIONES).toContain('Orden')
    expect(FACCIONES).toContain('Caos')
    expect(FACCIONES).toContain('Creación')
    expect(FACCIONES).toContain('Destrucción')
    expect(FACCIONES).toContain('Ley')
    expect(FACCIONES).toContain('Purga')
    expect(FACCIONES).toContain('Entropía')
    expect(FACCIONES).toContain('Mutación')
  })

  it('asigna el color alineado con el medallón de cada facción', () => {
    expect(FACCION_COLORS.Orden).toBe('#e5e7eb')
    expect(FACCION_COLORS.Caos).toBe('#3b82f6')
    expect(FACCION_COLORS.Creación).toBe('#22c55e')
    expect(FACCION_COLORS.Destrucción).toBe('#ef4444')
    expect(FACCION_COLORS.Ley).toBe('#eab308')
    expect(FACCION_COLORS.Purga).toBe('#f97316')
    expect(FACCION_COLORS.Entropía).toBe('#a855f7')
    expect(FACCION_COLORS.Mutación).toBe('#22d3ee')
  })

  it('mapea cada facción a un medallón existente en public/', () => {
    for (const faccion of FACCIONES) {
      const file = FACCION_IMAGES[faccion]
      expect(file).toMatch(/^\/facciones_[a-z]+\.png$/)
      expect(
        existsSync(resolve(process.cwd(), 'public', file.replace(/^\//, ''))),
      ).toBe(true)
    }
  })
})

describe('ROLES', () => {
  it('incluye los 5 roles oficiales', () => {
    expect(ROLES).toHaveLength(5)
    expect(ROLES).toEqual(['Soberano', 'Emperador', 'Soporte', 'Éter', 'Normal'])
  })

  it('no incluye roles retirados ni el antiguo coste Sacrificio', () => {
    expect(ROLES).not.toContain('Asalto')
    expect(ROLES).not.toContain('Guardia')
    expect(ROLES).not.toContain('Control')
    expect(ROLES).not.toContain('Evolución')
    expect(ROLES).not.toContain('Sacrificio')
  })
})

describe('FACCION_LORE', () => {
  it('cubre las 8 facciones con faceta, runa y posición', () => {
    for (const faccion of FACCIONES) {
      const lore = FACCION_LORE[faccion]
      expect(lore.faceta.trim().length).toBeGreaterThan(0)
      expect(lore.runa.trim().length).toBeGreaterThan(0)
      expect(lore.posicion.trim().length).toBeGreaterThan(0)
    }
  })

  it('asigna los nombres primigenios del Eje', () => {
    expect(FACCION_LORE.Orden.faceta).toBe('Estásis')
    expect(FACCION_LORE.Caos.faceta).toBe('Disonancia')
    expect(FACCION_LORE.Creación.faceta).toBe('Vitalidad')
    expect(FACCION_LORE.Destrucción.faceta).toBe('Vacío')
  })

  it('asigna las posiciones del diagrama del Eje', () => {
    expect(FACCION_LORE.Orden.posicion).toBe('Norte')
    expect(FACCION_LORE.Caos.posicion).toBe('Sur')
    expect(FACCION_LORE.Creación.posicion).toBe('Este')
    expect(FACCION_LORE.Destrucción.posicion).toBe('Oeste')
    expect(FACCION_LORE.Ley.posicion).toBe('Noreste')
    expect(FACCION_LORE.Purga.posicion).toBe('Noroeste')
    expect(FACCION_LORE.Entropía.posicion).toBe('Sudoeste')
    expect(FACCION_LORE.Mutación.posicion).toBe('Sudeste')
  })
})
