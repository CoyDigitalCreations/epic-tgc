import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS } from '../test/cartasReales'
import { Comparador } from './Comparador'

describe('Comparador', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  const montar = (cartas = CARTAS, publicadas = CARTAS) =>
    render(<Comparador cartas={cartas} publicadas={publicadas} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} />)
  const filas = (nombre: RegExp) =>
    within(screen.getByRole('table', { name: nombre }))
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))

  it('deja claro que el ajuste es exploratorio', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Comparador antes y después' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/exploratori/i)
    expect(screen.getByRole('note')).toHaveTextContent(/no cambia/i)
  })

  it('lista los ajustes con stats antes y después, letalidad y aviso de techo', () => {
    montar()
    const tabla = filas(/ajustes propuestos/i)
    expect(tabla).toHaveLength(8)
    const elena = tabla.find((f) => f[0].startsWith('Elena'))!
    expect(elena.slice(0, 5)).toEqual(['Elena, Despertar del Éter', '3 / 0', '6 / 2', '6 → 16 de 17', 'Supera el techo del pool'])
    expect(elena[5]).toMatch(/por debajo del mínimo/)
    const isolde = tabla.find((f) => f[0].startsWith('Isolde'))!
    expect(isolde.slice(1, 3)).toEqual(['3 / 7', '3 / 6'])
    expect(isolde[4]).toBe('—')
  })

  it('muestra los avisos de forma visible y con texto', () => {
    montar()
    const lista = screen.getByRole('list', { name: 'Avisos del ajuste' })
    const items = within(lista).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('FB-015: ATQ 6 pasa el ATQ máximo del pool (5) y mataría a 16 de 17 rivales')
  })

  it('compara la suma media por coste antes y después', () => {
    montar()
    expect(screen.getByRole('img', { name: /suma media por coste/i })).toBeInTheDocument()
    expect(filas(/suma media por coste, antes y después/i)).toEqual([
      ['2', '7.67', '7.33', '7 a 8'],
      ['3', '7.29', '8.29', '8 a 10'],
      ['4', '8.8', '9', '9 a 11'],
    ])
  })

  it('pone en espejo Estásis y Disonancia antes y después', () => {
    montar()
    const espejo = filas(/espejo/i)
    expect(espejo.find((f) => f[0] === 'Suma media')).toEqual(['Suma media', '8.7', '9.3', '9', '9'])
    expect(espejo.find((f) => f[0] === 'Cartas')).toEqual(['Cartas', '32', '32', '33', '33'])
  })

  it('con filtro solo muestra los ajustes visibles pero simula con todo el pool', () => {
    montar(CARTAS.filter((c) => c.mazo === 'disonancia'))
    const tabla = filas(/ajustes propuestos/i)
    expect(tabla.map((f) => f[0].split(',')[0])).toEqual(['Kael', 'Draven', 'Varek', 'Thane'])
    expect(screen.queryByRole('list', { name: 'Avisos del ajuste' })).not.toBeInTheDocument()
    expect(screen.getByText(/sin avisos/i)).toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío', () => {
    montar([])
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })
})
