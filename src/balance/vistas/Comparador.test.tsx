import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS, CARTAS_DS_ANTES, CARTAS_ELENA_32_DS_ANTES, carta } from '../test/cartasReales'
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

  // Lote 2 del rediseño de Disonancia: la Disonancia real ya cabe en banda; los casos «los 4 de Disonancia» usan la de antes (CARTAS_DS_ANTES)
  it('con la Disonancia rediseñada el único ajuste es Isolde', () => {
    montar()
    const tabla = filas(/ajustes propuestos/i)
    expect(tabla).toHaveLength(1)
    expect(tabla[0][0]).toMatch(/^Isolde/)
  })

  it('la Elena real (4/2, suma 6) ya cabe en banda: los ajustes (con la Disonancia de antes) son los 4 de Disonancia más Isolde', () => {
    montar(CARTAS_DS_ANTES, CARTAS_DS_ANTES)
    const tabla = filas(/ajustes propuestos/i)
    // Isolde entra con el tope de costo del 50 % (índice 4.75, máximo 8.6 contra su suma 9)
    expect(tabla).toHaveLength(5)
    expect(tabla.find((f) => f[0].startsWith('Elena'))).toBeUndefined()
  })

  it('lista los ajustes con stats antes y después, letalidad y aviso de techo', () => {
    // Se usa la Elena de antes (3/2, bajo banda) para conservar el caso de un ajuste de Estásis.
    montar(CARTAS_ELENA_32_DS_ANTES, CARTAS_ELENA_32_DS_ANTES)
    const tabla = filas(/ajustes propuestos/i)
    // Con la Elena de antes hay 6 ajustes (Elena, Isolde y cuatro de Disonancia); Isolde (3/6, coste 4) ya no cabe con el índice nuevo.
    // Su caso «baja y conserva RES > ATQ» lo ilustra Draven (DS-012, 4/4 -> 2/3).
    expect(tabla).toHaveLength(6)
    const elena = tabla.find((f) => f[0].startsWith('Elena'))!
    // Con las bandas v1.1 el ATQ de Elena (4) no supera el techo del pool (5).
    expect(elena.slice(0, 5)).toEqual(['Elena de Casa Serena', '3 / 2', '4 / 2', '6 → 10 de 17', '—'])
    expect(elena[5]).toMatch(/por debajo del mínimo/)
    expect(tabla.find((f) => f[0].startsWith('Isolde'))?.slice(1, 3)).toEqual(['3 / 6', '3 / 5'])
    const draven = tabla.find((f) => f[0].startsWith('Draven'))!
    expect(draven.slice(1, 3)).toEqual(['4 / 4', '2 / 3'])
    expect(draven[4]).toBe('—')
  })

  it('con las cartas reales y las bandas v1.1 ningún ajuste supera el techo y no hay avisos', () => {
    montar()
    expect(screen.queryByRole('list', { name: 'Avisos del ajuste' })).not.toBeInTheDocument()
    expect(screen.getByText(/sin avisos/i)).toBeInTheDocument()
  })

  it('muestra los avisos de forma visible y con texto', () => {
    // Un Campeón de coste 5 con 2/0 sube a la suma mínima 10 (tope 8): ATQ 8 pasa el ATQ máximo del pool (5).
    const sintetica = { ...carta('Elena'), id: 'T-099', nombre: 'Sintética', coste: 5, stats: { atq: 2, res: 0 } }
    montar([...CARTAS, sintetica], [...CARTAS, sintetica])
    const lista = screen.getByRole('list', { name: 'Avisos del ajuste' })
    const items = within(lista).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('T-099: ATQ 8 pasa el ATQ máximo del pool (5) y mataría a 18 de 18 rivales')
  })

  it('compara la suma media por coste antes y después', () => {
    montar(CARTAS_DS_ANTES, CARTAS_DS_ANTES) // la Disonancia de antes: el coste 2 (media 7.25) se corrige a 5.5
    expect(screen.getByRole('img', { name: /suma media por coste/i })).toBeInTheDocument()
    expect(filas(/suma media por coste, antes y después/i)).toEqual([
      ['2', '7.25', '5.5', '5 a 6'],
      ['3', '7.25', '7', '6 a 8'],
      ['4', '8.83', '8.67', '8 a 10'],
    ])
  })

  it('pone en espejo Estásis y Disonancia antes y después', () => {
    montar(CARTAS_DS_ANTES, CARTAS_DS_ANTES) // la Disonancia de antes (suma media 9 → 8.1)
    const espejo = filas(/espejo/i)
    expect(espejo.find((f) => f[0] === 'Suma media')).toEqual(['Suma media', '8.6', '8.5', '9', '8.1'])
    expect(espejo.find((f) => f[0] === 'Cartas')).toEqual(['Cartas', '33', '33', '33', '33'])
  })

  it('con filtro solo muestra los ajustes visibles pero simula con todo el pool', () => {
    montar(CARTAS_DS_ANTES.filter((c) => c.mazo === 'disonancia'), CARTAS_DS_ANTES)
    const tabla = filas(/ajustes propuestos/i)
    expect(tabla.map((f) => f[0].split(',')[0])).toEqual(['Kael', 'Draven', 'Marek', 'Emisario del Nudo'])
    expect(screen.queryByRole('list', { name: 'Avisos del ajuste' })).not.toBeInTheDocument()
    expect(screen.getByText(/sin avisos/i)).toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío', () => {
    montar([])
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })
})
