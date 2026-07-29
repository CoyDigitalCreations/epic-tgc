import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardList } from '../CardList'
import { useCardStore } from '../../store/useCardStore'

beforeEach(() => {
  useCardStore.setState({
    cards: [],
    draft: {},
    selectedCardId: null,
  })
})

describe('CardList', () => {
  it('shows empty state when collection is empty', () => {
    render(<CardList />)
    expect(screen.getByText('No hay cartas todavía')).toBeInTheDocument()
  })

  it('renders cards from the collection', () => {
    useCardStore.setState({
      cards: [
        {
          id: 'card-1',
          name: 'Dragon de Éter',
          type: 'Campeón',
          rarity: 'Legendaria',
          keywords: ['Carga'],
          flavorText: '',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          stats: { cost: 8, poder: 3500, resistencia: 2500 },
          habilidad: 'Aliento de éter',
        } as import('../../types').CampeonCard,
        {
          id: 'card-2',
          name: 'Escudo Sagrado',
          type: 'Táctica',
          rarity: 'Rara',
          keywords: [],
          flavorText: '',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          stats: { cost: 2, duracion: 3 },
          descripcion: 'Protege por 3 turnos',
        } as import('../../types').TacticaCard,
      ],
    })
    render(<CardList />)
    // Name appears twice (mini preview + card name), so use getAllByText
    expect(screen.getAllByText('Dragon de Éter')).toHaveLength(2)
    expect(screen.getAllByText('Escudo Sagrado')).toHaveLength(2)
    expect(screen.getByText('Colección (2)')).toBeInTheDocument()
  })

  it('shows export/import buttons when collection has cards', () => {
    useCardStore.setState({
      cards: [{
        id: 'card-1',
        name: 'Test',
        type: 'Campeón',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        stats: { cost: 0, poder: 0, resistencia: 0 },
        habilidad: '',
      } as import('../../types').CampeonCard],
    })
    render(<CardList />)
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument()
    expect(screen.getByText('Importar JSON')).toBeInTheDocument()
  })
})
