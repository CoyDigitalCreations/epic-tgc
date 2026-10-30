import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ESTASIS_CARDS } from '../../shared/data/paquetes'
import { applyAction, createInitialState } from '../game'
import type { GameState } from '../game'
import { MAZOS } from '../mazos'
import { BlockingInterface } from '../components/BlockingInterface'

const CAMPEONES = ESTASIS_CARDS.filter((c) => c.type === 'Campeón')

/** Estado base (mulligans pasados) con campeones propios de A en 2B-2D y N atacantes de B en la mesa. */
function estadoConDefensores(nAtacantes: number): { s: GameState; atacantes: string[]; defensores: string[] } {
  const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, 42)
  let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
  s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
  const defensores = ['def-0', 'def-1', 'def-2']
  defensores.forEach((id, i) => {
    s.instances[id] = { cardInstanceId: id, cardId: CAMPEONES[i].id, owner: 'A' }
    s.players.A.campo.campeones[i] = id
  })
  const atacantes = Array.from({ length: nAtacantes }, (_, i) => `atk-${i}`)
  atacantes.forEach((id, i) => {
    s.instances[id] = { cardInstanceId: id, cardId: CAMPEONES[3 + i].id, owner: 'B' }
    s.players.B.campo.campeones[i] = id
  })
  return { s, atacantes, defensores }
}

function renderBloqueo(nAtacantes: number) {
  const { s, atacantes, defensores } = estadoConDefensores(nAtacantes)
  const onBloquear = vi.fn()
  render(<BlockingInterface s={s} defensor="A" atacantes={atacantes} onBloquear={onBloquear} onCancelar={vi.fn()} />)
  const tiles = () => screen.getAllByRole('button', { pressed: undefined }).filter((b) => b.hasAttribute('aria-pressed'))
  return { onBloquear, tiles, defensores }
}

const confirmar = () => screen.getByRole('button', { name: /^Confirmar bloqueo/ })

describe('BlockingInterface: deshacer la selección', () => {
  it('clic en un defensor ya asignado lo libera', async () => {
    const user = userEvent.setup()
    const { tiles } = renderBloqueo(1)
    await user.click(tiles()[0])
    expect(tiles()[0]).toHaveAttribute('aria-pressed', 'true')
    expect(confirmar()).toBeEnabled()

    await user.click(tiles()[0])
    expect(tiles()[0]).toHaveAttribute('aria-pressed', 'false')
    expect(confirmar()).toBeDisabled()
  })

  it('con un solo atacante, elegir otro defensor reemplaza al anterior', async () => {
    const user = userEvent.setup()
    const { tiles } = renderBloqueo(1)
    await user.click(tiles()[0])
    await user.click(tiles()[2])

    expect(tiles()[0]).toHaveAttribute('aria-pressed', 'false')
    expect(tiles()[2]).toHaveAttribute('aria-pressed', 'true')
    expect(confirmar()).toHaveTextContent('1/1')
  })

  it('«Limpiar» vacía todas las asignaciones y se apaga sin ninguna', async () => {
    const user = userEvent.setup()
    const { tiles } = renderBloqueo(2)
    const limpiar = screen.getByRole('button', { name: 'Limpiar' })
    expect(limpiar).toBeDisabled()

    await user.click(tiles()[0])
    await user.click(tiles()[1])
    expect(confirmar()).toHaveTextContent('2/2')
    expect(limpiar).toBeEnabled()

    await user.click(limpiar)
    expect(confirmar()).toHaveTextContent('0/2')
    expect(tiles().every((t) => t.getAttribute('aria-pressed') === 'false')).toBe(true)
  })
})
