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

  it('enlaza a los archivos estáticos manual.html y primogenitos.html (rutas absolutas)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /^manual$/i })).toHaveAttribute(
      'href',
      '/manual.html',
    )
    expect(screen.getByRole('link', { name: /^primogénitos$/i })).toHaveAttribute(
      'href',
      '/primogenitos.html',
    )
  })

  it('agrega vínculos visibles al manual y al lore en el grid principal', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const manual = screen.getByRole('link', { name: /manual de reglas/i })
    expect(manual).toHaveAttribute('href', '/manual.html')
    expect(manual.className).toContain('bg-surface')
    const lore = screen.getByRole('link', { name: /los primogénitos/i })
    expect(lore).toHaveAttribute('href', '/primogenitos.html')
    expect(lore.className).toContain('bg-surface')
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
