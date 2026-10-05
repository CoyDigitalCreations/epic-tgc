// @vitest-environment jsdom
/**
 * Lobby online: UI mínima.
 * - Sin env Supabase → aviso de configuración
 * - Con env + auth mock → menú crear/unirse
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

const estado = vi.hoisted(() => ({ configurado: false }))

vi.mock('../../backend/supabase', () => ({
  supabaseConfigurado: () => estado.configurado,
  supabaseUrl: () => 'https://test.supabase.co',
  getSupabase: () => null,
}))

vi.mock('../../backend/matchApi', () => ({
  asegurarSesion: vi.fn(async () => 'user-1'),
  crearSala: vi.fn(async () => ({ gameId: 'g1', code: 'ABCDEF', seed: 1, player: 'A' })),
  unirseASala: vi.fn(async () => ({ gameId: 'g1', code: 'ABCDEF', seed: 1, player: 'B' })),
  iniciarPartida: vi.fn(),
  obtenerEstado: vi.fn(async () => ({ status: 'lobby', state: null, player: 'A' })),
  enviarAccion: vi.fn(),
  rendirse: vi.fn(),
}))

import Lobby from '../Lobby'
import { asegurarSesion } from '../../backend/matchApi'

describe('Lobby online', () => {
  it('sin env vars muestra instrucciones de configuración', () => {
    estado.configurado = false
    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Falta configurar Supabase/i)).toBeInTheDocument()
    expect(screen.getAllByText(/VITE_SUPABASE_URL/).length).toBeGreaterThan(0)
  })

  it('con env: botón Entrar → menú crear/unirse', async () => {
    const user = userEvent.setup()
    estado.configurado = true
    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(asegurarSesion).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /^crear sala$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /unirse con código/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ej\. /i)).toBeInTheDocument()
  })
})
