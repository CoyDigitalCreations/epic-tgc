import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getValidActions, visibleState } from '../game'
import type { GameState } from '../game'
import { Tablero } from '../components/Tablero'

/** Forja de A: Cassandra en 2B, el rival con una Mística en 3A (sirve de efecto que abre la cadena) y Éteres en la Reserva. */
function base(): GameState {
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
  const poner = (id: string, cardId: string, owner: 'A' | 'B' = 'A') => {
    s.instances[id] = { cardInstanceId: id, cardId, owner }
  }
  poner('cass', 'FB-016')
  s.players.A.campo.campeones = ['cass', null, null, null, null]
  for (const [i, cardId] of ['FB-001', 'FB-001', 'FB-001', 'FB-003'].entries()) {
    poner(`e${i}`, cardId)
    s.players.A.eterReserva.push(`e${i}`)
  }
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

describe('Artefacto recién llegado: el selector de Campeón se abre solo', () => {
  it('con un equipar pendiente abre «Equipar Artefacto» sin tocar nada y no equipa por su cuenta', () => {
    const s = base()
    s.instances.art = { cardInstanceId: 'art', cardId: 'FB-020', owner: 'A' }
    s.players.A.campo.misticasTacticas[0] = 'art'
    s.equiparPendiente = { artefactoId: 'art', jugador: 'A', contexto: 'jugar_mistica' }

    const onAccion = montar(s)

    expect(screen.getByRole('heading', { name: 'Equipar Artefacto' })).toBeInTheDocument()
    expect(onAccion).not.toHaveBeenCalled()
  })

  it('sin pendiente (Artefacto ya equipado o sin nada que equipar) no se abre nada', () => {
    const s = base()
    montar(s)
    expect(screen.queryByText('Equipar Artefacto')).not.toBeInTheDocument()
  })
})

describe('Presteza desde la mano: el jugador elige con qué Éter paga', () => {
  /** Cadena global abierta con la prioridad en A, que tiene Marcha de las Primeras (Presteza, coste 3) en la mano. */
  function conCadena(): GameState {
    const s = base()
    s.instances.marcha = { cardInstanceId: 'marcha', cardId: 'FB-021', owner: 'A' }
    s.players.A.mano = ['marcha']
    s.instances.rival = { cardInstanceId: 'rival', cardId: 'FB-020', owner: 'B' }
    s.players.B.campo.misticasTacticas[0] = 'rival'
    s.cadena = {
      origen: 'global',
      pila: [],
      prioridad: 'A',
      pasesConsecutivos: 0,
      faseAbierta: 'forja',
      efectoActual: { jugador: 'B', cardInstanceId: 'rival', descripcion: 'efecto del rival' },
    }
    return s
  }

  it('«Jugar» abre el selector de Éter en vez de mandar la combinación del motor', async () => {
    const user = userEvent.setup()
    const s = conCadena()
    expect(getValidActions(s, 'A').some((a) => a.type === 'jugar_respuesta')).toBe(true)
    const onAccion = montar(s)

    await user.click(screen.getByRole('button', { name: 'Jugar' }))

    expect(onAccion).not.toHaveBeenCalled()
    expect(screen.getByText('Pagar con Éter')).toBeInTheDocument()
  })
})
