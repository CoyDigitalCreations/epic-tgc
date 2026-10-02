import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppFallback, AppRoutes } from './AppRoutes'

/**
 * AppRoutes testea el CONTRATO de ruteo + lazy boundaries.
 * Los apps pesados (forge/online) se mockean: sus internals tienen sus
 * propios tests. Cargar chunks reales acá introduce flakiness (IndexedDB/
 * zustand persist bajo paralelismo de vitest) sin validar nada extra del
 * módulo bajo test.
 */
vi.mock('./forge/App', () => ({
  default: () => <div>Card Creator — Alpha</div>,
}))
vi.mock('./online/OnlineApp', () => ({
  default: () => <button>Comenzar partida</button>,
}))

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
