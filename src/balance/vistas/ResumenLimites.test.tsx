import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { LimiteCarta } from '../limitesCarta'
import { fraseDeLimites, ResumenLimites } from './ResumenLimites'

const fila = (p: Partial<LimiteCarta> & Pick<LimiteCarta, 'id' | 'etiqueta' | 'estado'>): LimiteCarta => ({ usado: 1, limite: 5, detalle: 'detalle', ...p })

describe('fraseDeLimites', () => {
  it('dice cuáles rebasa, en minúsculas y por su nombre', () => {
    const f = fraseDeLimites([
      fila({ id: 'atq', etiqueta: 'Tope de ATQ', estado: 'excede' }),
      fila({ id: 'tabu', etiqueta: 'Presupuesto de tabú', estado: 'excede' }),
      fila({ id: 'res', etiqueta: 'Tope de RES', estado: 'dentro' }),
    ])
    expect(f).toBe('Rebasa 2 límites: tope de atq, presupuesto de tabú.')
  })

  it('usa el singular con un solo rebase', () => {
    expect(fraseDeLimites([fila({ id: 'atq', etiqueta: 'Tope de ATQ', estado: 'excede' })])).toBe('Rebasa 1 límite: tope de atq.')
  })

  it('sin rebases lo dice, y avisa de lo que usa casi por completo', () => {
    expect(fraseDeLimites([fila({ id: 'atq', etiqueta: 'Tope de ATQ', estado: 'dentro' })])).toBe('No rebasa ningún límite.')
    expect(fraseDeLimites([fila({ id: 'suma', etiqueta: 'Presupuesto de stats', estado: 'limite' })])).toBe(
      'No rebasa ningún límite, pero usa casi por completo 1 presupuesto: presupuesto de stats.',
    )
  })

  it('una carta regalada (bajo el mínimo) no se dice «No rebasa»: se explica', () => {
    const f = fraseDeLimites([fila({ id: 'suma-minima', etiqueta: 'Suma mínima', estado: 'bajo' })])
    expect(f).toMatch(/por debajo del mínimo/)
    expect(f).not.toMatch(/No rebasa/)
  })
})

describe('ResumenLimites', () => {
  const limites: LimiteCarta[] = [
    fila({ id: 'atq', etiqueta: 'Tope de ATQ', usado: 9, limite: 4, estado: 'excede', detalle: 'ATQ máximo para coste 2.' }),
    fila({ id: 'tabu', etiqueta: 'Presupuesto de tabú', usado: 0, limite: null, estado: 'sin-limite', detalle: 'Coste 0.' }),
  ]

  it('muestra una fila por límite con lo que usa, su máximo y el estado escrito (nunca solo color)', () => {
    render(<ResumenLimites limites={limites} />)
    const tabla = screen.getByRole('table', { name: /presupuestos e índices/i })
    const atq = within(tabla).getByRole('row', { name: /Tope de ATQ/ })
    expect(within(atq).getByText('9')).toBeInTheDocument()
    expect(within(atq).getByText('4')).toBeInTheDocument()
    expect(within(atq).getByText('Rebasa')).toBeInTheDocument()
    const tabu = within(tabla).getByRole('row', { name: /Presupuesto de tabú/ })
    expect(within(tabu).getByText('—')).toBeInTheDocument() // sin máximo
    expect(within(tabu).getByText('No aplica')).toBeInTheDocument()
  })

  it('la frase se anuncia como estado y resalta cuando hay rebase', () => {
    render(<ResumenLimites limites={limites} />)
    const estado = screen.getByRole('status')
    expect(estado).toHaveTextContent('Rebasa 1 límite: tope de atq.')
    expect(estado.className).toMatch(/text-red-300/)
  })

  it('sin rebases la frase no se pinta en rojo', () => {
    render(<ResumenLimites limites={[fila({ id: 'atq', etiqueta: 'Tope de ATQ', estado: 'dentro' })]} />)
    expect(screen.getByRole('status').className).not.toMatch(/text-red-300/)
  })
})
