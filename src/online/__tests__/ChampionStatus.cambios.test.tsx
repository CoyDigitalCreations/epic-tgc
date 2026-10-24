import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GameState } from '../game'
import { aplicarMod } from '../game'
import { AnimacionActivaContext } from '../animacion/contexto'
import { ChampionStatus } from '../components/ChampionStatus'

/** Un Campeón (Aurora FB-010) en el slot 0 de A. */
function conCampeon(): GameState {
  const jugador = (id: 'A' | 'B') => ({
    id,
    mano: [] as string[],
    mazo: [] as string[],
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
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: { camp: { cardInstanceId: 'camp', cardId: 'FB-010', owner: 'A' } },
  }
  s.players.A.campo.campeones[0] = 'camp'
  return s
}

const buffeado = (s: GameState, poder: number, resistencia = 0): GameState => {
  const copia = structuredClone(s)
  if (poder) aplicarMod(copia, 'camp', 'poder', poder, 'ocaso')
  if (resistencia) aplicarMod(copia, 'camp', 'resistencia', resistencia, 'ocaso')
  return copia
}

describe('ChampionStatus: aviso de cambios de ATQ/RES', () => {
  it('al montarse no anuncia nada (las stats base de una carta que entra no son un cambio)', () => {
    render(<ChampionStatus s={conCampeon()} id="camp" />)
    expect(screen.queryByTestId('delta-stat')).not.toBeInTheDocument()
  })

  it('un buff de +2 ATQ muestra "+2" flotando junto al ATQ', () => {
    const base = conCampeon()
    const { rerender } = render(<ChampionStatus s={base} id="camp" />)
    rerender(<ChampionStatus s={buffeado(base, 2)} id="camp" />)

    const delta = screen.getByTestId('delta-stat')
    expect(delta).toHaveTextContent('+2')
    expect(delta).toHaveClass('text-green-300')
  })

  it('un debuff de -3 se muestra en rojo con su signo', () => {
    const base = conCampeon()
    const { rerender } = render(<ChampionStatus s={base} id="camp" />)
    rerender(<ChampionStatus s={buffeado(base, -3)} id="camp" />)

    const delta = screen.getByTestId('delta-stat')
    expect(delta).toHaveTextContent('-3')
    expect(delta).toHaveClass('text-red-400')
  })

  it('si cambian ATQ y RES a la vez, cada cifra anuncia el suyo', () => {
    const base = conCampeon()
    const { rerender } = render(<ChampionStatus s={base} id="camp" />)
    rerender(<ChampionStatus s={buffeado(base, 1, 2)} id="camp" />)
    expect(screen.getAllByTestId('delta-stat').map((d) => d.textContent)).toEqual(['+1', '+2'])
  })

  it('con la animación apagada, el número cambia pero no hay delta flotante', () => {
    const base = conCampeon()
    const ui = (s: GameState) => (
      <AnimacionActivaContext.Provider value={false}>
        <ChampionStatus s={s} id="camp" />
      </AnimacionActivaContext.Provider>
    )
    const { rerender } = render(ui(base))
    rerender(ui(buffeado(base, 2)))
    expect(screen.queryByTestId('delta-stat')).not.toBeInTheDocument()
  })
})
