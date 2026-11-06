import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS, CARTAS_ELENA_32 } from '../test/cartasReales'
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
    // Rediseño de Estásis: Elena 4/2 (suma 6) ya está dentro (la de antes, 3/2, estaba por debajo); Isolde 3/6 (coste 4) y Vaela 5/2 (coste 3) ya están dentro de banda.
    // «Por encima» lo ilustra Kael (DS-011, coste 2, 5/3).
    expect(celdas(/^Elena/)).toEqual(['Elena de Casa Serena', 'Estásis', '3', '4', '2', 'Dentro de banda'])
    // Intención cambiada con el tope de costo del 50 %: Isolde (índice 4.75, impuesto 1.4) ya no cabe, su suma 9 pasa el máximo 8.6.
    expect(celdas(/^Isolde/)).toEqual(['Isolde de Casa Última', 'Estásis', '4', '3', '6', 'Fuera de banda: por encima'])
    expect(celdas(/^Vaela/).at(-1)).toBe('Dentro de banda')
    expect(celdas(/^Kael/).at(-1)).toBe('Fuera de banda: por encima')
    expect(celdas(/^Seraphina/).at(-1)).toBe('Dentro de banda')
    expect(celdas(/^Aurora/).at(-1)).toBe('Exenta: dentro de su tope propio')
  })

  it('la Elena de antes (3/2) lleva el veredicto «por debajo»', () => {
    montar(CARTAS_ELENA_32)
    expect(celdas(/^Elena/)).toEqual(['Elena de Casa Serena', 'Estásis', '3', '3', '2', 'Fuera de banda: por debajo'])
  })

  it('describe la banda sombreada y permite cambiar de coste', async () => {
    montar()
    expect(screen.getByText(/suma de 5 a 6/)).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /banda del coste/i }), '3')
    expect(screen.getByText(/suma de 6 a 8/)).toBeInTheDocument()
    expect(screen.getByText(/tope de 5 de ATQ y 5 de RES/)).toBeInTheDocument()
  })

  it('sin Campeones o sin cartas muestra el estado vacío', () => {
    montar(CARTAS.filter((c) => c.tipo !== 'Campeón'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
