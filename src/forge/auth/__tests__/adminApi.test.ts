import { beforeEach, describe, expect, it, vi } from 'vitest'

const sesion = vi.fn()
const rpc = vi.fn()
const cerrar = vi.fn()
const oauth = vi.fn()
let hayCliente = true

vi.mock('../../../online/backend/supabase', () => ({
  getSupabase: () =>
    hayCliente
      ? {
          auth: { getSession: sesion, signInWithOAuth: oauth, signOut: cerrar },
          schema: (nombre: string) => ({ rpc: (fn: string) => rpc(nombre, fn) }),
        }
      : null,
}))

import { entrarAdminConGoogle, estadoAdmin, salirDeAdmin } from '../adminApi'

beforeEach(() => {
  vi.clearAllMocks()
  hayCliente = true
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

describe('entrarAdminConGoogle', () => {
  it('abre Google y vuelve a la misma pantalla (sin parámetros ni fragmento de la URL)', async () => {
    oauth.mockResolvedValue({ error: null })
    await entrarAdminConGoogle()
    expect(oauth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    })
  })

  it('un fallo de Supabase da un mensaje en claro', async () => {
    oauth.mockResolvedValue({ error: { message: 'provider is not enabled' } })
    await expect(entrarAdminConGoogle()).rejects.toThrow('No se pudo iniciar sesión con Google.')
  })

  it('sin Supabase configurado avisa', async () => {
    hayCliente = false
    await expect(entrarAdminConGoogle()).rejects.toThrow('Supabase no está configurado.')
    expect(oauth).not.toHaveBeenCalled()
  })
})

describe('salirDeAdmin', () => {
  it('cierra solo la sesión de este navegador', async () => {
    await salirDeAdmin()
    expect(cerrar).toHaveBeenCalledWith({ scope: 'local' })
  })
})
