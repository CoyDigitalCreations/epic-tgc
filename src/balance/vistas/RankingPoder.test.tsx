import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS } from '../test/cartasReales'
import { RankingPoder } from './RankingPoder'

describe('RankingPoder', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  const montar = (cartas = CARTAS) => render(<RankingPoder cartas={cartas} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} />)

  it('lista las cartas por índice de poder de mayor a menor', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Ranking de poder' })).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: /ranking del índice de poder de todas/i })
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(66)
    const primera = within(filas[0]).getAllByRole('cell').map((c) => c.textContent)
    expect(primera.slice(0, 2)).toEqual(['1', 'Ragnar, Voz del Nudo'])
    // Ragnar sube de 8.8 a 10.4 con el tope de costo del 50 % (su efecto con costo ya no se descuenta completo)
    expect(primera).toContain('10.4')
  })

  it('el semáforo lleva texto además del color', () => {
    montar()
    const tabla = within(screen.getByRole('table', { name: /ranking del índice de poder de todas/i }))
    // Bandas v1.1: Kael (5/3, coste 2) pasa su suma objetivo por 2.3 (> 1.5), así que sale Rojo;
    // Marek (5/4, coste 3) la pasa por 1.3 y sigue Amarillo.
    const kael = tabla.getByRole('row', { name: /Kael, Filo del Nudo/ })
    expect(within(kael).getByLabelText('Semáforo: Rojo')).toHaveTextContent('Rojo')
    const marek = tabla.getByRole('row', { name: /Marek, Cosecha del Nudo/ })
    expect(within(marek).getByLabelText('Semáforo: Amarillo')).toHaveTextContent('Amarillo')
    const aurora = tabla.getByRole('row', { name: /Aurora, La Primogénita/ })
    expect(within(aurora).getByLabelText('Semáforo: Verde')).toHaveTextContent('Verde')
  })

  it('la gráfica del top 10 tiene su alternativa tabular', () => {
    montar()
    const top = screen.getByRole('table', { name: /diez cartas con mayor índice/i })
    expect(within(top).getAllByRole('row')).toHaveLength(11)
    expect(screen.getByRole('img', { name: /diez cartas con mayor índice/i })).toBeInTheDocument()
  })

  it('con onAnalizar agrega la columna «Analizar» y un botón cuyo nombre incluye la carta', async () => {
    const alAnalizar = vi.fn()
    render(<RankingPoder cartas={CARTAS} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} onAnalizar={alAnalizar} />)
    const tabla = within(screen.getByRole('table', { name: /ranking del índice de poder de todas/i }))
    expect(tabla.getAllByRole('columnheader').at(-1)).toHaveTextContent('Analizar')
    expect(tabla.getAllByRole('button', { name: /^Analizar / })).toHaveLength(66)
    await userEvent.click(tabla.getByRole('button', { name: 'Analizar Ragnar, Voz del Nudo' }))
    expect(alAnalizar).toHaveBeenCalledExactlyOnceWith('DS-010')
  })

  it('sin onAnalizar no hay columna ni botones', () => {
    montar()
    expect(screen.queryByRole('columnheader', { name: 'Analizar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Analizar / })).not.toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío', () => {
    montar([])
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })
})
