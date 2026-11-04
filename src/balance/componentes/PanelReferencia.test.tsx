import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelReferencia } from './PanelReferencia'

const cargas = vi.hoisted(() => ({ n: 0 }))

vi.mock('../../../seed/CartasPrueba.json', async (importarOriginal) => {
  cargas.n += 1
  return importarOriginal()
})

const NOMBRE = 'Incluir cartas de referencia (paquete de pruebas, no publicado)'

describe('PanelReferencia', () => {
  it('por defecto está apagado, sin cartas y sin cargar el paquete de pruebas', () => {
    render(<PanelReferencia />)
    const interruptor = screen.getByRole('switch', { name: NOMBRE })
    expect(interruptor).not.toBeChecked()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Referencia (no publicadas)')).not.toBeInTheDocument()
    expect(cargas.n).toBe(0)
  })

  it('al activarlo carga el paquete y muestra las cartas con su etiqueta visible', async () => {
    render(<PanelReferencia />)
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    const tabla = await screen.findByRole('table', { name: /cartas de referencia/i })
    expect(cargas.n).toBe(1)
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(58)
    for (const fila of filas) {
      expect(within(fila).getAllByRole('cell').at(-1)).toHaveTextContent('Referencia (no publicadas)')
    }
    expect(within(tabla).getByRole('row', { name: /Peón de Prueba/ })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: NOMBRE })).toBeChecked()
  })

  it('ordena por índice de poder de mayor a menor', async () => {
    render(<PanelReferencia />)
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    const tabla = await screen.findByRole('table', { name: /cartas de referencia/i })
    const indices = within(tabla)
      .getAllByRole('row')
      .slice(1)
      .map((r) => Number(within(r).getAllByRole('cell')[3].textContent))
    expect(indices).toEqual([...indices].sort((a, b) => b - a))
  })

  it('al apagarlo las cartas desaparecen', async () => {
    render(<PanelReferencia />)
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    await screen.findByRole('table', { name: /cartas de referencia/i })
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('avisa que no cuentan en métricas, letalidad, ajustes ni exportación', () => {
    render(<PanelReferencia />)
    expect(screen.getByText(/no cuentan/i)).toBeInTheDocument()
  })
})
