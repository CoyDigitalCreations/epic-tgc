// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validarNombre } from '../../backend/perfilApi'
import { useMazosStore } from '../../useMazosStore'
import Perfil from '../Perfil'

vi.mock('../../backend/mazosNube', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../backend/mazosNube')>()),
  subirMazo: vi.fn().mockResolvedValue(true),
  borrarMazoNube: vi.fn().mockResolvedValue(true),
  listarMazosNube: vi.fn().mockResolvedValue(null),
}))

// El .env.local del desarrollador puede traer las claves reales: estos tests nunca deben hablar con la nube
vi.mock('../../backend/supabase', () => ({ getSupabase: () => null, supabaseConfigurado: () => false, supabaseUrl: () => '' }))

describe('validarNombre', () => {
  it('limpia espacios sobrantes', () => {
    expect(validarNombre('  Ana   Luz ')).toEqual({ ok: true, nombre: 'Ana Luz' })
  })
  it('rechaza vacío y demasiado largo', () => {
    expect(validarNombre('   ')).toMatchObject({ ok: false })
    expect(validarNombre('x'.repeat(25))).toMatchObject({ ok: false })
    expect(validarNombre('x'.repeat(24))).toMatchObject({ ok: true })
  })
})

describe('Perfil (sin Supabase configurado)', () => {
  beforeEach(() => useMazosStore.setState({ mazosPersonalizados: [] }))
  afterEach(() => vi.restoreAllMocks())

  it('avisa que sin conexión los mazos viven en este navegador', () => {
    render(<MemoryRouter><Perfil /></MemoryRouter>)
    expect(screen.getByText(/necesita la conexión con Supabase/i)).toBeInTheDocument()
    expect(screen.getByText(/Aún no tienes mazos/i)).toBeInTheDocument()
  })

  it('lista los mazos y permite borrar uno tras confirmar', async () => {
    useMazosStore.setState({ mazosPersonalizados: [{ id: '11111111-1111-4111-8111-111111111111', nombre: 'Mi mazo', cardIds: Array(66).fill('a') }] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><Perfil /></MemoryRouter>)
    expect(screen.getByText('Mi mazo')).toBeInTheDocument()
    expect(screen.getByText('66 cartas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('si no confirmas, el mazo se queda', async () => {
    useMazosStore.setState({ mazosPersonalizados: [{ id: '11111111-1111-4111-8111-111111111111', nombre: 'Mi mazo', cardIds: [] }] })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<MemoryRouter><Perfil /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(1)
  })
})
