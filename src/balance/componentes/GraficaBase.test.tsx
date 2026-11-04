import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Bar, BarChart, XAxis } from 'recharts'
import { GraficaBase } from './GraficaBase'
import { instalarEntornoGraficas } from '../test/entornoGraficas'

const datos = [
  { mazo: 'Estásis', cartas: 10 },
  { mazo: 'Disonancia', cartas: 12 },
]
const tabla = {
  caption: 'Cartas por mazo',
  columnas: ['Mazo', 'Cartas'],
  filas: [
    ['Estásis', '10'],
    ['Disonancia', '12'],
  ],
}

describe('GraficaBase', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  it('con ancho y alto renderiza tamaño fijo, con role=img, aria-label y título', () => {
    render(
      <GraficaBase titulo="Cartas por mazo" descripcion="Cuenta de cartas" ancho={400} alto={200} tabla={tabla}>
        {(ancho, alto) => (
          <BarChart width={ancho} height={alto} data={datos}>
            <XAxis dataKey="mazo" />
            <Bar dataKey="cartas" />
          </BarChart>
        )}
      </GraficaBase>,
    )
    const figura = screen.getByRole('img', { name: /cartas por mazo/i })
    expect(figura).toHaveAttribute('aria-label', expect.stringContaining('Cuenta de cartas'))
    expect(screen.getByRole('heading', { name: 'Cartas por mazo' })).toBeInTheDocument()
    expect(figura.querySelector('.recharts-responsive-container')).toBeNull()
  })

  it('siempre incluye su tabla alternativa con caption y celdas', () => {
    render(
      <GraficaBase titulo="Cartas por mazo" descripcion="d" ancho={400} alto={200} tabla={tabla}>
        {(ancho, alto) => <BarChart width={ancho} height={alto} data={datos} />}
      </GraficaBase>,
    )
    const t = screen.getByRole('table', { name: 'Cartas por mazo' })
    expect(within(t).getByRole('cell', { name: '12' })).toBeInTheDocument()
  })

  it('sin ancho/alto usa ResponsiveContainer', () => {
    const { container } = render(
      <GraficaBase titulo="Responsiva" descripcion="d" tabla={tabla}>
        {() => <BarChart data={datos} />}
      </GraficaBase>,
    )
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    expect(screen.getByRole('table', { name: 'Cartas por mazo' })).toBeInTheDocument()
  })
})
