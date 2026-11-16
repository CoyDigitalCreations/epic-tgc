import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const dorsosDePartida = vi.fn()
const leerDorsoPerfil = vi.fn()

vi.mock('../dorsoApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('../dorsoApi')>()
  return { ...real, dorsosDePartida: (id: string) => dorsosDePartida(id), leerDorsoPerfil: () => leerDorsoPerfil() }
})

import { guardarDorsoLocal } from '../dorsoApi'
import { useDorsosContraBot, useDorsosDePartida } from '../useDorsos'

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  leerDorsoPerfil.mockResolvedValue(null)
  dorsosDePartida.mockResolvedValue(null)
})

describe('useDorsosContraBot', () => {
  it('el humano (A) lleva su reverso local y el bot, en «auto», uno distinto', () => {
    guardarDorsoLocal(3)
    const { result } = renderHook(() => useDorsosContraBot())
    expect(result.current.A).toBe(3)
    expect(result.current.B).not.toBe(3)
  })

  it('con un reverso elegido para el bot, ese es el del asiento B', () => {
    guardarDorsoLocal(3)
    const { result } = renderHook(() => useDorsosContraBot(1, 42))
    expect(result.current).toEqual({ A: 3, B: 1 })
  })

  it('en «auto» el reverso del bot cambia con la semilla pero nunca iguala al mío', () => {
    guardarDorsoLocal(2)
    const bots = [10, 11, 12, 13].map((semilla) => renderHook(() => useDorsosContraBot('auto', semilla)).result.current.B)
    expect(new Set(bots).size).toBeGreaterThan(1)
    expect(bots).not.toContain(2)
  })

  it('si el perfil dice otro reverso (elegido en otro dispositivo), gana el del perfil', async () => {
    guardarDorsoLocal(1)
    leerDorsoPerfil.mockResolvedValue(4)
    const { result } = renderHook(() => useDorsosContraBot())
    await waitFor(() => expect(result.current.A).toBe(4))
  })

  it('el objeto es estable entre renders: no re-pinta todas las cartas sin motivo', async () => {
    const { result, rerender } = renderHook(() => useDorsosContraBot())
    await waitFor(() => expect(leerDorsoPerfil).toHaveBeenCalled())
    const antes = result.current
    rerender()
    expect(result.current).toBe(antes)
  })
})

describe('useDorsosDePartida', () => {
  it('pinta ya mi reverso y deja el inicial al rival hasta que llegue el suyo', async () => {
    guardarDorsoLocal(2)
    let resolver: (v: { A: number; B: number }) => void = () => {}
    dorsosDePartida.mockReturnValue(new Promise((ok) => (resolver = ok)))
    const { result } = renderHook(() => useDorsosDePartida('juego-1', 'A'))
    expect(result.current).toEqual({ A: 2, B: 0 })
    resolver({ A: 2, B: 4 })
    await waitFor(() => expect(result.current).toEqual({ A: 2, B: 4 }))
  })

  it('si soy el asiento B, el rival es A', async () => {
    guardarDorsoLocal(1)
    dorsosDePartida.mockResolvedValue({ A: 3, B: 1 })
    const { result } = renderHook(() => useDorsosDePartida('juego-1', 'B'))
    await waitFor(() => expect(result.current).toEqual({ A: 3, B: 1 }))
  })

  it('mi reverso sale de mi copia local, no de lo que diga el servidor sobre mí', async () => {
    guardarDorsoLocal(1)
    dorsosDePartida.mockResolvedValue({ A: 0, B: 4 })
    const { result } = renderHook(() => useDorsosDePartida('juego-1', 'A'))
    await waitFor(() => expect(result.current.B).toBe(4))
    expect(result.current.A).toBe(1)
  })

  it('si no se puede saber el reverso del rival, usa el inicial', async () => {
    dorsosDePartida.mockResolvedValue(null)
    const { result } = renderHook(() => useDorsosDePartida('juego-1', 'A'))
    await waitFor(() => expect(dorsosDePartida).toHaveBeenCalledWith('juego-1'))
    expect(result.current.B).toBe(0)
  })
})
