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

describe('usePartida', () => {
  it('arranca en pre_partida con el mulligan del humano (turno A siempre primero)', () => {
    const { result } = renderHook(() => usePartida(config()))
    expect(result.current.estado.fase).toBe('pre_partida')
    expect(result.current.estado.turno).toBe('A')
    expect(result.current.leTocaA).toBe(true)
    const tipos = result.current.acciones.map((a) => a.type)
    expect(tipos).toContain('mulligan')
    expect(tipos).toContain('pasar_mulligan')
    expect(tipos).toContain('rendirse')
  })

  it('al pasar el mulligan humano, el bot juega el suyo solo y la partida arranca', async () => {
    const { result } = renderHook(() => usePartida(config()))
    act(() => {
      result.current.ejecutar({ type: 'pasar_mulligan' })
    })
    await waitFor(
      () => {
        expect(result.current.estado.fase).not.toBe('pre_partida')
      },
      { timeout: 5000 },
    )
    // El log narró el mulligan del bot
    expect(result.current.log.some((l) => l.includes('mulligan'))).toBe(true)
  })

  it(
    'una partida completa humano-vs-bot termina sin deadlock (jugadas válidas hasta el final)',
    async () => {
      const { result } = renderHook(() => usePartida(config()))
      let humanoEnRacha = 0
      for (let i = 0; i < 20000 && result.current.estado.fase !== 'terminada'; i++) {
        if (result.current.leTocaA) {
          // El "humano" automático: con la cadena abierta pasa prioridad
          // (igual que el bot, ADR-19); si no, la primera acción legal no-rendirse
          const a =
            result.current.acciones.find((x) => x.type === 'pasar_prioridad') ??
            result.current.acciones.find((x) => x.type !== 'rendirse')
          if (a) {
            await act(async () => {
              result.current.ejecutar(a)
            })
            humanoEnRacha++
          } else {
            await act(async () => {
              await new Promise((r) => setTimeout(r, 1))
            })
          }
        } else {
          // El bot está jugando (delay 0): darle un macrotask
          await act(async () => {
            await new Promise((r) => setTimeout(r, 1))
          })
        }
      }
      expect(result.current.estado.fase).toBe('terminada')
      expect(result.current.estado.ganador).toBeDefined()
      expect(humanoEnRacha).toBeGreaterThan(10) // el humano participó de verdad
      expect(result.current.log.length).toBeGreaterThan(5)
    },
    30000,
  )
})
