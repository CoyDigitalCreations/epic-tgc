import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppFallback, AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it('renderiza la landing en / sin montar el card maker (lazy)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /card maker/i })).toBeInTheDocument()
    // El chunk de forge no se monta en la raíz: su header no debe existir
    expect(screen.queryByText('Card Creator — Alpha')).not.toBeInTheDocument()
  })

  it('redirige una ruta desconocida a /', async () => {
    render(
      <MemoryRouter initialEntries={['/xyz']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('link', { name: /card maker/i }),
    ).toBeInTheDocument()
  })

  it('monta el card maker en /card-maker (lazy)', async () => {
    render(
      <MemoryRouter initialEntries={['/card-maker']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Card Creator — Alpha')).toBeInTheDocument()
  })

  it('monta el menú de Éter Online en /epiconline', async () => {
    render(
      <MemoryRouter initialEntries={['/epiconline']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('button', { name: 'Comenzar partida' }),
    ).toBeInTheDocument()
  })
})

describe('AppFallback', () => {
  it('muestra el mensaje de carga mientras se resuelve el chunk lazy', () => {
    render(<AppFallback />)
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })
})
