import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ESTASIS_CARDS } from '../../shared/data/paquetes'
import {
  applyAction,
  createInitialState,
  faccionesCompartidas,
  getCardMeta,
  getValidActions,
  visibleState,
} from '../game'
import type { Action, GameState } from '../game'
import { MAZOS } from '../mazos'
import { Tablero } from '../components/Tablero'

const SEEDS = [42, 1, 2, 3, 4, 5, 7, 11, 13, 17, 19, 23, 29]

/** Crea la partida y pasa los dos mulligans: llega a Forja (turno = primerJugador). */
function partidaEnForja(seed: number): GameState {
  const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, seed)
  let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
  s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
  if (s.fase !== 'forja') throw new Error(`seed ${seed}: no llegó a forja (fase ${s.fase})`)
  return s
}

/** Forja con turno de A y al menos una carta con coste (jugar/colocar) en mano. */
function forjaDeAConCoste(): GameState {
  for (const seed of SEEDS) {
    const s = partidaEnForja(seed)
    if (s.turno !== 'A') continue
    const conCoste = getValidActions(s, 'A').some(
      (a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica' || a.type === 'colocar_arcana',
    )
    if (conCoste) return s
  }
  throw new Error('Ningún seed probado tiene forja con turno A y carta con coste en mano')
}

/** Forja con turno de A (para acciones de campeón propio). */
function forjaDeA(): GameState {
  for (const seed of SEEDS) {
    const s = partidaEnForja(seed)
    if (s.turno === 'A') return s
  }
  throw new Error('Ningún seed probado tiene forja con turno A')
}

describe('Selección de Éter en el tablero 4×7', () => {
  it('permite elegir los Éteres de la Reserva para pagar y confirma la acción con esos ids', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // 1. Hay al menos una carta con badge "Pagar" (coste) en la mano
    expect(screen.getAllByText('Pagar').length).toBeGreaterThan(0)

    // 2. Click en esa carta (MiniCard con title = nombre) → abre el selector.
    //    El badge "Pagar" tiene pointer-events: none, así que el click va al
    //    contenedor con onClick (el mismo div que lleva el title).
    const conCoste = acciones.find(
      (a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica' || a.type === 'colocar_arcana',
    ) as Extract<Action, { cardInstanceId: string }> | undefined
    expect(conCoste).toBeDefined()
    const nombreCarta = getCardMeta(vista.instances[conCoste!.cardInstanceId].cardId ?? '')?.name!
    await user.click(screen.getAllByTitle(nombreCarta)[0])
    expect(screen.getByText(/Elegí los Éteres de tu Reserva/)).toBeInTheDocument()

    const coste = Number((screen.getByText(/Coste: \d+/).textContent ?? '').replace(/[^\d]/g, ''))

    // 3. Toggle de Éteres de la Reserva hasta que el pago alcance (Σ aporte ≥ coste×2)
    const confirmar = () => screen.getByRole('button', { name: 'Pagar y jugar' })
    const botonesEter = screen.getAllByRole('button').filter((b) => b.getAttribute('title'))
    expect(botonesEter.length).toBeGreaterThan(0)
    const titulosElegidos: string[] = []
    for (let i = 0; i < botonesEter.length && (confirmar() as HTMLButtonElement).disabled; i++) {
      await user.click(botonesEter[i])
      titulosElegidos.push(botonesEter[i].getAttribute('title')!)
    }
    expect((confirmar() as HTMLButtonElement).disabled).toBe(false)

    // 4. Confirmar → la acción llega con EXACTAMENTE los Éteres elegidos
    await user.click(confirmar())
    expect(onAccion).toHaveBeenCalledTimes(1)
    const accion = onAccion.mock.calls[0][0] as Action & { eterIds: string[] }
    expect(accion.eterIds.length).toBe(titulosElegidos.length)
    for (const id of accion.eterIds) {
      const nombre = getCardMeta(vista.instances[id]?.cardId ?? '')?.name
      expect(titulosElegidos).toContain(nombre)
    }
    // El selector se cierra tras confirmar
    expect(screen.queryByRole('button', { name: 'Pagar y jugar' })).not.toBeInTheDocument()
  })

  it('permite elegir los Éteres a bloquear sobre un Campeón propio', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    // Campeón propio en 2B (slot 0) que comparta facción con al menos un Éter de la Reserva
    const campeon = ESTASIS_CARDS.find(
      (c) =>
        c.type === 'Campeón' &&
        estado.players.A.eterReserva.some((id) => {
          const meta = getCardMeta(estado.instances[id].cardId ?? '')
          return meta !== null && faccionesCompartidas(meta.facciones, c.facciones)
        }),
    )
    expect(campeon).toBeDefined()
    estado.instances['inst-camp'] = { cardInstanceId: 'inst-camp', cardId: campeon!.id, owner: 'A' }
    estado.players.A.campo.campeones[0] = 'inst-camp'

    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    expect(acciones.some((a) => a.type === 'bloquear_eter' && a.campeonSlot === 0)).toBe(true)

    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Botón "Bloquear" bajo el campeón → abre el selector (no ejecuta directo)
    await user.click(screen.getAllByRole('button', { name: 'Bloquear' })[0])
    expect(screen.getByText(/Elegí los Éteres a bloquear/)).toBeInTheDocument()

    // Elegir UN éter de facción compartida (botón habilitado del selector) y confirmar
    const eterCompartido = estado.players.A.eterReserva.find((id) => {
      const meta = getCardMeta(estado.instances[id].cardId ?? '')
      return meta !== null && faccionesCompartidas(meta.facciones, campeon!.facciones)
    })!
    const nombreEter = getCardMeta(estado.instances[eterCompartido].cardId ?? '')?.name!
    await user.click(screen.getAllByTitle(nombreEter)[0])
    const confirmar = screen.getAllByRole('button', { name: 'Bloquear' })
    await user.click(confirmar[confirmar.length - 1])

    expect(onAccion).toHaveBeenCalledTimes(1)
    const accion = onAccion.mock.calls[0][0] as Action & { eterIds: string[]; campeonSlot: number }
    expect(accion.type).toBe('bloquear_eter')
    expect(accion.campeonSlot).toBe(0)
    expect(accion.eterIds.length).toBe(1)
    expect(estado.players.A.eterReserva).toContain(accion.eterIds[0])
  })
})
