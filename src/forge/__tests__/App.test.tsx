import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'

describe('ForgeApp', () => {
  it('tiene un botón para volver a la landing inicial', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    const inicio = screen.getByRole('link', { name: '← Inicio' })
    expect(inicio).toHaveAttribute('href', '/')
  })
})
