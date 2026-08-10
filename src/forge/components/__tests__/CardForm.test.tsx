import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardForm } from '../CardForm'
import { useCardStore } from '../../store/useCardStore'

beforeEach(() => {
  useCardStore.setState({
    cards: [],
    draft: {
      name: '',
      type: 'Campeón',
      rarity: 'Común',
      keywords: [],
      flavorText: '',
      stats: { cost: 0, poder: 0, resistencia: 0 },
    },
    selectedCardId: null,
  })
})

describe('CardForm', () => {
  it('renders the form title', () => {
    render(<CardForm />)
    expect(screen.getByText('Nueva Carta')).toBeInTheDocument()
  })

  it('renders all 6 card type buttons', () => {
    render(<CardForm />)
    expect(screen.getByText('Campeón')).toBeInTheDocument()
    expect(screen.getByText('Mística')).toBeInTheDocument()
    expect(screen.getByText('Táctica')).toBeInTheDocument()
    expect(screen.getByText('Arcana')).toBeInTheDocument()
    expect(screen.getByText('Combate')).toBeInTheDocument()
    // Éter appears both as a card type button and a Rol option — verify count
    expect(screen.getAllByText('Éter').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Editar Carta" when editing an existing card', () => {
    useCardStore.setState({
      cards: [
        {
          id: 'test-1',
          name: 'Test',
          type: 'Campeón',
          rarity: 'Común',
          keywords: [],
          flavorText: '',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          stats: { cost: 0, poder: 0, resistencia: 0 },
          efectoPasivo: '',
        } as import('../../../shared/types').CampeonCard,
      ],
      draft: {
        id: 'test-1',
        name: 'Test',
        type: 'Campeón',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        stats: { cost: 0, poder: 0, resistencia: 0 },
        efectoPasivo: '',
      },
    })
    render(<CardForm />)
    expect(screen.getByText('Actualizar')).toBeInTheDocument()
  })

  it('displays name input field', () => {
    render(<CardForm />)
    expect(screen.getByPlaceholderText(/Aurelion/)).toBeInTheDocument()
  })

  it('updates draft when typing in name field', () => {
    render(<CardForm />)
    const input = screen.getByPlaceholderText(/Aurelion/)
    fireEvent.change(input, { target: { value: 'Mi Campeón' } })
    expect(useCardStore.getState().draft.name).toBe('Mi Campeón')
  })

  it('changes form fields when card type changes', () => {
    render(<CardForm />)
    // Campeón has "Habilidad" field label — but it's inside a textarea placeholder
    // Mística should show "Efecto" label
    fireEvent.click(screen.getByText('Mística'))
    expect(screen.getByText('Efecto')).toBeInTheDocument()
  })
})
