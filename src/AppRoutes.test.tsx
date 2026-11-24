import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppFallback, AppRoutes } from './AppRoutes'

/**
 * AppRoutes testea el CONTRATO de ruteo + lazy boundaries.
 * Los apps pesados (forge/online) se mockean: sus internals tienen sus
 * propios tests. Cargar chunks reales aquí introduce flakiness (IndexedDB/
 * zustand persist bajo paralelismo de vitest) sin validar nada extra del
 * módulo bajo test.
 */
vi.mock('./forge/App', () => ({
  default: () => <div>Card Creator — Alpha</div>,
}))
vi.mock('./online/OnlineApp', () => ({
  default: () => <button>Comenzar partida</button>,
}))

vi.mock('./balance/Balance', () => ({
  default: () => <h1>Tablero de balance (mock)</h1>,
}))

// La puerta de administración consulta a Supabase: aquí se controla el resultado. Por defecto «sin-supabase» (desarrollo local: no bloquea).
const puerta = vi.hoisted(() => ({ estado: 'sin-supabase' as string }))
vi.mock('./forge/auth/adminApi', () => ({
  estadoAdmin: () => Promise.resolve(puerta.estado),
  entrarComoAdmin: vi.fn(),
  entrarAdminConGoogle: vi.fn(),
  salirDeAdmin: vi.fn(),
}))

describe('AppRoutes', () => {
  beforeEach(() => {
    puerta.estado = 'sin-supabase'
  })

  it('renderiza la landing en / sin montar el card maker (lazy)', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    // El enlace al Card Maker solo aparece cuando la sesión es de administración (aquí: «sin-supabase», desarrollo local)
    expect(await screen.findByRole('link', { name: /card maker/i })).toBeInTheDocument()
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

  it('monta el tablero de balance en /balance (lazy) y no en la raíz', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Tablero de balance (mock)')).not.toBeInTheDocument()
  })

  it('carga el tablero de balance al entrar en /balance', async () => {
    render(
      <MemoryRouter initialEntries={['/balance']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Tablero de balance (mock)')).toBeInTheDocument()
  })

  it.each([
    ['/balance', 'Tablero de balance (mock)', 'Tablero de balance'],
    ['/card-maker', 'Card Creator — Alpha', 'Card-Maker'],
  ])('%s pide acceso de administración: sin sesión no monta su contenido', async (ruta, contenido, titulo) => {
    puerta.estado = 'no-sesion'
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(screen.queryByText(contenido)).not.toBeInTheDocument()
  })

  it('una cuenta que no es de administración tampoco ve el tablero de balance', async () => {
    puerta.estado = 'no-admin'
    render(
      <MemoryRouter initialEntries={['/balance']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/no es de administración/i)).toBeInTheDocument()
    expect(screen.queryByText('Tablero de balance (mock)')).not.toBeInTheDocument()
  })

  it('un administrador ve el tablero de balance', async () => {
    puerta.estado = 'admin'
    render(
      <MemoryRouter initialEntries={['/balance']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Tablero de balance (mock)')).toBeInTheDocument()
  })

  it('el menú online sigue siendo público aunque no haya sesión de administración', async () => {
    puerta.estado = 'no-sesion'
    render(
      <MemoryRouter initialEntries={['/epiconline']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
  })
})

describe('AppFallback', () => {
  it('muestra el mensaje de carga mientras se resuelve el chunk lazy', () => {
    render(<AppFallback />)
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })
})
