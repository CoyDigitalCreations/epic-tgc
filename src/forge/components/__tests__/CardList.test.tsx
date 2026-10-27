import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardList } from '../CardList'
import { useCardStore } from '../../store/useCardStore'
import { exportCollectionSinArte, exportCollectionToJson } from '../../utils/export-json'

vi.mock('../../utils/export-json', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../utils/export-json')>()),
  exportCollectionToJson: vi.fn().mockResolvedValue(undefined),
  exportCollectionSinArte: vi.fn(),
}))

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
      } as import('../../../shared/types').CampeonCard],
    })
    render(<CardList />)
    expect(screen.getByText(/Exportar colección/)).toBeInTheDocument()
    expect(screen.getByText(/Exportar cartas/)).toBeInTheDocument()
    expect(screen.getByText(/Importar cartas/)).toBeInTheDocument()
  })

  it('los botones de la fuente de verdad exportan con los nombres FuenteEfectos y FuenteArte', () => {
    const carta = {
      id: 'card-1',
      name: 'Test',
      type: 'Campeón',
      rarity: 'Común',
      keywords: [],
      flavorText: '',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      stats: { cost: 0, poder: 0, resistencia: 0 },
    } as import('../../../shared/types').CampeonCard
    useCardStore.setState({ cards: [carta] })
    render(<CardList />)

    fireEvent.click(screen.getByText(/Exportar FuenteEfectos\.json/))
    expect(exportCollectionSinArte).toHaveBeenCalledWith([carta], 'FuenteEfectos')

    fireEvent.click(screen.getByText(/Exportar FuenteArte\.json/))
    expect(exportCollectionToJson).toHaveBeenCalledWith([carta], 'FuenteArte')
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

describe('CardList — layout compacto', () => {
  const carta = {
    id: 'card-1', name: 'Test', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '',
    createdAt: '2024-01-01', updatedAt: '2024-01-01', stats: { cost: 0, poder: 0, resistencia: 0 },
  } as import('../../../shared/types').CampeonCard
  const rejilla = () => document.querySelector('[style*="grid-template-columns"]') as HTMLElement

  beforeEach(() => {
    try { localStorage.removeItem('forge:coleccion-densidad') } catch { /* sin almacenamiento */ }
  })

  it('las acciones de importar/exportar viven en el menú «Archivo»', () => {
    useCardStore.setState({ cards: [carta] })
    render(<CardList />)
    const menu = screen.getByText(/Archivo/).closest('details') as HTMLDetailsElement
    expect(menu).toContainElement(screen.getByText(/Importar cartas/))
    expect(menu).toContainElement(screen.getByText(/Exportar FuenteEfectos/))
    expect(menu).toContainElement(screen.getByText(/Limpiar colección/))
  })

  it('al usar una opción del menú, el menú se cierra', () => {
    useCardStore.setState({ cards: [carta] })
    render(<CardList />)
    const menu = screen.getByText(/Archivo/).closest('details') as HTMLDetailsElement
    menu.open = true
    fireEvent.click(screen.getByText(/Exportar cartas \(sin arte\)/))
    expect(menu.open).toBe(false)
  })

  it('«Más filtros» muestra cuántos filtros hay activos', () => {
    render(<CardList />)
    expect(screen.getByText(/Más filtros y paquetes/)).not.toHaveTextContent('activo')
    fireEvent.click(screen.getByRole('button', { name: '3' })) // filtro de coste 3
    expect(screen.getByText(/Más filtros y paquetes/)).toHaveTextContent('1 activo')
  })

  it('la densidad cambia el ancho mínimo de las miniaturas y se recuerda', () => {
    useCardStore.setState({ cards: [carta] })
    const { unmount } = render(<CardList />)
    expect(rejilla().style.gridTemplateColumns).toContain('minmax(96px')
    fireEvent.click(screen.getByRole('button', { name: 'Miniaturas pequeñas' }))
    expect(rejilla().style.gridTemplateColumns).toContain('minmax(72px')
    fireEvent.click(screen.getByRole('button', { name: 'Miniaturas grandes' }))
    expect(rejilla().style.gridTemplateColumns).toContain('minmax(132px')
    unmount()
    render(<CardList />) // se recuerda entre montajes
    expect(rejilla().style.gridTemplateColumns).toContain('minmax(132px')
  })

  it('con onPlegar muestra el botón para plegar la colección', () => {
    const onPlegar = vi.fn()
    render(<CardList onPlegar={onPlegar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Plegar la colección' }))
    expect(onPlegar).toHaveBeenCalledTimes(1)
  })

  it('sin onPlegar no hay botón de plegar', () => {
    render(<CardList />)
    expect(screen.queryByRole('button', { name: 'Plegar la colección' })).toBeNull()
  })

  it('editar y eliminar una carta siguen disponibles (botones con etiqueta accesible)', () => {
    useCardStore.setState({ cards: [carta] })
    render(<CardList />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar Test' }))
    expect(useCardStore.getState().selectedCardId).toBe('card-1')
    expect(screen.getByRole('button', { name: 'Eliminar Test' })).toBeInTheDocument()
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
