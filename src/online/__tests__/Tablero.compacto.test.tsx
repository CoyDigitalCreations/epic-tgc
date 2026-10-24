import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyAction, createInitialState, getValidActions, visibleState } from '../game'
import type { GameState } from '../game'
import { MAZOS } from '../mazos'
import { Tablero } from '../components/Tablero'

/** Forja con turno de A (llegar a Forja = pasar los dos mulligans). */
function forjaDeA(): GameState {
  for (const seed of [42, 1, 2, 3, 4, 5, 7, 11, 13]) {
    const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, seed)
    let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
    s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
    if (s.turno === 'A') return s
  }
  throw new Error('Ningún seed probado deja la Forja con turno A')
}

/** El setup de tests parte de un escritorio (1440×900); cada test lo cambia a mano. */
function viewport(ancho: number, alto: number) {
  window.innerWidth = ancho
  window.innerHeight = alto
}

function montar() {
  const estado = forjaDeA()
  const props = { onAccion: vi.fn(), onAbandonar: vi.fn() }
  render(
    <Tablero
      vista={visibleState(estado, 'A')}
      acciones={getValidActions(estado, 'A')}
      leTocaA={true}
      log={[]}
      {...props}
    />,
  )
  return props
}

afterEach(() => viewport(1440, 900))

describe('Tablero en escritorio: no cambia', () => {
  it('el header conserva sus botones a la vista, sin menú ☰ ni aviso de vertical', () => {
    viewport(1440, 900)
    montar()
    expect(screen.getByRole('button', { name: 'Rendirse' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abandonar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el lateral con el inspector sigue fijo', () => {
    viewport(1440, 900)
    montar()
    expect(screen.getByText('Pasa el mouse sobre una carta')).toBeInTheDocument()
  })
})

describe('Botones de la franja central (todos los tamaños)', () => {
  it.each([
    [1440, 900],
    [844, 390],
  ])('"Pasar a Choque" es ámbar y más grande a %i×%i (contraste sobre el azul de la franja)', (ancho, alto) => {
    viewport(ancho, alto)
    montar()
    const pasar = screen.getByRole('button', { name: 'Pasar a Choque' })
    expect(pasar).toHaveClass('bg-amber-400', 'text-xs', 'font-bold')
    expect(pasar).not.toHaveClass('bg-ether-600/30')
  })
})

describe('Tablero en celular/tablet horizontal (modo compacto)', () => {
  it('el header se reduce a un ícono ☰: los botones salen del menú, no del header', async () => {
    const user = userEvent.setup()
    viewport(844, 390)
    const { onAbandonar } = montar()

    expect(screen.queryByRole('button', { name: 'Rendirse' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menú' }))
    expect(screen.getByRole('menuitem', { name: 'Rendirse' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^Animación: / })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Abandonar' }))
    expect(onAbandonar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('el panel lateral no incluye el inspector (un toque ya abre la carta en grande)', async () => {
    const user = userEvent.setup()
    viewport(844, 390)
    montar()

    await user.click(screen.getByRole('button', { name: 'Menú' }))
    await user.click(screen.getByRole('menuitem', { name: 'Cadena, efectos y log' }))
    expect(screen.getByText(/Sin cadena abierta/)).toBeInTheDocument()
    expect(screen.queryByText('Pasa el mouse sobre una carta')).not.toBeInTheDocument()
  })
})

describe('Tablero en celular vertical', () => {
  it('pide girar el dispositivo y deja una salida para no atrapar al jugador', async () => {
    const user = userEvent.setup()
    viewport(375, 667)
    const { onAbandonar } = montar()

    expect(screen.getByRole('alert')).toHaveTextContent('Gira tu dispositivo')
    await user.click(screen.getByRole('button', { name: 'Abandonar partida' }))
    expect(onAbandonar).toHaveBeenCalledTimes(1)
  })

  it('en horizontal (844×390) no aparece el aviso', () => {
    viewport(844, 390)
    montar()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
