import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { ResumenMazo } from './ResumenMazo'

const celdas = (nombre: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${nombre}`) }))
    .getAllByRole('cell')
    .map((c) => c.textContent)

describe('ResumenMazo', () => {
  it('muestra por mazo cartas, Campeones, identidad, fuera de banda y rotas', () => {
    render(<ResumenMazo cartas={CARTAS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Resumen por mazo' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /resumen por mazo/i })).toBeInTheDocument()
    expect(celdas('Estásis')).toEqual(['Estásis', '32', '10', '29.4', '4', '2'])
    expect(celdas('Disonancia')).toEqual(['Disonancia', '33', '10', '29.7', '4', '5'])
  })

  it('explica qué es una carta rota', () => {
    render(<ResumenMazo cartas={CARTAS} />)
    expect(screen.getByText(/rota/i, { selector: 'p' })).toBeInTheDocument()
  })

  it('con un solo mazo visible no muestra el otro', () => {
    render(<ResumenMazo cartas={CARTAS.filter((c) => c.mazo === 'estasis')} />)
    expect(screen.getByRole('row', { name: /^Estásis/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /^Disonancia/ })).not.toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío y ninguna tabla', () => {
    render(<ResumenMazo cartas={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
