import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const guardarDorso = vi.fn()
const leerDorsoPerfil = vi.fn()
let configurado = false

vi.mock('../dorsoApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('../dorsoApi')>()
  return { ...real, guardarDorso: (id: number) => guardarDorso(id), leerDorsoPerfil: () => leerDorsoPerfil() }
})
vi.mock('../../backend/supabase', () => ({ getSupabase: () => null, supabaseConfigurado: () => configurado, supabaseUrl: () => '' }))

import { SelectorDorso } from '../SelectorDorso'
import { DORSOS } from '../dorsos'

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  configurado = false
  leerDorsoPerfil.mockResolvedValue(null)
  guardarDorso.mockResolvedValue(undefined)
})

describe('SelectorDorso', () => {
  it('muestra los 5 reversos y el inicial está elegido', async () => {
    render(<SelectorDorso />)
    const opciones = screen.getAllByRole('radio')
    expect(opciones).toHaveLength(DORSOS.length)
    expect(opciones[0]).toHaveAttribute('aria-checked', 'true')
    expect(opciones[1]).toHaveAttribute('aria-checked', 'false')
    await waitFor(() => expect(leerDorsoPerfil).toHaveBeenCalled())
  })

  it('al elegir uno lo marca y lo guarda', async () => {
    render(<SelectorDorso />)
    await userEvent.click(screen.getByRole('radio', { name: 'Marea' }))
    expect(screen.getByRole('radio', { name: 'Marea' })).toHaveAttribute('aria-checked', 'true')
    expect(guardarDorso).toHaveBeenCalledWith(2)
    expect(await screen.findByRole('status')).toHaveTextContent('Reverso guardado en este navegador.')
  })

  it('con Supabase avisa que el rival lo verá', async () => {
    configurado = true
    render(<SelectorDorso />)
    await userEvent.click(screen.getByRole('radio', { name: 'Panal' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Tu rival lo verá en tus cartas.')
  })

  it('si falla el guardado en el perfil lo dice, y la elección sigue marcada', async () => {
    guardarDorso.mockRejectedValue(new Error('permission denied'))
    render(<SelectorDorso />)
    await userEvent.click(screen.getByRole('radio', { name: 'Escamas' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/no en tu perfil.*permission denied/)
    expect(screen.getByRole('radio', { name: 'Escamas' })).toHaveAttribute('aria-checked', 'true')
  })

  it('lo que diga el perfil manda sobre la copia local', async () => {
    leerDorsoPerfil.mockResolvedValue(4)
    render(<SelectorDorso />)
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Panal' })).toHaveAttribute('aria-checked', 'true'))
  })

  it('volver a pulsar el ya elegido no guarda de nuevo', async () => {
    render(<SelectorDorso />)
    await userEvent.click(screen.getByRole('radio', { name: 'Retícula del Eje' }))
    expect(guardarDorso).not.toHaveBeenCalled()
  })
})
