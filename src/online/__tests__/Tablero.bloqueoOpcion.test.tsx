import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getValidActions, visibleState } from '../game'
import type { GameState } from '../game'
import { Tablero } from '../components/Tablero'

/** Forja de A con una o dos Cassandras (aceptan 1 Éter suelto), la Voz de las Casas en 1A y 2 Éteres en la Reserva. */
function escenario(conUnCampeon = false): GameState {
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
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
  const poner = (id: string, cardId: string) => {
    s.instances[id] = { cardInstanceId: id, cardId, owner: 'A' }
  }
  poner('cass1', 'FB-016')
  poner('cass2', 'FB-016')
  s.players.A.campo.campeones = conUnCampeon ? ['cass1', null, null, null, null] : ['cass1', 'cass2', null, null, null]
  poner('pasivo', 'FB-005')
  s.players.A.eterPagado = ['pasivo']
  poner('e1', 'FB-001')
  poner('e2', 'FB-003')
  s.players.A.eterReserva = ['e1', 'e2']
  s.opcionesPendientes = [{ jugador: 'A', eterId: 'pasivo' }]
  return s
}

function montar(estado: GameState) {
  const onAccion = vi.fn()
  render(
    <Tablero
      vista={visibleState(estado, 'A')}
      acciones={getValidActions(estado, 'A')}
      leTocaA={true}
      log={[]}
      onAccion={onAccion}
      onAbandonar={vi.fn()}
    />,
  )
  return onAccion
}

describe('Pasivo 1A: modal para elegir Campeón y Éter', () => {
  it('se abre solo, pide primero el Campeón y después el Éter, y manda la pareja elegida', async () => {
    const user = userEvent.setup()
    const onAccion = montar(escenario())

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByText('Éter de la Voz de las Casas')).toBeInTheDocument()
    expect(within(modal).getByText('Elige el Campeón que recibe el Éter bloqueado')).toBeInTheDocument()

    // Las dos Cassandras son tiles distintos con el mismo nombre: el segundo es cass2
    await user.click(within(modal).getAllByRole('button', { name: /Cassandra, Vigía del Reino Perdido/ })[1])
    expect(within(modal).getByText(/Elige el Éter de tu Reserva que se bloquea sobre Cassandra/)).toBeInTheDocument()

    await user.click(within(modal).getByRole('button', { name: /Éter de la Sangre Eterna/ }))
    expect(onAccion).toHaveBeenCalledWith({ type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass2', eterId: 'e2' })
  })

  it('con un solo Campeón elegible salta directo a elegir el Éter', () => {
    montar(escenario(true))
    expect(screen.getByText(/Elige el Éter de tu Reserva que se bloquea sobre Cassandra/)).toBeInTheDocument()
  })

  it('"Ahora no" lo cierra sin gastar la opción y el botón de Acciones lo reabre', async () => {
    const user = userEvent.setup()
    const onAccion = montar(escenario())

    await user.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onAccion).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Bloquear Éter (Pasivo)' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ya no queda el botón genérico "Elegir opción" que decidía por ti', () => {
    montar(escenario())
    expect(screen.queryByRole('button', { name: 'Elegir opción' })).not.toBeInTheDocument()
  })
})
