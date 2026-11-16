import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

const estadoAdmin = vi.fn()
const entrarComoAdmin = vi.fn()
const salirDeAdmin = vi.fn()

vi.mock('../adminApi', () => ({
  estadoAdmin: () => estadoAdmin(),
  entrarComoAdmin: (u: string, c: string) => entrarComoAdmin(u, c),
  salirDeAdmin: () => salirDeAdmin(),
}))

import AdminGate from '../AdminGate'

function montar() {
  return render(
    <MemoryRouter>
      <AdminGate>
        <div>Contenido del Card-Maker</div>
      </AdminGate>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminGate', () => {
  it('sin Supabase configurado deja pasar al Card-Maker', async () => {
    estadoAdmin.mockResolvedValue('sin-supabase')
    montar()
    expect(await screen.findByText('Contenido del Card-Maker')).toBeInTheDocument()
  })

  it('sin sesión muestra el acceso y NO el Card-Maker', async () => {
    estadoAdmin.mockResolvedValue('no-sesion')
    montar()
    expect(await screen.findByRole('form', { name: 'Acceso de administración' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido del Card-Maker')).not.toBeInTheDocument()
  })

  it('entra con usuario y contraseña y muestra el Card-Maker', async () => {
    estadoAdmin.mockResolvedValueOnce('no-sesion').mockResolvedValue('admin')
    entrarComoAdmin.mockResolvedValue(undefined)
    montar()
    const usuario = await screen.findByLabelText('Usuario')
    await userEvent.type(usuario, 'maker')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Contenido del Card-Maker')).toBeInTheDocument()
    expect(entrarComoAdmin).toHaveBeenCalledWith('maker', 'secreto')
  })

  it('con credenciales incorrectas muestra el error y sigue sin dejar pasar', async () => {
    estadoAdmin.mockResolvedValue('no-sesion')
    entrarComoAdmin.mockRejectedValue(new Error('Usuario o contraseña incorrectos.'))
    montar()
    await userEvent.type(await screen.findByLabelText('Usuario'), 'maker')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.queryByText('Contenido del Card-Maker')).not.toBeInTheDocument()
  })

  it('una cuenta que no es de administración recibe el aviso y el formulario', async () => {
    estadoAdmin.mockResolvedValue('no-admin')
    montar()
    expect(await screen.findByText(/no es de administración/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
    expect(screen.queryByText('Contenido del Card-Maker')).not.toBeInTheDocument()
  })

  it('un administrador ve el Card-Maker y puede cerrar sesión', async () => {
    estadoAdmin.mockResolvedValueOnce('admin').mockResolvedValue('no-sesion')
    salirDeAdmin.mockResolvedValue(undefined)
    montar()
    expect(await screen.findByText('Contenido del Card-Maker')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Cerrar sesión de administración/ }))
    expect(salirDeAdmin).toHaveBeenCalled()
    expect(await screen.findByRole('form', { name: 'Acceso de administración' })).toBeInTheDocument()
  })
})
