// @vitest-environment jsdom
/**
 * Log del rival en PvP: `state` trae los eventos de sus jugadas (por cursor) y el hook los suma al log detallado.
 * Carga inicial / reconexión: sin cursor → historial; polls siguientes: con el `ultimoEventoId` anterior.
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

const respuesta = (eventos: unknown[], ultimoEventoId: number) =>
  ({ status: 'playing', state: escenaVacia('forja'), player: 'A', eventos, ultimoEventoId }) as never

describe('useOnlineMatch: log del rival', () => {
  beforeEach(() => {
    vi.mocked(obtenerEstado).mockReset()
  })

  it('la carga inicial pide el historial sin cursor y los polls siguientes piden desde el último evento', async () => {
    vi.mocked(obtenerEstado)
      .mockResolvedValueOnce(respuesta([{ type: 'turno_iniciado', jugador: 'B' }], 5))
      .mockResolvedValueOnce(respuesta([{ type: 'fase_iniciada', fase: 'choque', jugador: 'B' }], 9))
    const { result } = renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))

    await waitFor(() => expect(result.current.logDetallado).toHaveLength(1))
    expect(obtenerEstado).toHaveBeenNthCalledWith(1, 'g1', undefined)
    expect(result.current.logDetallado[0]).toContain('TURNO DE B')

    await act(async () => {
      await result.current.refrescar()
    })
    expect(obtenerEstado).toHaveBeenNthCalledWith(2, 'g1', 5)
    expect(result.current.logDetallado).toHaveLength(2)
    expect(result.current.logDetallado[1]).toContain('CHOQUE')
  })

  it('un poll sin eventos nuevos no repite líneas ni pierde el cursor', async () => {
    vi.mocked(obtenerEstado)
      .mockResolvedValueOnce(respuesta([{ type: 'turno_iniciado', jugador: 'B' }], 5))
      .mockResolvedValueOnce(respuesta([], 5))
      .mockResolvedValueOnce(respuesta([], 5))
    const { result } = renderHook(() => useOnlineMatch('g1', 'A', 'ABCDEF'))
    await waitFor(() => expect(result.current.logDetallado).toHaveLength(1))

    await act(async () => {
      await result.current.refrescar()
    })
    await act(async () => {
      await result.current.refrescar()
    })
    expect(obtenerEstado).toHaveBeenNthCalledWith(3, 'g1', 5)
    expect(result.current.logDetallado).toHaveLength(1)
  })
})
