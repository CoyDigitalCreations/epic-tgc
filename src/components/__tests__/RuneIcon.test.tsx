import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FACCIONES, FACCION_RUNES } from '../../types'
import { RuneIcon } from '../card-art/RuneIcon'

describe('RuneIcon', () => {
  it('tiene una runa definida y no vacía para cada facción', () => {
    for (const faccion of FACCIONES) {
      expect(FACCION_RUNES[faccion], `runa de ${faccion}`).toBeDefined()
      expect(FACCION_RUNES[faccion].trim().length).toBeGreaterThan(0)
    }
  })

  it('cada facción tiene una runa DISTINTA (glifo único)', () => {
    const paths = FACCIONES.map((f) => FACCION_RUNES[f])
    expect(new Set(paths).size).toBe(FACCIONES.length)
  })

  it('las runas solo usan comandos válidos de path SVG', () => {
    const validCommands = /^[MmLlHhVvCcSsQqTtAaZz\s\d.,-]+$/
    for (const faccion of FACCIONES) {
      expect(
        validCommands.test(FACCION_RUNES[faccion]),
        `path inválido en runa de ${faccion}`,
      ).toBe(true)
    }
  })

  it('renderiza un SVG con el path de la facción', () => {
    const { container } = render(<RuneIcon faccion="Orden" size={30} color="#22d3ee" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('width')).toBe('30')
    expect(svg?.getAttribute('height')).toBe('30')
    expect(svg?.getAttribute('stroke')).toBe('#22d3ee')
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toBe(FACCION_RUNES.Orden)
  })

  it('expone un testid por facción para tests de integración', () => {
    render(<RuneIcon faccion="Mutación" />)
    expect(screen.getByTestId('rune-Mutación')).toBeInTheDocument()
  })
})
