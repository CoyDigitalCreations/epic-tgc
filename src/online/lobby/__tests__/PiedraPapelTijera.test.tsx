// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PptVista } from '../../game'
import { PiedraPapelTijera } from '../PiedraPapelTijera'

function montar(ppt: PptVista | null, yo: 'A' | 'B' = 'A') {
  const onJugar = vi.fn()
  const onDecidir = vi.fn()
  render(<PiedraPapelTijera yo={yo} ppt={ppt} onJugar={onJugar} onDecidir={onDecidir} />)
  return { onJugar, onDecidir }
}

describe('PiedraPapelTijera', () => {
  it('al inicio ofrece las tres jugadas y manda la elegida', async () => {
    const { onJugar } = montar({ ronda: 1, rivalListo: false })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Papel' }))
    expect(onJugar).toHaveBeenCalledWith('papel')
    expect(screen.getByRole('button', { name: 'Piedra' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tijera' })).toBeInTheDocument()
  })

  it('sin estado todavía (null) también deja elegir', () => {
    montar(null)
    expect(screen.getByRole('button', { name: 'Piedra' })).toBeInTheDocument()
  })

  it('tras elegir muestra mi jugada, espera al rival y ya no deja volver a elegir', () => {
    montar({ ronda: 1, miJugada: 'piedra', rivalListo: false })
    expect(screen.getByText(/Esperando a tu rival/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Papel' })).not.toBeInTheDocument()
  })

  it('avisa que el rival ya eligió, sin decir qué', () => {
    montar({ ronda: 1, rivalListo: true })
    expect(screen.getByText(/Tu rival ya eligió/)).toBeInTheDocument()
  })

  it('un empate avisa y vuelve a ofrecer las jugadas', () => {
    montar({ ronda: 2, rivalListo: false, ultima: { ronda: 1, A: 'tijera', B: 'tijera' } })
    expect(screen.getByText(/Empate: ambos eligieron/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Piedra' })).toBeInTheDocument()
  })

  it('el ganador ve ambas jugadas y decide si empieza o cede', async () => {
    const { onDecidir } = montar({ ronda: 1, rivalListo: false, ganador: 'A', ultima: { ronda: 1, A: 'piedra', B: 'tijera' } }, 'A')
    expect(screen.getByText(/¡Ganaste!/)).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Empiezo yo' }))
    await user.click(screen.getByRole('button', { name: 'Que empiece mi rival' }))
    expect(onDecidir).toHaveBeenNthCalledWith(1, true)
    expect(onDecidir).toHaveBeenNthCalledWith(2, false)
  })

  it('el perdedor solo espera y ve las jugadas desde su lado', () => {
    montar({ ronda: 1, rivalListo: false, ganador: 'A', ultima: { ronda: 1, A: 'piedra', B: 'tijera' } }, 'B')
    expect(screen.getByText(/Tu rival ganó/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Empiezo yo' })).not.toBeInTheDocument()
    expect(screen.getByText(/Tú:/).textContent).toContain('Tijera') // B eligió tijera
  })

  it('decidido: anuncia quién empieza', () => {
    montar({ ronda: 1, rivalListo: false, ganador: 'A', primerJugador: 'B', ultima: { ronda: 1, A: 'piedra', B: 'tijera' } }, 'A')
    expect(screen.getByRole('status').textContent).toContain('Empieza tu rival')
  })
})
