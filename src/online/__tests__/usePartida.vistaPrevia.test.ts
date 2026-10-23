import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Action } from '../game'
import { MAZOS } from '../mazos'
import { usePartida } from '../usePartida'
import type { PartidaConfig } from '../usePartida'

const config = (extra: Partial<PartidaConfig> = {}): PartidaConfig => ({
  deckA: MAZOS[0].cardIds,
  deckB: MAZOS[1].cardIds,
  seed: 1,
  delayMs: 0,
  ...extra,
})

describe('usePartida: modo de la vista previa de efectos', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('arranca en "todas" y cicla todas → solo mías → apagada → todas', () => {
    const { result } = renderHook(() => usePartida(config()))
    expect(result.current.vistaPrevia).toBe('todas')
    act(() => result.current.ciclarVistaPrevia())
    expect(result.current.vistaPrevia).toBe('solo-mias')
    act(() => result.current.ciclarVistaPrevia())
    expect(result.current.vistaPrevia).toBe('apagada')
    act(() => result.current.ciclarVistaPrevia())
    expect(result.current.vistaPrevia).toBe('todas')
  })

  it('recuerda el modo elegido en la partida siguiente', () => {
    const primera = renderHook(() => usePartida(config()))
    act(() => primera.result.current.ciclarVistaPrevia()) // → solo mías
    primera.unmount()

    const segunda = renderHook(() => usePartida(config({ seed: 2 })))
    expect(segunda.result.current.vistaPrevia).toBe('solo-mias')
  })

  it('pausarEfectos explícito pisa la preferencia guardada', () => {
    window.localStorage.setItem('eter.vistaPrevia', 'solo-mias')
    expect(renderHook(() => usePartida(config({ pausarEfectos: false }))).result.current.vistaPrevia).toBe('apagada')
    expect(renderHook(() => usePartida(config({ pausarEfectos: true }))).result.current.vistaPrevia).toBe('todas')
  })

  it('ignora un valor guardado inválido', () => {
    window.localStorage.setItem('eter.vistaPrevia', 'cualquier-cosa')
    expect(renderHook(() => usePartida(config())).result.current.vistaPrevia).toBe('todas')
  })

  it('apagar el modo con una pausa abierta la acepta sola (el juego no queda trabado)', async () => {
    // Busca un seed donde el humano, ya en Forja, pueda jugar una carta cuyos efectos disparen la pausa
    for (let seed = 1; seed <= 60; seed++) {
      const { result, unmount } = renderHook(() => usePartida(config({ seed })))
      act(() => result.current.ejecutar({ type: 'pasar_mulligan' }))
      await waitFor(() => expect(result.current.estado.fase).not.toBe('pre_partida'), { timeout: 5000 })
      await waitFor(() => expect(result.current.leTocaA).toBe(true), { timeout: 5000 })

      const jugable = result.current.acciones.find(
        (a): a is Extract<Action, { type: 'jugar_mistica' }> => a.type === 'jugar_mistica',
      )
      if (jugable) {
        act(() => result.current.ejecutar(jugable))
        if (result.current.preview) {
          const idCarta = jugable.cardInstanceId
          expect(result.current.estado.players.A.mano).toContain(idCarta) // pausada: el motor aún no la recibió
          // todas → solo mías → apagada: al llegar a "apagada" la pausa se acepta sola
          act(() => result.current.ciclarVistaPrevia())
          expect(result.current.preview).not.toBeNull() // "solo mías" respeta la pausa del humano
          act(() => result.current.ciclarVistaPrevia())
          expect(result.current.vistaPrevia).toBe('apagada')
          expect(result.current.preview).toBeNull()
          expect(result.current.estado.players.A.mano).not.toContain(idCarta) // la acción se ejecutó
          unmount()
          return
        }
      }
      unmount()
    }
    throw new Error('Ningún seed 1-60 produjo una pausa del humano con jugar_mistica')
  }, 60000)
})
