import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

// La landing consulta la sesión de administración a demanda (import dinámico): aquí se controla el resultado.
const sesion = vi.hoisted(() => ({ estado: 'sin-supabase' as string }))
const entrarAdminConGoogle = vi.fn()
const cerrarSesion = vi.fn()

vi.mock('./forge/auth/adminApi', () => ({
  estadoAdmin: () => Promise.resolve(sesion.estado),
  entrarAdminConGoogle: () => entrarAdminConGoogle(),
}))
vi.mock('./online/backend/perfilApi', () => ({
  cerrarSesion: () => cerrarSesion(),
}))

import Landing from './Landing'

function montar() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}

/** Con la sesión resuelta (administración o sin Supabase) aparecen el Card Maker y el Tablero. */
async function montarComoAdmin() {
  const vista = montar()
  await screen.findByRole('link', { name: /card maker/i })
  return vista
}

beforeEach(() => {
  vi.clearAllMocks()
  sesion.estado = 'sin-supabase'
})

describe('Landing', () => {
  it('muestra enlaces de navegación a Card Maker y Éter Online', async () => {
    await montarComoAdmin()
    const cardMaker = screen.getByRole('link', { name: /card maker/i })
    expect(cardMaker).toHaveAttribute('href', '/card-maker')
    const online = screen.getByRole('link', { name: /éter online/i })
    expect(online).toHaveAttribute('href', '/epiconline')
  })

  it('enlaza al manual (HTML estático) y al lore (ruta /lore de la app)', () => {
    montar()
    expect(screen.getByRole('link', { name: /^manual$/i })).toHaveAttribute(
      'href',
      '/manual.html',
    )
    expect(screen.getByRole('link', { name: /^primogénitos$/i })).toHaveAttribute('href', '/lore')
  })

  it('agrega vínculos visibles al manual y al lore en el grid principal', () => {
    montar()
    const manual = screen.getByRole('link', { name: /manual de reglas/i })
    expect(manual).toHaveAttribute('href', '/manual.html')
    expect(manual.className).toContain('bg-surface')
    const lore = screen.getByRole('link', { name: /los primogénitos/i })
    expect(lore).toHaveAttribute('href', '/lore')
    expect(lore.className).toContain('bg-surface')
  })

  it('enlaza al tablero de balance con un único enlace a /balance', async () => {
    await montarComoAdmin()
    const balance = screen.getByRole('link', { name: /tablero de balance/i })
    expect(balance).toHaveAttribute('href', '/balance')
    expect(balance.className).toContain('bg-surface')
    expect(screen.getByText('Mide el poder y los stats de cada carta')).toBeInTheDocument()
  })

  it('separa 2 destinos principales y 3 secundarios en filas distintas', async () => {
    await montarComoAdmin()
    const filaPrincipal = screen.getByRole('link', { name: /card maker/i }).parentElement
    const filaSecundaria = screen.getByRole('link', { name: /tablero de balance/i }).parentElement
    expect(filaPrincipal).toHaveClass('sm:grid-cols-2')
    expect(filaSecundaria).toHaveClass('sm:grid-cols-3')
    expect(filaSecundaria).not.toBe(filaPrincipal)
    expect(filaSecundaria?.querySelectorAll('a')).toHaveLength(3)
    expect(filaPrincipal?.querySelectorAll('a')).toHaveLength(2)
  })

  it('usa las clases del tema (font-display y surface)', async () => {
    await montarComoAdmin()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('font-display')
    const cardMakerCard = screen.getByRole('link', { name: /card maker/i })
    expect(cardMakerCard.className).toContain('bg-surface')
  })
})

describe('Landing: sesión y destinos de administración', () => {
  it('mientras se resuelve la sesión no muestra el Card Maker ni el Tablero ni botones de sesión', () => {
    montar()
    expect(screen.queryByRole('link', { name: /card maker/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tablero de balance/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sin sesión oculta el Card Maker y el Tablero, deja lo público y ofrece iniciar sesión con Google', async () => {
    sesion.estado = 'no-sesion'
    montar()
    expect(await screen.findByRole('button', { name: 'Iniciar sesión con Google' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /card maker/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tablero de balance/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /éter online/i })).toHaveAttribute('href', '/epiconline')
    expect(screen.getByRole('link', { name: /manual de reglas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /los primogénitos/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('sin sesión los destinos públicos ocupan su fila completa (1 principal y 2 secundarios)', async () => {
    sesion.estado = 'no-sesion'
    montar()
    await screen.findByRole('button', { name: 'Iniciar sesión con Google' })
    const filaPrincipal = screen.getByRole('link', { name: /éter online/i }).parentElement
    const filaSecundaria = screen.getByRole('link', { name: /manual de reglas/i }).parentElement
    expect(filaPrincipal).toHaveClass('sm:grid-cols-1')
    expect(filaSecundaria).toHaveClass('sm:grid-cols-2')
    expect(filaSecundaria?.querySelectorAll('a')).toHaveLength(2)
  })

  it('el botón de iniciar sesión abre el acceso con Google', async () => {
    sesion.estado = 'no-sesion'
    entrarAdminConGoogle.mockResolvedValue(undefined)
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión con Google' }))
    expect(entrarAdminConGoogle).toHaveBeenCalledTimes(1)
  })

  it('si falla el acceso con Google muestra el aviso', async () => {
    sesion.estado = 'no-sesion'
    entrarAdminConGoogle.mockRejectedValue(new Error('No se pudo iniciar sesión con Google.'))
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión con Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión con Google.')
  })

  it('una cuenta que no es de administración no ve el Card Maker ni el Tablero, pero sí puede cerrar sesión', async () => {
    sesion.estado = 'no-admin'
    montar()
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /card maker/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tablero de balance/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar sesión con Google' })).not.toBeInTheDocument()
  })

  it('un administrador ve el Card Maker y el Tablero y puede cerrar sesión', async () => {
    sesion.estado = 'admin'
    montar()
    expect(await screen.findByRole('link', { name: /card maker/i })).toHaveAttribute('href', '/card-maker')
    expect(screen.getByRole('link', { name: /tablero de balance/i })).toHaveAttribute('href', '/balance')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('al cerrar sesión se cierra en la cuenta y se vuelven a ocultar los destinos de administración', async () => {
    sesion.estado = 'admin'
    cerrarSesion.mockImplementation(async () => {
      sesion.estado = 'no-sesion'
    })
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(cerrarSesion).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión con Google' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /card maker/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tablero de balance/i })).not.toBeInTheDocument()
  })

  it('si falla el cierre de sesión muestra el aviso y conserva la sesión', async () => {
    sesion.estado = 'admin'
    cerrarSesion.mockRejectedValue(new Error('Sin red'))
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin red')
    expect(screen.getByRole('link', { name: /card maker/i })).toBeInTheDocument()
  })

  it('sin Supabase (desarrollo local) muestra los destinos y no ofrece iniciar ni cerrar sesión', async () => {
    sesion.estado = 'sin-supabase'
    await montarComoAdmin()
    expect(screen.getByRole('link', { name: /tablero de balance/i })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
