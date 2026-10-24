import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { applyAction, createInitialState, getValidActions, visibleState } from '../game'
import type { Action, GameState } from '../game'
import { MAZOS } from '../mazos'
import { Tablero } from '../components/Tablero'

const SEEDS = [42, 1, 2, 3, 4, 5, 7, 11, 13, 17, 19, 23, 29]

/** Forja con turno de A y al menos un Campeón o Mística jugable (con coste) en la mano. */
function forjaDeAConCoste(): GameState {
  for (const seed of SEEDS) {
    const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, seed)
    let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
    s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
    if (s.turno !== 'A') continue
    const conCoste = getValidActions(s, 'A').some((a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica')
    if (conCoste) return s
  }
  throw new Error('Ningún seed probado tiene forja con turno A y carta con coste en mano')
}

describe('Mesa: selección a medias y cambio de turno', () => {
  it('si deja de tocarte, el selector de pago se cierra solo', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const acciones = getValidActions(estado, 'A')
    const props = { vista: visibleState(estado, 'A'), log: [], onAccion: vi.fn(), onAbandonar: vi.fn() }
    const { rerender } = render(<Tablero {...props} acciones={acciones} leTocaA={true} />)

    const jugar = acciones.find((a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica') as Extract<
      Action,
      { cardInstanceId: string }
    >
    await user.click(document.querySelector(`[data-testid="mano"] [data-inst="${jugar.cardInstanceId}"]`) as HTMLElement)
    await user.click(screen.getByRole('button', { name: jugar.type === 'jugar_campeon' ? 'Invocar' : 'Jugar' }))
    expect(screen.getByText(/Elige los Éteres de tu Reserva/)).toBeInTheDocument()

    // El turno pasa al rival con el pago a medio elegir
    rerender(<Tablero {...props} acciones={[]} leTocaA={false} />)
    expect(screen.queryByText(/Elige los Éteres de tu Reserva/)).not.toBeInTheDocument()
  })

  it('el campo propio y el del rival comparten el mismo ancho de carta (la mesa es simétrica)', () => {
    const estado = forjaDeAConCoste()
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={[]}
        leTocaA={false}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    const celda = (jugador: 'A' | 'B') =>
      document.querySelector<HTMLElement>(`[data-testid="grilla-${jugador}"] [data-zona="2B"]`)!
    expect(celda('A').style.minWidth).toBe(celda('B').style.minWidth)
  })

  it('Ruptura pendiente: los Vínculos del rival se iluminan y el clic elige cuál romper, a ciegas (§9.4)', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const onAccion = vi.fn()
    const acciones: Action[] = [
      { type: 'elegir_ruptura', atacanteId: 'atq-1', vinculoSlot: 2 },
      { type: 'elegir_ruptura', atacanteId: 'atq-1', vinculoSlot: 4 },
    ]
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    expect(screen.getByText(/Ruptura: elige qué Vínculo del rival romper/)).toBeInTheDocument()
    // Solo los slots que el motor ofrece (4C y 4E) son clickeables, y solo en el campo del RIVAL
    expect(screen.getAllByRole('button', { name: /^Romper Vínculo 4[A-F]$/ })).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Romper Vínculo 4E' }))
    expect(onAccion).toHaveBeenCalledTimes(1)
    expect(onAccion).toHaveBeenCalledWith({ type: 'elegir_ruptura', atacanteId: 'atq-1', vinculoSlot: 4 })
  })

  it('sin Ruptura pendiente los Vínculos del rival NO son clickeables', () => {
    const estado = forjaDeAConCoste()
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /^Romper Vínculo/ })).not.toBeInTheDocument()
  })

  it('el modal de elegir objetivo tiene su PROPIO inspector: vacío al abrir, con la carta al pasar el mouse', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    estado.objetivosPendientes = [
      {
        jugador: 'A',
        instId: estado.players.A.mano[0]!,
        trigger: 'al-invocar',
        opciones: estado.players.A.mazo.slice(0, 3),
      },
    ]
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    const dialogo = screen.getByRole('dialog')
    // Al abrir no arrastra la última carta mirada en el tablero
    expect(within(dialogo).getByText('Pasa el mouse sobre una carta')).toBeInTheDocument()

    await user.hover(dialogo.querySelector('[data-inst]') as HTMLElement)
    expect(within(dialogo).queryByText('Pasa el mouse sobre una carta')).not.toBeInTheDocument()
  })

  it('cada campo tiene su bloque de 6 Vínculos con data-zona 4A-4F', () => {
    const estado = forjaDeAConCoste()
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={[]}
        leTocaA={false}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    for (const jugador of ['A', 'B']) {
      const zonas = [...document.querySelectorAll(`[data-testid="grilla-${jugador}"] [data-zona^="4"]`)].map((el) =>
        el.getAttribute('data-zona'),
      )
      expect(zonas).toEqual(['4A', '4B', '4C', '4D', '4E', '4F'])
    }
    expect(screen.getAllByText(/Vínculos \d\/6/)).toHaveLength(2)
  })
})
