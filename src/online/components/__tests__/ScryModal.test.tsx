import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScryModal } from '../ScryModal'
import type { GameState } from '../../game'

// Cartas reales del paquete (FB-016 Cassandra, FB-018 Rowena, FB-011 Vaela): solo importa que existan sus metas
const cardIds = { a: 'FB-016', b: 'FB-018', c: 'FB-011' }

function vista(): GameState {
  const instances: GameState['instances'] = {}
  for (const [id, cardId] of Object.entries(cardIds)) instances[id] = { cardInstanceId: id, cardId, owner: 'A' }
  return { instances } as unknown as GameState
}

function renderModal(onConfirmar = vi.fn()) {
  render(<ScryModal vista={vista()} cartas={['a', 'b', 'c']} onConfirmar={onConfirmar} />)
  return onConfirmar
}
const nombres = () => screen.getAllByText(/^Posición \d$|^Al fondo$/).map((n) => n.textContent)

describe('ScryModal — ordenar el tope del mazo', () => {
  it('confirmar sin tocar nada conserva el orden y no manda nada al fondo', () => {
    const onConfirmar = renderModal()
    expect(nombres()).toEqual(['Posición 1', 'Posición 2', 'Posición 3'])
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar/ }))
    expect(onConfirmar).toHaveBeenCalledWith(['a', 'b', 'c'], [])
  })

  it('mover a la derecha reordena y el orden se envía al confirmar', () => {
    const onConfirmar = renderModal()
    const derechas = screen.getAllByRole('button', { name: /a la derecha$/ })
    fireEvent.click(derechas[0]) // a pasa detrás de b
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar/ }))
    expect(onConfirmar).toHaveBeenCalledWith(['b', 'a', 'c'], [])
  })

  it('los extremos no se pueden sacar de la fila', () => {
    renderModal()
    expect(screen.getAllByRole('button', { name: /a la izquierda$/ })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /a la derecha$/ })[2]).toBeDisabled()
  })

  it('mandar al fondo separa la carta y cuenta cuántas van arriba y abajo', () => {
    const onConfirmar = renderModal()
    fireEvent.click(screen.getAllByRole('button', { name: 'Mandar al fondo' })[1]) // b al fondo
    expect(screen.getByRole('button', { name: 'Confirmar (2 arriba · 1 al fondo)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar/ }))
    expect(onConfirmar).toHaveBeenCalledWith(['a', 'c'], ['b'])
  })

  it('«Dejar arriba» deshace el envío al fondo', () => {
    const onConfirmar = renderModal()
    fireEvent.click(screen.getAllByRole('button', { name: 'Mandar al fondo' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Dejar arriba' }))
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar/ }))
    expect(onConfirmar).toHaveBeenCalledWith(['a', 'b', 'c'], [])
  })
})
