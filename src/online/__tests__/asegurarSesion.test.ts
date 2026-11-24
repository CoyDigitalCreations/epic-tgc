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
  return import('../backend/matchApi')
}

describe('sesión de jugador (sin sesiones anónimas)', () => {
  beforeEach(() => {
    Object.values(auth).forEach((f) => f.mockClear())
  })

  it('reutiliza una cuenta de Google que el servidor reconoce', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', is_anonymous: false } }, error: null })
    const { usuarioConSesion, asegurarSesion } = await cargar()
    expect(await usuarioConSesion()).toBe('u1')
    expect(await asegurarSesion()).toBe('u1')
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('sin sesión es invitado: no abre ninguna sesión anónima', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    const { usuarioConSesion } = await cargar()
    expect(await usuarioConSesion()).toBeNull()
    expect(auth.getUser).not.toHaveBeenCalled()
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('una sesión anónima que quedó de antes se trata como invitado', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'anon', is_anonymous: true } } } })
    auth.getUser.mockResolvedValue({ data: { user: { id: 'anon', is_anonymous: true } }, error: null })
    const { usuarioConSesion } = await cargar()
    expect(await usuarioConSesion()).toBeNull()
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('si el usuario guardado ya no existe en el servidor, descarta la sesión y queda como invitado', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'borrado' } } } })
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'User from sub claim in JWT does not exist' } })
    const { usuarioConSesion } = await cargar()
    expect(await usuarioConSesion()).toBeNull()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('asegurarSesion exige cuenta: el invitado recibe el aviso de iniciar sesión con Google', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    const { asegurarSesion, MENSAJE_SESION_REQUERIDA } = await cargar()
    await expect(asegurarSesion()).rejects.toThrow(MENSAJE_SESION_REQUERIDA)
  })

  it('comprueba contra el servidor una sola vez por carga', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', is_anonymous: false } }, error: null })
    const { usuarioConSesion } = await cargar()
    await usuarioConSesion()
    await usuarioConSesion()
    expect(auth.getUser).toHaveBeenCalledTimes(1)
  })
})
