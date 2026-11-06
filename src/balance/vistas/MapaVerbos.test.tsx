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
    // Rediseño de Disonancia (Lote 2): Ragnar y Draven dejaron de destruir (arrebatan Éter); quedan Varek, Tormenta del Sur y Skarn
    expect(celdas('destroy')).toEqual(['destroy', '0', '3', 'Fuera de identidad', 'Identidad'])
    // buff de Disonancia: DS-005, Comandante de Ragnar (+3 ATQ), DS-021, DS-024 y DS-025 (antes 8: también Éter del Último Trueno, Éter del Primogénito, Korr y Grito del Primogénito)
    expect(celdas('buff')).toEqual(['buff', '7', '5', 'Neutral', 'Neutral'])
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
