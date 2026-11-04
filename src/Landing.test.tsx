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

  it('enlaza al manual (HTML estático) y al lore (ruta /lore de la app)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /^manual$/i })).toHaveAttribute(
      'href',
      '/manual.html',
    )
    expect(screen.getByRole('link', { name: /^primogénitos$/i })).toHaveAttribute('href', '/lore')
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
    expect(lore).toHaveAttribute('href', '/lore')
    expect(lore.className).toContain('bg-surface')
  })

  it('enlaza al tablero de balance con un único enlace a /balance', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const balance = screen.getByRole('link', { name: /tablero de balance/i })
    expect(balance).toHaveAttribute('href', '/balance')
    expect(balance.className).toContain('bg-surface')
    expect(screen.getByText('Mide el poder y los stats de cada carta')).toBeInTheDocument()
  })

  it('separa 2 destinos principales y 3 secundarios en filas distintas', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const filaPrincipal = screen.getByRole('link', { name: /card maker/i }).parentElement
    const filaSecundaria = screen.getByRole('link', { name: /tablero de balance/i }).parentElement
    expect(filaPrincipal).toHaveClass('sm:grid-cols-2')
    expect(filaSecundaria).toHaveClass('sm:grid-cols-3')
    expect(filaSecundaria).not.toBe(filaPrincipal)
    expect(filaSecundaria?.querySelectorAll('a')).toHaveLength(3)
    expect(filaPrincipal?.querySelectorAll('a')).toHaveLength(2)
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
