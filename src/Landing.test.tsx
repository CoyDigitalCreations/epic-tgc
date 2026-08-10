import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import Landing from './Landing'

describe('Landing', () => {
  it('muestra enlaces de navegación a Card Maker y Éter Online', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const cardMaker = screen.getByRole('link', { name: /card maker/i })
    expect(cardMaker).toHaveAttribute('href', '/card-maker')
    const online = screen.getByRole('link', { name: /éter online/i })
    expect(online).toHaveAttribute('href', '/epiconline')
  })

  it('enlaza a los archivos estáticos Manual.html y primogenitos.html', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /manual/i })).toHaveAttribute(
      'href',
      'Manual.html',
    )
    expect(screen.getByRole('link', { name: /primogénitos/i })).toHaveAttribute(
      'href',
      'primogenitos.html',
    )
  })

  it('usa las clases del tema (font-display y surface)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('font-display')
    const cardMakerCard = screen.getByRole('link', { name: /card maker/i })
    expect(cardMakerCard.className).toContain('bg-surface')
  })
})
