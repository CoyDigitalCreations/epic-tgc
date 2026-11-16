import { beforeEach, describe, expect, it, vi } from 'vitest'

const update = vi.fn()
const eq = vi.fn()
const maybeSingle = vi.fn()
const rpc = vi.fn()
let hayCliente = true

vi.mock('../../backend/supabase', () => ({
  getSupabase: () =>
    hayCliente
      ? {
          schema: (nombre: string) => ({
            from: (tabla: string) => ({
              select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle(nombre, tabla) }) }),
              update: (valores: unknown) => ({ eq: (c: string, v: string) => update(nombre, tabla, valores, c, v) }),
            }),
            rpc: (fn: string, args: unknown) => rpc(nombre, fn, args),
          }),
        }
      : null,
}))
vi.mock('../../backend/matchApi', () => ({ asegurarSesion: async () => 'usuario-1' }))
void eq

import { dorsosDePartida, guardarDorso, guardarDorsoBotLocal, leerDorsoBotLocal, leerDorsoLocal, leerDorsoPerfil } from '../dorsoApi'

beforeEach(() => {
  vi.clearAllMocks()
  hayCliente = true
  window.localStorage.clear()
})

describe('copia local', () => {
  it('sin nada guardado es el reverso inicial', () => {
    expect(leerDorsoLocal()).toBe(0)
  })

  it('un valor corrupto en el almacenamiento cae al inicial', () => {
    window.localStorage.setItem('epic.dorso', 'mala')
    expect(leerDorsoLocal()).toBe(0)
    window.localStorage.setItem('epic.dorso', '99')
    expect(leerDorsoLocal()).toBe(0)
  })
})

describe('reverso del bot (solo local)', () => {
  it('sin nada guardado es «auto»', () => {
    expect(leerDorsoBotLocal()).toBe('auto')
  })

  it('guarda y recupera «auto» o un reverso', () => {
    guardarDorsoBotLocal(2)
    expect(leerDorsoBotLocal()).toBe(2)
    guardarDorsoBotLocal('auto')
    expect(leerDorsoBotLocal()).toBe('auto')
  })

  it('no se mezcla con MI reverso', () => {
    guardarDorsoBotLocal(4)
    expect(leerDorsoLocal()).toBe(0)
  })

  it('un valor corrupto vuelve a «auto»', () => {
    window.localStorage.setItem('epic.dorso-bot', 'mala')
    expect(leerDorsoBotLocal()).toBe('auto')
    window.localStorage.setItem('epic.dorso-bot', '99')
    expect(leerDorsoBotLocal()).toBe('auto')
  })
})

describe('guardarDorso', () => {
  it('sin Supabase solo guarda la copia local', async () => {
    hayCliente = false
    await guardarDorso(3)
    expect(leerDorsoLocal()).toBe(3)
    expect(update).not.toHaveBeenCalled()
  })

  it('con Supabase guarda local y actualiza el perfil propio en el esquema eter', async () => {
    update.mockResolvedValue({ error: null })
    await guardarDorso(2)
    expect(leerDorsoLocal()).toBe(2)
    expect(update).toHaveBeenCalledWith('eter', 'profiles', { dorso: 2 }, 'id', 'usuario-1')
  })

  it('si falla el perfil lanza, pero la copia local ya quedó', async () => {
    update.mockResolvedValue({ error: { message: 'permission denied' } })
    await expect(guardarDorso(4)).rejects.toThrow('permission denied')
    expect(leerDorsoLocal()).toBe(4)
  })

  it('un valor fuera de rango se guarda como el inicial, no se manda a la base', async () => {
    update.mockResolvedValue({ error: null })
    await guardarDorso(42)
    expect(update).toHaveBeenCalledWith('eter', 'profiles', { dorso: 0 }, 'id', 'usuario-1')
  })
})

describe('leerDorsoPerfil', () => {
  it('lee el reverso del perfil', async () => {
    maybeSingle.mockResolvedValue({ data: { dorso: 3 }, error: null })
    expect(await leerDorsoPerfil()).toBe(3)
  })

  it('sin Supabase o con error devuelve null (no inventa uno)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect(await leerDorsoPerfil()).toBeNull()
    hayCliente = false
    expect(await leerDorsoPerfil()).toBeNull()
  })
})

describe('dorsosDePartida', () => {
  it('devuelve los reversos de los dos asientos', async () => {
    rpc.mockResolvedValue({ data: { A: 1, B: 4 }, error: null })
    expect(await dorsosDePartida('juego-1')).toEqual({ A: 1, B: 4 })
    expect(rpc).toHaveBeenCalledWith('eter', 'dorsos_de_partida', { p_game: 'juego-1' })
  })

  it('normaliza valores raros que lleguen del servidor', async () => {
    rpc.mockResolvedValue({ data: { A: 9, B: 'x' }, error: null })
    expect(await dorsosDePartida('juego-1')).toEqual({ A: 0, B: 0 })
  })

  it('null si no eres jugador de esa partida, hay un error o no hay Supabase', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await dorsosDePartida('juego-1')).toBeNull()
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect(await dorsosDePartida('juego-1')).toBeNull()
    hayCliente = false
    expect(await dorsosDePartida('juego-1')).toBeNull()
  })
})
