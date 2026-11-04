import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useReferencia } from './useReferencia'

describe('useReferencia', () => {
  afterEach(() => {
    vi.doUnmock('../../seed/CartasPrueba.json')
  })

  it('arranca apagada, sin cartas y sin crudas', () => {
    const { result } = renderHook(() => useReferencia())
    expect(result.current.activa).toBe(false)
    expect(result.current.estado).toBe('apagada')
    expect(result.current.cartas).toEqual([])
    expect(result.current.crudas.size).toBe(0)
  })

  it('al activarla pasa por cargando y queda lista con 58 cartas marcadas como referencia', async () => {
    const { result } = renderHook(() => useReferencia())
    act(() => result.current.setActiva(true))
    expect(result.current.activa).toBe(true)
    expect(result.current.estado).toBe('cargando')
    await waitFor(() => expect(result.current.estado).toBe('lista'))
    expect(result.current.cartas).toHaveLength(58)
    expect(result.current.cartas.every((c) => c.esReferencia === true && c.id.startsWith('PR-'))).toBe(true)
  })

  it('expone las cartas crudas por id, con sus efectos de texto', async () => {
    const { result } = renderHook(() => useReferencia())
    act(() => result.current.setActiva(true))
    await waitFor(() => expect(result.current.estado).toBe('lista'))
    expect(result.current.crudas.size).toBe(58)
    for (const c of result.current.cartas) expect(result.current.crudas.get(c.id)?.id).toBe(c.id)
  })

  it('al apagarla vuelve a apagada y oculta las cartas', async () => {
    const { result } = renderHook(() => useReferencia())
    act(() => result.current.setActiva(true))
    await waitFor(() => expect(result.current.estado).toBe('lista'))
    act(() => result.current.setActiva(false))
    expect(result.current.estado).toBe('apagada')
    expect(result.current.cartas).toEqual([])
    expect(result.current.crudas.size).toBe(0)
  })

  it('si falla la carga queda en error y se recupera al apagar y volver a activar', async () => {
    vi.doMock('../../seed/CartasPrueba.json', () => {
      throw new Error('sin red')
    })
    const { result } = renderHook(() => useReferencia())
    act(() => result.current.setActiva(true))
    await waitFor(() => expect(result.current.estado).toBe('error'))
    expect(result.current.cartas).toEqual([])

    act(() => result.current.setActiva(false))
    expect(result.current.estado).toBe('apagada')
    vi.doMock('../../seed/CartasPrueba.json', async (importarOriginal) => importarOriginal())
    act(() => result.current.setActiva(true))
    await waitFor(() => expect(result.current.estado).toBe('lista'))
  })
})
