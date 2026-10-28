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

  it('«Responder» con una Arcana también deja elegir el Éter', async () => {
    const user = userEvent.setup()
    const s = conCadena()
    s.players.A.mano = []
    // El Reino Perdido (coste 2) boca abajo con su candado abierto: puede activarse como respuesta
    s.instances.arc = { cardInstanceId: 'arc', cardId: 'FB-023', owner: 'A', bocaArriba: false, condicionHabilitada: true }
    s.players.A.campo.arcanasCombate[0] = 'arc'
    expect(getValidActions(s, 'A').some((a) => a.type === 'responder_cadena' && a.cardInstanceId === 'arc')).toBe(true)
    const onAccion = montar(s)

    await user.click(screen.getByRole('button', { name: 'Responder' }))

    expect(onAccion).not.toHaveBeenCalled()
    expect(screen.getByText('Pagar con Éter')).toBeInTheDocument()
  })

  it('«Responder» con el Disparo de un Campeón (Aurora, paga 2 Éter) también deja elegir el Éter', async () => {
    const user = userEvent.setup()
    const s = conCadena()
    s.players.A.mano = []
    s.instances.aurora = { cardInstanceId: 'aurora', cardId: 'FB-010', owner: 'A' }
    s.players.A.campo.campeones[1] = 'aurora'
    expect(getValidActions(s, 'A').some((a) => a.type === 'responder_cadena' && a.cardInstanceId === 'aurora')).toBe(true)
    const onAccion = montar(s)

    await user.click(screen.getByRole('button', { name: 'Responder' }))

    expect(onAccion).not.toHaveBeenCalled()
    expect(screen.getByText('Pagar con Éter')).toBeInTheDocument()
  })
})

describe('Último Refugio: bloquear el Éter es parte de jugarla', () => {
  it('tras elegir el pago pide el bloqueo (sin los Éteres ya elegidos) y manda ambos en la misma acción', async () => {
    const user = userEvent.setup()
    const s = base()
    // 6 Éteres en total: 3 pagan, 3 se bloquean; el rival tiene una Mística que copiar
    for (const n of [4, 5]) {
      s.instances[`e${n}`] = { cardInstanceId: `e${n}`, cardId: 'FB-001', owner: 'A' }
      s.players.A.eterReserva.push(`e${n}`)
    }
    s.instances.fb022 = { cardInstanceId: 'fb022', cardId: 'FB-022', owner: 'A' }
    s.players.A.mano = ['fb022']
    s.instances.rival = { cardInstanceId: 'rival', cardId: 'FB-020', owner: 'B' }
    s.players.B.campo.misticasTacticas[0] = 'rival'

    const acciones = getValidActions(s, 'A')
    const jugar = acciones.find((a) => a.type === 'jugar_mistica' && a.cardInstanceId === 'fb022')
    expect(jugar).toBeDefined()
    const onAccion = vi.fn()
    render(<Tablero vista={visibleState(s, 'A')} acciones={acciones} leTocaA={true} log={[]} onAccion={onAccion} onAbandonar={vi.fn()} />)

    await user.click(document.querySelector<HTMLElement>('[data-testid="mano"] [data-inst="fb022"]')!)
    await user.click(screen.getByRole('button', { name: 'Jugar' }))

    // 1. pago: 3 Éteres
    const eteres = () => screen.getAllByRole('button').filter((b) => b.textContent?.includes('aporte'))
    expect(eteres()).toHaveLength(6)
    const pagados = eteres().slice(0, 3).map((b) => b.getAttribute('title'))
    for (const b of eteres().slice(0, 3)) await user.click(b)
    await user.click(screen.getByRole('button', { name: 'Pagar y jugar' }))
    expect(onAccion).not.toHaveBeenCalled()

    // 2. bloqueo: pide exactamente 3 y el selector ya no ofrece los que pagaron
    expect(screen.getByText(/Bloquea exactamente 3 Éter\(es\) sobre Último Refugio/)).toBeInTheDocument()
    const libres = screen.getAllByRole('button').filter((b) => b.getAttribute('title')?.startsWith('Éter') && !b.closest('[data-testid="mano"]'))
    expect(libres.length).toBeGreaterThanOrEqual(3)
    expect(pagados.length).toBe(3)

    const bloqueables = libres.slice(-3)
    for (const b of bloqueables) await user.click(b)
    await user.click(screen.getByRole('button', { name: 'Bloquear y jugar' }))

    // 3. casilla (si hay varias) y envío: pago y bloqueo juntos, sin repetir Éter
    const casilla = screen.queryAllByRole('button', { name: /^Colocar en 3[ABC]$/ })[0]
    if (casilla && onAccion.mock.calls.length === 0) await user.click(casilla)
    await vi.waitFor(() => expect(onAccion).toHaveBeenCalledTimes(1), { timeout: 5000 })
    const enviada = onAccion.mock.calls[0][0] as { type: string; eterIds: string[]; bloqueoEterIds: string[] }
    expect(enviada.type).toBe('jugar_mistica')
    expect(enviada.eterIds).toHaveLength(3)
    expect(enviada.bloqueoEterIds).toHaveLength(3)
    expect(enviada.bloqueoEterIds.some((id) => enviada.eterIds.includes(id))).toBe(false)
  })
})
