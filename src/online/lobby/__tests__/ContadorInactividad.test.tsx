// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContadorInactividad, formatearRestante } from '../ContadorInactividad'

describe('formatearRestante', () => {
  it('muestra mm:ss y nunca baja de 0:00', () => {
    expect(formatearRestante(300_000)).toBe('5:00')
    expect(formatearRestante(61_000)).toBe('1:01')
    expect(formatearRestante(9_100)).toBe('0:10') // redondea hacia arriba: no se muestra 0:00 con tiempo aún
    expect(formatearRestante(0)).toBe('0:00')
    expect(formatearRestante(-5_000)).toBe('0:00')
  })
})

describe('ContadorInactividad', () => {
  afterEach(() => vi.useRealTimers())

  it('distingue mi tiempo del tiempo del rival', () => {
    const { unmount } = render(<ContadorInactividad venceEn={Date.now() + 120_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer', { name: 'Tu tiempo para responder' })).toBeInTheDocument()
    unmount()
    render(<ContadorInactividad venceEn={Date.now() + 120_000} limiteSegundos={300} leToca={false} />)
    expect(screen.getByRole('timer', { name: 'Tiempo del rival para responder' })).toBeInTheDocument()
  })

  it('cuenta hacia atrás con el reloj', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
    render(<ContadorInactividad venceEn={Date.now() + 65_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer').textContent).toContain('1:05')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(screen.getByRole('timer').textContent).toContain('1:00')
  })

  it('avisa en ámbar a los 30 s y en rojo a los 10 s', () => {
    const { rerender } = render(<ContadorInactividad venceEn={Date.now() + 120_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer').className).not.toContain('amber')
    rerender(<ContadorInactividad venceEn={Date.now() + 25_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer').className).toContain('amber')
    rerender(<ContadorInactividad venceEn={Date.now() + 8_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer').className).toContain('rose')
  })

  it('vencido se queda en 0:00', () => {
    render(<ContadorInactividad venceEn={Date.now() - 1_000} limiteSegundos={300} leToca />)
    expect(screen.getByRole('timer').textContent).toContain('0:00')
  })
})
