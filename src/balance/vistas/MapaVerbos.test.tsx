import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { MapaVerbos } from './MapaVerbos'

const celdas = (verbo: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${verbo} `) }))
    .getAllByRole('cell')
    .map((c) => c.textContent)

describe('MapaVerbos', () => {
  it('cruza mazo × verbo con la clase de identidad de cada mazo', () => {
    render(<MapaVerbos cartas={CARTAS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Mapa de verbos' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /verbos por mazo/i })).toBeInTheDocument()
    expect(celdas('destroy')).toEqual(['destroy', '0', '4', 'Fuera de identidad', 'Identidad'])
    expect(celdas('buff')).toEqual(['buff', '7', '8', 'Neutral', 'Neutral'])
  })

  it('las columnas dicen de qué mazo es cada cantidad y cada clase', () => {
    render(<MapaVerbos cartas={CARTAS} />)
    const t = screen.getByRole('table', { name: /verbos por mazo/i })
    for (const h of ['Verbo', 'Estásis', 'Disonancia', 'Estásis: rol del verbo', 'Disonancia: rol del verbo']) {
      expect(within(t).getByRole('columnheader', { name: h })).toBeInTheDocument()
    }
  })

  it('sin cartas muestra el estado vacío', () => {
    render(<MapaVerbos cartas={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })
})
