import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardFrame, CostGem, EtherDiamond } from '../card-art'

describe('card-art', () => {
  describe('CostGem', () => {
    it('muestra el valor del coste', () => {
      render(<CostGem cost={7} />)
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  describe('EtherDiamond', () => {
    it('muestra el valor del Éter y la estrella', () => {
      render(<EtherDiamond value={1} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('✦')).toBeInTheDocument()
    })
  })

  describe('CardFrame', () => {
    it('genera un patrón de runas determinístico por variante', () => {
      // El patrón rúnico (polígonos) es determinístico; el gradiente usa useId (único por instancia, se ignora aquí)
      const runePoints = (el: HTMLElement) =>
        Array.from(el.querySelectorAll('polygon')).map((p) => p.getAttribute('points'))

      const { container: a1 } = render(<CardFrame accent="#f00" rarityColor="#fff" variant="Campeón" />)
      const { container: a2 } = render(<CardFrame accent="#f00" rarityColor="#fff" variant="Campeón" />)
      const { container: b } = render(<CardFrame accent="#f00" rarityColor="#fff" variant="Éter" />)

      expect(runePoints(a1)).toEqual(runePoints(a2))
      expect(runePoints(a1)).not.toEqual(runePoints(b))
    })

    it('dibuja los rects de borde y la filigrana de esquinas', () => {
      const { container } = render(<CardFrame accent="#f00" rarityColor="#fff" variant="Campeón" />)
      expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(3)
      expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(4)
    })
  })
})
