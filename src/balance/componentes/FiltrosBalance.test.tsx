import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { FiltrosBalance } from './FiltrosBalance'

function Ubicacion() {
  return <output data-testid="url">{useLocation().search}</output>
}

function montar(entrada = '/balance') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <FiltrosBalance />
      <Ubicacion />
    </MemoryRouter>,
  )
}

describe('FiltrosBalance', () => {
  it('ofrece los cuatro filtros con label accesible', () => {
    montar()
    expect(screen.getByLabelText('Mazo')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByLabelText('Coste')).toBeInTheDocument()
    expect(screen.getByLabelText('Rareza')).toBeInTheDocument()
  })

  it('refleja los filtros que vienen en la URL', () => {
    montar('/balance?mazo=estasis&tipo=Campe%C3%B3n&coste=3&rareza=Rara')
    expect(screen.getByLabelText('Mazo')).toHaveValue('estasis')
    expect(screen.getByLabelText('Tipo')).toHaveValue('Campeón')
    expect(screen.getByLabelText('Coste')).toHaveValue('3')
    expect(screen.getByLabelText('Rareza')).toHaveValue('Rara')
  })

  it('al elegir un mazo actualiza la URL, y "Todos" la limpia', async () => {
    const u = userEvent.setup()
    montar()
    await u.selectOptions(screen.getByLabelText('Mazo'), 'disonancia')
    expect(screen.getByTestId('url')).toHaveTextContent('mazo=disonancia')
    await u.selectOptions(screen.getByLabelText('Mazo'), '')
    expect(screen.getByTestId('url')).not.toHaveTextContent('mazo=')
  })

  it('"Limpiar filtros" borra todos', async () => {
    const u = userEvent.setup()
    montar('/balance?mazo=estasis&coste=2')
    await u.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByTestId('url')).toHaveTextContent(/^$/)
  })
})
