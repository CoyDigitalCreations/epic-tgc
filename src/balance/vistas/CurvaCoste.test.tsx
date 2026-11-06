import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS } from '../test/cartasReales'
import { CurvaCoste } from './CurvaCoste'

describe('CurvaCoste', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  const montar = (cartas = CARTAS) => render(<CurvaCoste cartas={cartas} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} />)

  it('cuenta las cartas por coste y rareza en una tabla', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Curva de coste' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /curva de coste/i })).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: /cartas por coste y rareza/i })
    const cabeceras = within(tabla).getAllByRole('columnheader').map((c) => c.textContent)
    expect(cabeceras).toEqual(['Coste', 'Total', 'Común', 'Poco Común', 'Rara', 'Épica', 'Única'])
    const filas = within(tabla).getAllByRole('row').slice(1)
    const celdas = filas.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))
    expect(celdas).toHaveLength(5)
    // Rediseño de Disonancia (Lote 2): Grito del Nudo (Común) pasó de coste 1 a 2, así que el coste 1 pierde un Común
    expect(celdas.find((f) => f[0] === '1')).toEqual(['1', '20', '10', '4', '4', '2', '0'])
    expect(celdas.find((f) => f[0] === '4')).toEqual(['4', '10', '4', '4', '0', '0', '2'])
  })

  it('solo muestra las rarezas presentes', () => {
    montar(CARTAS.filter((c) => c.rareza === 'Común'))
    const tabla = screen.getByRole('table', { name: /cartas por coste y rareza/i })
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Coste', 'Total', 'Común'])
  })

  it('sin cartas muestra el estado vacío', () => {
    montar([])
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })
})
