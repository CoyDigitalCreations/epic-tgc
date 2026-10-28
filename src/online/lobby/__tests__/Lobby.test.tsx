// @vitest-environment jsdom
/**
 * Lobby online: UI mínima.
 * - Sin env Supabase → aviso de configuración
 * - Con env + auth mock → menú crear/unirse
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  obtenerEstado: vi.fn(async () => ({
    status: 'lobby',
    state: null,
    player: 'A',
    bothPlayers: false,
  })),
  enviarAccion: vi.fn(),
  rendirse: vi.fn(),
}))

import Lobby from '../Lobby'
import { asegurarSesion, obtenerEstado, rendirse } from '../../backend/matchApi'

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

describe('Lobby online: reconexión tras refrescar', () => {
  const guardada = { gameId: 'g9', code: 'QWERTY', seed: 1, player: 'B' }
  const entrarAlLobby = async () => {
    const user = userEvent.setup()
    estado.configurado = true
    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /entrar/i }))
  }

  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(obtenerEstado).mockClear()
  })

  it('crear sala deja la partida guardada', async () => {
    await entrarAlLobby()
    await userEvent.setup().click(await screen.findByRole('button', { name: /^crear sala$/i }))
    expect(JSON.parse(window.localStorage.getItem('eter-online:partida')!)).toMatchObject({ gameId: 'g1', player: 'A' })
  })

  it('cancelar la sala de espera la cierra en el servidor y olvida la partida', async () => {
    vi.mocked(rendirse).mockClear()
    await entrarAlLobby()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^crear sala$/i }))
    await user.click(await screen.findByRole('button', { name: /cancelar sala/i }))
    expect(rendirse).toHaveBeenCalledWith('g1')
    expect(window.localStorage.getItem('eter-online:partida')).toBeNull()
    expect(await screen.findByRole('button', { name: /^crear sala$/i })).toBeInTheDocument()
  })

  it('con una partida viva guardada, entrar vuelve directo a ella (no al menú)', async () => {
    window.localStorage.setItem('eter-online:partida', JSON.stringify(guardada))
    vi.mocked(obtenerEstado).mockResolvedValue({ status: 'playing', state: null, player: 'B', bothPlayers: true } as never)
    await entrarAlLobby()
    expect(await screen.findByText(/Sala QWERTY/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^crear sala$/i })).not.toBeInTheDocument()
    expect(obtenerEstado).toHaveBeenCalledWith('g9')
  })

  it('con una sala en espera guardada, vuelve a la sala de espera', async () => {
    window.localStorage.setItem('eter-online:partida', JSON.stringify(guardada))
    vi.mocked(obtenerEstado).mockResolvedValue({ status: 'lobby', state: null, player: 'B', bothPlayers: false } as never)
    await entrarAlLobby()
    expect(await screen.findByText(/Esperando al rival/)).toBeInTheDocument()
  })

  it('si la partida ya terminó o no existe, la olvida y deja el menú', async () => {
    window.localStorage.setItem('eter-online:partida', JSON.stringify(guardada))
    vi.mocked(obtenerEstado).mockResolvedValue({ status: 'finished', state: null, player: 'B', bothPlayers: true } as never)
    await entrarAlLobby()
    expect(await screen.findByRole('button', { name: /^crear sala$/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('eter-online:partida')).toBeNull()

    window.localStorage.setItem('eter-online:partida', JSON.stringify(guardada))
    vi.mocked(obtenerEstado).mockRejectedValue(new Error('game not found'))
    cleanup()
    await entrarAlLobby()
    expect(await screen.findByRole('button', { name: /^crear sala$/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('eter-online:partida')).toBeNull()
  })
})
