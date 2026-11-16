import { beforeEach, describe, expect, it, vi } from 'vitest'

const sesion = vi.fn()
const rpc = vi.fn()
const iniciar = vi.fn()
const cerrar = vi.fn()
let hayCliente = true

vi.mock('../../../online/backend/supabase', () => ({
  getSupabase: () =>
    hayCliente
      ? {
          auth: { getSession: sesion, signInWithPassword: iniciar, signOut: cerrar },
          schema: (nombre: string) => ({ rpc: (fn: string) => rpc(nombre, fn) }),
        }
      : null,
}))

import { correoDeUsuario, DOMINIO_ADMIN, entrarComoAdmin, estadoAdmin, salirDeAdmin } from '../adminApi'

beforeEach(() => {
  vi.clearAllMocks()
  hayCliente = true
})

describe('correoDeUsuario', () => {
  it('completa un usuario sin «@» con el dominio reservado y lo pasa a minúsculas', () => {
    expect(correoDeUsuario('  Maker ')).toBe(`maker@${DOMINIO_ADMIN}`)
  })

  it('respeta un correo completo', () => {
    expect(correoDeUsuario('Alguien@Correo.com')).toBe('alguien@correo.com')
  })
})

describe('estadoAdmin', () => {
  it('sin Supabase configurado no bloquea', async () => {
    hayCliente = false
    expect(await estadoAdmin()).toBe('sin-supabase')
  })

  it('sin sesión pide entrar', async () => {
    sesion.mockResolvedValue({ data: { session: null } })
    expect(await estadoAdmin()).toBe('no-sesion')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('la sesión anónima de jugar no cuenta como sesión', async () => {
    sesion.mockResolvedValue({ data: { session: { user: { id: 'u', is_anonymous: true } } } })
    expect(await estadoAdmin()).toBe('no-sesion')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('una cuenta que está en la lista de administradores es admin', async () => {
    sesion.mockResolvedValue({ data: { session: { user: { id: 'u', is_anonymous: false } } } })
    rpc.mockResolvedValue({ data: true, error: null })
    expect(await estadoAdmin()).toBe('admin')
    expect(rpc).toHaveBeenCalledWith('eter', 'es_admin')
  })

  it('una cuenta que no está en la lista no es admin', async () => {
    sesion.mockResolvedValue({ data: { session: { user: { id: 'u', is_anonymous: false } } } })
    rpc.mockResolvedValue({ data: false, error: null })
    expect(await estadoAdmin()).toBe('no-admin')
  })

  it('un error al preguntar (token caducado) se trata como sin sesión', async () => {
    sesion.mockResolvedValue({ data: { session: { user: { id: 'u', is_anonymous: false } } } })
    rpc.mockResolvedValue({ data: null, error: { message: 'JWT expired' } })
    expect(await estadoAdmin()).toBe('no-sesion')
  })
})

describe('entrarComoAdmin', () => {
  it('inicia sesión con el correo completado y la contraseña', async () => {
    iniciar.mockResolvedValue({ error: null })
    await entrarComoAdmin('maker', 'secreto')
    expect(iniciar).toHaveBeenCalledWith({ email: `maker@${DOMINIO_ADMIN}`, password: 'secreto' })
  })

  it('un fallo de Supabase da un mensaje genérico, sin revelar si el usuario existe', async () => {
    iniciar.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    await expect(entrarComoAdmin('maker', 'mala')).rejects.toThrow('Usuario o contraseña incorrectos.')
  })

  it('no llama a Supabase con campos vacíos', async () => {
    await expect(entrarComoAdmin('  ', 'x')).rejects.toThrow(/usuario y tu contraseña/)
    await expect(entrarComoAdmin('maker', '')).rejects.toThrow(/usuario y tu contraseña/)
    expect(iniciar).not.toHaveBeenCalled()
  })
})

describe('salirDeAdmin', () => {
  it('cierra solo la sesión de este navegador', async () => {
    await salirDeAdmin()
    expect(cerrar).toHaveBeenCalledWith({ scope: 'local' })
  })
})
