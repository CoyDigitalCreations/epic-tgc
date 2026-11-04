import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SinCartas } from './SinCartas'

describe('SinCartas', () => {
  it('avisa con un estado accesible que no hay cartas con los filtros', () => {
    render(<SinCartas />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
  })

  it('acepta un mensaje propio', () => {
    render(<SinCartas mensaje="Sin Campeones con estos filtros" />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin Campeones con estos filtros')
  })
})
