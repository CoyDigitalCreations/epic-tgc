import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { MatrizLetalidad } from './MatrizLetalidad'

const filas = (nombre: RegExp) =>
  within(screen.getByRole('table', { name: nombre }))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))

describe('MatrizLetalidad', () => {
  it('tabla por Campeón con porcentajes y etiquetas de dominante e invulnerable', () => {
    render(<MatrizLetalidad cartas={CARTAS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Matriz de letalidad' })).toBeInTheDocument()
    const tabla = filas(/letalidad por campeón/i)
    expect(tabla).toHaveLength(18)
    // Rediseño de Disonancia (Lote 2): ya no hay ATQ 5 de Disonancia (Kael 4/2, Marek 4/3) ni RES 5 de Korr (4/4): Nymeria mata a 12 y la mata 1
    expect(tabla.find((f) => f[0].startsWith('Nymeria'))).toEqual([
      'Nymeria de Casa Eterna', '4 / 5', '12 de 17', '1 de 17', '70.6', '5.9', 'Dominante',
    ])
    expect(tabla.find((f) => f[0].startsWith('Vorlag'))?.at(-1)).toBe('Dominante')
    expect(tabla.find((f) => f[0].startsWith('Isolde'))).toEqual([
      'Isolde de Casa Última', '3 / 6', '9 de 17', '0 de 17', '52.9', '0', 'Invulnerable',
    ])
    expect(tabla.find((f) => f[0].startsWith('Vaela'))?.at(-1)).toBe('—')
    expect(tabla.filter((f) => f.at(-1) === 'Invulnerable')).toHaveLength(3)
  })

  it('la matriz marca con texto a quién mata cada Campeón', () => {
    render(<MatrizLetalidad cartas={CARTAS} />)
    const matriz = screen.getByRole('table', { name: /quién mata a quién/i })
    expect(within(matriz).getAllByRole('row')).toHaveLength(19)
    const fila = within(matriz).getByRole('row', { name: /^Nymeria/ })
    const celdas = within(fila).getAllByRole('cell')
    expect(celdas).toHaveLength(18)
    expect(celdas.filter((c) => c.textContent === '●Mata')).toHaveLength(12)
    expect(within(matriz).getByRole('columnheader', { name: 'Vaela de Casa Alba' })).toBeInTheDocument()
  })

  it('muestra los escalones por RES y por ATQ', () => {
    render(<MatrizLetalidad cartas={CARTAS} />)
    const res = filas(/escalones por RES/i)
    expect(res.find((f) => f[0] === '3')).toEqual(['3', '18', '100', 'Igual que RES 2'])
    expect(res.find((f) => f[0] === '4')).toEqual(['4', '9', '50', '—'])
    expect(res.find((f) => f[0] === '5')?.slice(0, 2)).toEqual(['5', '1'])
    expect(res.find((f) => f[0] === '6')?.slice(0, 2)).toEqual(['6', '0'])
    const atq = filas(/escalones por ATQ/i)
    expect(atq.find((f) => f[0] === '4')?.slice(0, 2)).toEqual(['4', '12'])
    expect(atq.find((f) => f[0] === '5')?.slice(0, 2)).toEqual(['5', '15'])
  })

  it('con filtro muestra solo esos Campeones pero el pool sigue completo', () => {
    render(<MatrizLetalidad cartas={CARTAS.filter((c) => c.mazo === 'estasis')} publicadas={CARTAS} />)
    const tabla = filas(/letalidad por campeón/i)
    expect(tabla).toHaveLength(9)
    expect(tabla.find((f) => f[0].startsWith('Nymeria'))?.[2]).toBe('12 de 17')
    expect(screen.getByText(/no cambia con los filtros/i)).toBeInTheDocument()
  })

  it('sin Campeones muestra el estado vacío', () => {
    render(<MatrizLetalidad cartas={[]} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
