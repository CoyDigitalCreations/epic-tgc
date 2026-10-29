import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = {
  linkIdentity: vi.fn().mockResolvedValue({ error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
}
vi.mock('../backend/supabase', () => ({ getSupabase: () => ({ auth }) }))
vi.mock('../backend/matchApi', () => ({ asegurarSesion: vi.fn().mockResolvedValue('u1'), olvidarSesionVerificada: vi.fn() }))

import { enlazarGoogle, entrarConGoogle, mensajeDeAuth } from '../backend/perfilApi'

describe('acceso con Google', () => {
  beforeEach(() => {
    auth.linkIdentity.mockClear().mockResolvedValue({ error: null })
    auth.signInWithOAuth.mockClear().mockResolvedValue({ error: null })
  })

  it('enlazar conserva la sesión: usa linkIdentity y vuelve al perfil', async () => {
    await enlazarGoogle()
    expect(auth.linkIdentity).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/epiconline/perfil` } })
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('entrar con una cuenta existente usa signInWithOAuth', async () => {
    await entrarConGoogle()
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/epiconline/perfil` } })
  })

  it('traduce los errores que el jugador puede encontrar', async () => {
    auth.linkIdentity.mockResolvedValue({ error: { message: 'Identity is already linked to another user' } })
    await expect(enlazarGoogle()).rejects.toThrow(/Ya tengo cuenta/)
    expect(mensajeDeAuth('Unsupported provider: provider is not enabled')).toMatch(/no está activado/)
    expect(mensajeDeAuth('algo raro')).toBe('algo raro')
  })
})

describe('cerrar sesión', () => {
  it('cierra solo este navegador y olvida lo que recordaba de la cuenta', async () => {
    const { cerrarSesion } = await import('../backend/perfilApi')
    const { useMazosStore } = await import('../useMazosStore')
    const { guardarPartida, leerPartidaGuardada } = await import('../lobby/partidaGuardada')
    const authCompleto = auth as typeof auth & { signOut?: ReturnType<typeof vi.fn> }
    authCompleto.signOut = vi.fn().mockResolvedValue({ error: null })
    useMazosStore.setState({ mazosPersonalizados: [{ id: '11111111-1111-4111-8111-111111111111', nombre: 'M', cardIds: [] }] })
    guardarPartida({ gameId: 'g', code: 'ABCDEF', seed: 1, player: 'A' })

    await cerrarSesion()

    expect(authCompleto.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect((await import('../backend/matchApi')).olvidarSesionVerificada).toHaveBeenCalled()
    expect(useMazosStore.getState().mazosPersonalizados).toEqual([])
    expect(leerPartidaGuardada()).toBeNull()
  })
})
