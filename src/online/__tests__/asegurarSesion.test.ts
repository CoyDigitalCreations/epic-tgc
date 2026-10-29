import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = {
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn().mockResolvedValue({}),
  signInAnonymously: vi.fn(),
}
vi.mock('../backend/supabase', () => ({ getSupabase: () => ({ auth }) }))

async function cargar() {
  vi.resetModules() // la verificación se cachea por carga de página: cada caso parte limpio
  return (await import('../backend/matchApi')).asegurarSesion
}

describe('asegurarSesion', () => {
  beforeEach(() => {
    Object.values(auth).forEach((f) => f.mockClear())
    auth.signInAnonymously.mockResolvedValue({ data: { user: { id: 'nuevo' } }, error: null })
  })

  it('reutiliza una sesión que el servidor reconoce', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    auth.getUser.mockResolvedValue({ error: null })
    expect(await (await cargar())()).toBe('u1')
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('si el usuario guardado ya no existe en el servidor, abre una sesión anónima nueva', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'borrado' } } } })
    auth.getUser.mockResolvedValue({ error: { message: 'User from sub claim in JWT does not exist' } })
    expect(await (await cargar())()).toBe('nuevo')
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('sin sesión abre una anónima', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    expect(await (await cargar())()).toBe('nuevo')
    expect(auth.getUser).not.toHaveBeenCalled()
  })

  it('comprueba contra el servidor una sola vez por carga', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    auth.getUser.mockResolvedValue({ error: null })
    const asegurar = await cargar()
    await asegurar()
    await asegurar()
    expect(auth.getUser).toHaveBeenCalledTimes(1)
  })
})
