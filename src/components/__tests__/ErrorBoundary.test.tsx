import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

const Bomb = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('BOOM!')
  }
  return <div>Todo bien</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Todo bien</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })

  it('renders fallback on error', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('BOOM!')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()

    spy.mockRestore()
  })
})
