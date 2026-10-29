// @vitest-environment jsdom
/**
 * Plazo del PvP en el hook: el servidor manda su reloj (`ahora`) y el vencimiento (`venceEn`); el cliente corrige su desfase
 * para que el contador no dependa de que su reloj local esté en hora. Si es mi turno y se me acaba el tiempo, consulto yo
 * (sin poll nadie me avisaría de que la partida ya se cerró por abandono).
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { escenaVacia } from '../../game/__tests__/helpers/cartasPrueba'

vi.mock('../../backend/matchApi', () => ({
  obtenerEstado: vi.fn(),
  enviarAccion: vi.fn(),
  rendirse: vi.fn(),
}))

import { obtenerEstado } from '../../backend/matchApi'
import { useOnlineMatch } from '../useOnlineMatch'

const resp = (extra: Record<string, unknown>, turno: 'A' | 'B' = 'A') => {
  const state = escenaVacia('forja')
  state.turno = turno
  return { status: 'playing', state, player: 'A', ...extra } as never
}

describe('useOnlineMatch: plazo de inactividad', () => {
  beforeEach(() => {
    vi.mocked(obtenerEstado).mockReset()
  })

  it('corrige el desfase del reloj local con el del servidor', async () => {
    const local = Date.now()
    // el reloj del servidor va 10 min adelantado; el plazo es 5 min desde "ahora del servidor"
    const ahoraServidor = local + 600_000
    vi.mocked(obtenerEstado).mockResolvedValue(resp({ limiteSegundos: 300, ahora: ahoraServidor, venceEn: ahoraServidor + 300_000 }))
    const { result } = renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))

    await waitFor(() => expect(result.current.plazo).not.toBeNull())
    const restante = (result.current.plazo!.venceEn as number) - Date.now()
    expect(result.current.plazo!.limiteSegundos).toBe(300)
    expect(restante).toBeGreaterThan(295_000)
    expect(restante).toBeLessThanOrEqual(300_500)
  })

  it('sin venceEn (partida no en curso) no hay plazo que contar, pero se conoce el límite', async () => {
    vi.mocked(obtenerEstado).mockResolvedValue(resp({ status: 'finished', limiteSegundos: 120, ahora: Date.now() }))
    const { result } = renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))
    await waitFor(() => expect(result.current.plazo).not.toBeNull())
    expect(result.current.plazo).toEqual({ limiteSegundos: 120, venceEn: null })
  })

  it('una respuesta sin datos de plazo no borra el último que se conocía', async () => {
    vi.mocked(obtenerEstado)
      .mockResolvedValueOnce(resp({ limiteSegundos: 180, ahora: Date.now(), venceEn: Date.now() + 180_000 }))
      .mockResolvedValueOnce(resp({}))
    const { result } = renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))
    await waitFor(() => expect(result.current.plazo?.limiteSegundos).toBe(180))
    await act(async () => {
      await result.current.refrescar()
    })
    expect(result.current.plazo?.limiteSegundos).toBe(180)
  })

  it('en mi turno, pasado el plazo, consulta al servidor para enterarse del cierre', async () => {
    vi.useFakeTimers()
    try {
      const ahora = Date.now()
      // es mi turno (A) y el plazo vence en 1 s
      vi.mocked(obtenerEstado).mockResolvedValue(resp({ limiteSegundos: 60, ahora, venceEn: ahora + 1_000 }, 'A'))
      renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10) // carga inicial
      })
      expect(obtenerEstado).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_600) // el plazo venció y corrió un tick de 2.5 s
      })
      expect(vi.mocked(obtenerEstado).mock.calls.length).toBeGreaterThan(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('en mi turno y con tiempo de sobra NO consulta de más', async () => {
    vi.useFakeTimers()
    try {
      const ahora = Date.now()
      vi.mocked(obtenerEstado).mockResolvedValue(resp({ limiteSegundos: 300, ahora, venceEn: ahora + 300_000 }, 'A'))
      renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(obtenerEstado).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
