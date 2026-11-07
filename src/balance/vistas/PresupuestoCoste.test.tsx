import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ALTO_PRUEBA, ANCHO_PRUEBA, instalarEntornoGraficas } from '../test/entornoGraficas'
import { CARTAS } from '../test/cartasReales'
import { PresupuestoCoste } from './PresupuestoCoste'

describe('PresupuestoCoste', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  const montar = (cartas = CARTAS) => render(<PresupuestoCoste cartas={cartas} ancho={ANCHO_PRUEBA} alto={ALTO_PRUEBA} />)
  const tabla = () => screen.getByRole('table', { name: /suma de ATQ y RES/i })
  const filas = () =>
    within(tabla())
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))

  it('por coste compara la suma media con la banda', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Presupuesto de stats' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /suma de atq y res/i })).toBeInTheDocument()
    expect(within(tabla()).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Grupo',
      'Campeones',
      'Suma media',
      'Banda mínima',
      'Banda máxima',
    ])
    expect(filas()).toEqual([
      // Rediseño de Disonancia (Lote 2): Kael 4/2, Draven 3/3 (coste 2) y Marek 4/3, Korr 4/4 (coste 3).
      // Emisario (DS-031) pasó a coste 3 y 4/3 (suma 7, dentro de la banda 6-8): sale del 2 y entra al 3.
      ['Coste 2', '3', '6', '5', '6'],
      ['Coste 3', '9', '7', '6', '8'],
      ['Coste 4', '6', '8.83', '8', '10'],
    ])
  })

  it('agrupa por mazo', async () => {
    montar()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /agrupar por/i }), 'mazo')
    expect(filas()).toEqual([
      ['Disonancia', '10', '8.4', '—', '—'],
      ['Estásis', '10', '8.6', '—', '—'],
    ])
  })

  it('agrupa por rareza', async () => {
    montar()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /agrupar por/i }), 'rareza')
    expect(filas().find((f) => f[0] === 'Única')).toEqual(['Única', '2', '18', '—', '—'])
  })

  it('sin Campeones muestra el estado vacío', () => {
    montar(CARTAS.filter((c) => c.tipo !== 'Campeón'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
