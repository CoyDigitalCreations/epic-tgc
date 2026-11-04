import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TablaAlternativa } from './TablaAlternativa'
import { Semaforo } from './Semaforo'

describe('TablaAlternativa', () => {
  const columnas = ['Mazo', 'Cartas']
  const filas = [
    ['Estásis', '10'],
    ['Disonancia', '12'],
  ]

  it('expone una tabla con caption, encabezados con scope y celdas', () => {
    render(<TablaAlternativa caption="Cartas por mazo" columnas={columnas} filas={filas} />)
    const tabla = screen.getByRole('table', { name: 'Cartas por mazo' })
    const encabezados = within(tabla).getAllByRole('columnheader')
    expect(encabezados.map((h) => h.textContent)).toEqual(columnas)
    for (const h of encabezados) expect(h).toHaveAttribute('scope', 'col')
    expect(within(tabla).getByRole('cell', { name: '12' })).toBeInTheDocument()
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
  })

  it('el caption existe siempre, aun oculto visualmente', () => {
    render(<TablaAlternativa caption="Oculta" columnas={columnas} filas={filas} visible={false} />)
    const tabla = screen.getByRole('table', { name: 'Oculta' })
    expect(tabla.querySelector('caption')).not.toBeNull()
    expect(tabla.parentElement?.className).toContain('sr-only')
  })

  it('es visible por defecto (sin sr-only)', () => {
    render(<TablaAlternativa caption="Visible" columnas={columnas} filas={filas} />)
    expect(screen.getByRole('table', { name: 'Visible' }).parentElement?.className).not.toContain('sr-only')
  })

  it('con cero filas muestra un aviso dentro de la tabla', () => {
    render(<TablaAlternativa caption="Vacía" columnas={columnas} filas={[]} />)
    expect(within(screen.getByRole('table', { name: 'Vacía' })).getByText('Sin datos para mostrar')).toBeInTheDocument()
  })
})

describe('Semaforo', () => {
  it.each([
    ['verde', 'Verde'],
    ['amarillo', 'Amarillo'],
    ['rojo', 'Rojo'],
  ] as const)('%s muestra el texto %s y aria-label', (valor, texto) => {
    render(<Semaforo valor={valor} />)
    expect(screen.getByLabelText(`Semáforo: ${texto}`)).toHaveTextContent(texto)
  })

  it('el color no es lo único: el texto es visible', () => {
    render(<Semaforo valor="rojo" />)
    expect(screen.getByText('Rojo')).toBeVisible()
  })
})
