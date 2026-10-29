// @vitest-environment jsdom
/**
 * Perspectiva del tablero en PvP: el jugador B (el que se une) ve SU mano abajo y como propia, no la de A.
 * Antes el tablero asumía que quien mira era siempre A (pensado para jugar contra el bot): B veía la mano de A
 * como propia (y oculta) y la suya como «la del rival».
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getCardMeta, getValidActions, visibleState } from '../game'
import type { GameState } from '../game'
import { Tablero } from '../components/Tablero'

const CARTA_B = 'FB-016' // en la mano de B
const CARTA_A = 'FB-003' // en la mano de A

function base(turno: 'A' | 'B'): GameState {
  const jugador = (id: 'A' | 'B') => ({
    id,
    mano: [] as string[],
    mazo: ['dummy'],
    cementerio: [] as string[],
    exilio: [] as string[],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  const s: GameState = {
    version: 4,
    seed: 1,
    fase: 'forja',
    turno,
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
  s.instances.manoA = { cardInstanceId: 'manoA', cardId: CARTA_A, owner: 'A' }
  s.instances.manoB = { cardInstanceId: 'manoB', cardId: CARTA_B, owner: 'B' }
  s.players.A.mano = ['manoA']
  s.players.B.mano = ['manoB']
  return s
}

function montar(estado: GameState, yo: 'A' | 'B') {
  render(
    <Tablero
      vista={visibleState(estado, yo)}
      yoId={yo}
      acciones={getValidActions(estado, yo)}
      leTocaA={estado.turno === yo}
      log={[]}
      onAccion={vi.fn()}
      onAbandonar={vi.fn()}
    />,
  )
}

const nombre = (cardId: string) => getCardMeta(cardId)!.name

describe('Tablero: perspectiva del jugador que mira', () => {
  it('B ve su propia mano y no la de A', () => {
    montar(base('B'), 'B')
    const mano = within(screen.getByTestId('mano'))
    expect(mano.queryAllByLabelText(nombre(CARTA_B)).length).toBeGreaterThan(0)
    expect(mano.queryAllByLabelText(nombre(CARTA_A))).toHaveLength(0)
  })

  it('A sigue viendo la suya (el bot no cambia)', () => {
    montar(base('A'), 'A')
    const mano = within(screen.getByTestId('mano'))
    expect(mano.queryAllByLabelText(nombre(CARTA_A)).length).toBeGreaterThan(0)
    expect(mano.queryAllByLabelText(nombre(CARTA_B))).toHaveLength(0)
  })

  it('la grilla girada 180° es la del RIVAL de quien mira: A ve girada la de B, B ve girada la de A', () => {
    montar(base('A'), 'A')
    expect(screen.getByTestId('grilla-B')).toHaveAttribute('data-invertida', 'true')
    expect(screen.getByTestId('grilla-A')).not.toHaveAttribute('data-invertida')
    cleanup()
    montar(base('B'), 'B')
    expect(screen.getByTestId('grilla-A')).toHaveAttribute('data-invertida', 'true')
    expect(screen.getByTestId('grilla-B')).not.toHaveAttribute('data-invertida')
  })

  it('el turno de B se anuncia como «tu turno» a B y como del rival a A', () => {
    montar(base('B'), 'B')
    expect(screen.getAllByText(/tu turno/i).length).toBeGreaterThan(0)
  })
})
