import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAZOS } from '../mazos'
import { usePartida } from '../usePartida'

const config = () => ({
  deckA: MAZOS[0].cardIds,
  deckB: MAZOS[1].cardIds,
  seed: 1,
  delayMs: 0,
})

/** Arranca la partida (mulligan de ambos) y espera a salir de pre_partida. */
async function iniciar() {
  const hook = renderHook(() => usePartida(config()))
  act(() => {
    hook.result.current.ejecutar({ type: 'pasar_mulligan' })
  })
  await waitFor(() => expect(hook.result.current.estado.fase).not.toBe('pre_partida'), { timeout: 5000 })
  return hook
}

describe('usePartida: anuncios de turno y fase', () => {
  it('al empezar el turno del humano anuncia "Tu turno" (y no la Alba ni la Forja del arranque)', async () => {
    const { result } = await iniciar()
    const banners = result.current.animaciones.filter((a) => a.tipo === 'banner')
    expect(banners.map((b) => b.texto)).toEqual(['Tu turno'])
  })

  it('pasar de Forja a Choque anuncia la fase, sin repetir el turno', async () => {
    const { result } = await iniciar()
    expect(result.current.estado.fase).toBe('forja')
    const antes = result.current.animaciones.filter((a) => a.tipo === 'banner').length
    act(() => {
      result.current.ejecutar({ type: 'pasar_turno' })
    })
    await waitFor(() => expect(result.current.estado.fase).toBe('choque'))
    const textos = result.current.animaciones.filter((a) => a.tipo === 'banner').map((b) => b.texto)
    // Un solo banner nuevo (el "Tu turno" del arranque sigue en pantalla, no se duplica)
    expect(textos).toHaveLength(antes + 1)
    expect(textos.at(-1)).toBe('Fase de Choque')
  })
})
