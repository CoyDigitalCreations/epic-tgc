import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CARTAS } from '../test/cartasReales'
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

describe('PanelReferencia con el estado levantado (prop referencia)', () => {
  const cartasPrueba = CARTAS.slice(0, 3).map((c) => ({ ...c, esReferencia: true }))
  const base = { activa: true, estado: 'lista' as const, cartas: cartasPrueba, crudas: new Map(), setActiva: () => {} }

  it('usa la referencia recibida: muestra su tabla sin cargar el paquete por su cuenta', () => {
    const antes = cargas.n
    render(<PanelReferencia referencia={base} />)
    expect(screen.getByRole('switch', { name: NOMBRE })).toBeChecked()
    const tabla = screen.getByRole('table', { name: /cartas de referencia/i })
    expect(within(tabla).getAllByRole('row').slice(1)).toHaveLength(3)
    expect(cargas.n).toBe(antes)
  })

  it('el interruptor llama a setActiva de la referencia recibida', async () => {
    const setActiva = vi.fn()
    render(<PanelReferencia referencia={{ ...base, activa: false, estado: 'apagada', cartas: [], setActiva }} />)
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    expect(setActiva).toHaveBeenCalledWith(true)
  })

  it('muestra cargando y error según el estado recibido', () => {
    const { rerender } = render(<PanelReferencia referencia={{ ...base, estado: 'cargando', cartas: [] }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando cartas de referencia')
    rerender(<PanelReferencia referencia={{ ...base, estado: 'error', cartas: [] }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las cartas de referencia.')
  })
})

describe('PanelReferencia cuando falla la carga del paquete', () => {
  afterEach(() => {
    vi.doUnmock('../../../seed/CartasPrueba.json')
  })

  it('muestra un aviso, no muestra cartas y permite reintentar al apagar y volver a activar', async () => {
    vi.doMock('../../../seed/CartasPrueba.json', () => {
      throw new Error('sin red')
    })
    render(<PanelReferencia />)
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudieron cargar las cartas de referencia.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Referencia (no publicadas)')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: NOMBRE })).toBeChecked()

    // Al apagar, el aviso desaparece.
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Al volver a activar con el paquete disponible, se recupera sin aviso residual.
    vi.doMock('../../../seed/CartasPrueba.json', async (importarOriginal) => importarOriginal())
    await userEvent.click(screen.getByRole('switch', { name: NOMBRE }))
    expect(await screen.findByRole('table', { name: /cartas de referencia/i })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
