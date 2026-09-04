import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
          tipoEfecto: 'Activo',
          efectoActivo: 'Aliento de éter',
        } as import('../../../shared/types').CampeonCard,
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
        } as import('../../../shared/types').TacticaCard,
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
        efectoPasivo: '',
      } as import('../../../shared/types').CampeonCard],
    })
    render(<CardList />)
    expect(screen.getByText(/Exportar colección/)).toBeInTheDocument()
    expect(screen.getByText(/Exportar cartas/)).toBeInTheDocument()
    expect(screen.getByText(/Importar cartas/)).toBeInTheDocument()
  })

  it('importa el paquete Disonancia (DS-031, DS-032, DS-033) a la colección', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<CardList />)
    // Los botones "Agregar a mi colección" de paquetes van en el orden de PAQUETES: [estasis, disonancia]
    const botonesImportar = screen.getAllByText(/Agregar a mi colección/)
    fireEvent.click(botonesImportar[1])
    const ids = useCardStore.getState().cards.map((c) => c.id)
    expect(ids).toContain('DS-031')
    expect(ids).toContain('DS-032')
    expect(ids).toContain('DS-033')
  })
})

describe('CardList — paquetes personalizados', () => {
  const paqueteMutantes = {
    id: 'mutantes',
    nombre: 'Mutantes',
    tipo: 'Mazo Temático',
    color: '#6b7280',
    facciones: [],
    entrega: 'Personalizado',
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore: '',
  } as import('../../../shared/types').Paquete

  const cartaMutante = (id: string, paqueteId = 'mutantes') =>
    ({
      id,
      name: `Mutante ${id}`,
      type: 'Campeón',
      rarity: 'Común',
      keywords: [],
      flavorText: '',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      stats: { cost: 2, poder: 4, resistencia: 3 },
      paqueteId,
    }) as import('../../../shared/types').CampeonCard

  beforeEach(() => {
    useCardStore.setState({ userPacks: [] })
  })

  it('muestra la pill dinámica con runa, nombre y badge "N cartas"', () => {
    useCardStore.setState({
      userPacks: [paqueteMutantes],
      cards: [
        { ...cartaMutante('m-1'), limiteCopias: '3' },
        cartaMutante('m-2'),
        cartaMutante('o-1', 'estasis'),
      ],
    })
    render(<CardList />)
    expect(screen.getByText('Mutantes')).toBeInTheDocument()
    // 3 + 1 = 4 copias del paquete mutantes en la colección
    expect(screen.getByText('4 cartas')).toBeInTheDocument()
  })

  it('la pill dinámica tiene botón Exportar', () => {
    useCardStore.setState({ userPacks: [paqueteMutantes] })
    render(<CardList />)
    expect(screen.getByText(/Exportar/)).toBeInTheDocument()
  })

  it('el header de paquetes tiene "Crear paquete" e "Importar paquete (JSON)"', () => {
    render(<CardList />)
    expect(screen.getByText(/Crear paquete/)).toBeInTheDocument()
    expect(screen.getByText(/Importar paquete/)).toBeInTheDocument()
  })

  it('eliminar paquete lo quita y desasigna sus cartas (confirm)', () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    useCardStore.setState({
      userPacks: [paqueteMutantes],
      cards: [cartaMutante('m-1')],
    })
    render(<CardList />)
    fireEvent.click(screen.getByTitle(/Quitar paquete/))
    expect(useCardStore.getState().userPacks).toHaveLength(0)
    expect(useCardStore.getState().cards[0].paqueteId).toBeUndefined()
  })

  it('la pill estática conserva el badge de progreso y el botón Importar', () => {
    useCardStore.setState({
      userPacks: [paqueteMutantes],
      cards: [cartaMutante('m-1', 'estasis')],
    })
    render(<CardList />)
    // Progreso de Estásis: 1 copia / 66 total
    expect(screen.getByText(/1\/66/)).toBeInTheDocument()
    // Los dos paquetes estáticos mantienen su botón "Agregar a mi colección"
    expect(screen.getAllByText(/Agregar a mi colección/)).toHaveLength(2)
  })
})
