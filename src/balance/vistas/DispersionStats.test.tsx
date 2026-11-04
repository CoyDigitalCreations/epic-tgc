import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS } from '../test/cartasReales'
import { DispersionStats } from './DispersionStats'

describe('DispersionStats', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  const montar = (cartas = CARTAS) => render(<DispersionStats cartas={cartas} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} />)
  const tabla = () => screen.getByRole('table', { name: /campeones: coste, ATQ, RES y veredicto/i })
  const celdas = (nombre: RegExp) =>
    within(within(tabla()).getByRole('row', { name: nombre }))
      .getAllByRole('cell')
      .map((c) => c.textContent)

  it('tiene su gráfica descrita y una fila por Campeón en la tabla', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Dispersión de ATQ y RES' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /dispersión de atq y res/i })).toBeInTheDocument()
    expect(within(tabla()).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Carta',
      'Mazo',
      'Coste',
      'ATQ',
      'RES',
      'Veredicto',
    ])
    expect(within(tabla()).getAllByRole('row')).toHaveLength(21)
  })

  it('cada fila lleva el veredicto en palabras', () => {
    montar()
    expect(celdas(/^Elena/)).toEqual(['Elena, Despertar del Éter', 'Estásis', '3', '3', '0', 'Fuera de banda: por debajo'])
    expect(celdas(/^Isolde/)).toEqual(['Isolde, Última Casa', 'Estásis', '3', '3', '7', 'Fuera de banda: por encima'])
    expect(celdas(/^Vaela/).at(-1)).toBe('Dentro de banda')
    expect(celdas(/^Aurora/).at(-1)).toBe('Exenta: dentro de su tope propio')
  })

  it('describe la banda sombreada y permite cambiar de coste', async () => {
    montar()
    expect(screen.getByText(/suma de 7 a 8/)).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /banda del coste/i }), '3')
    expect(screen.getByText(/suma de 8 a 10/)).toBeInTheDocument()
    expect(screen.getByText(/tope de 6 de ATQ y 6 de RES/)).toBeInTheDocument()
  })

  it('sin Campeones o sin cartas muestra el estado vacío', () => {
    montar(CARTAS.filter((c) => c.tipo !== 'Campeón'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
