import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardPreview } from '../CardPreview'
import { useCardStore } from '../../store/useCardStore'

beforeEach(() => {
  useCardStore.setState({
    cards: [],
    draft: {
      type: 'Campeón',
    },
    selectedCardId: null,
  })
})

describe('CardPreview', () => {
  it('shows empty state when no card is selected', () => {
    // Set draft with no type so displayCard stays null
    useCardStore.setState({
      draft: {},
    })
    render(<CardPreview />)
    expect(screen.getByText('Seleccioná o creá una carta')).toBeInTheDocument()
  })

  it('renders a card from draft', () => {
    useCardStore.setState({
      draft: {
        name: 'Aurelion',
        type: 'Campeón',
        rarity: 'Legendaria',
        keywords: ['Carga'],
        flavorText: 'El portador del Éter.',
        stats: { cost: 5, poder: 2000, resistencia: 1500 },
        tipoEfecto: 'Activo',
        efectoActivo: 'Brilla como el sol',
      },
    })
    render(<CardPreview />)
    expect(screen.getByText('Aurelion')).toBeInTheDocument()
    expect(screen.getByText('Carga')).toBeInTheDocument()
  })

  it('renders a standalone card with export button', () => {
    const card = {
      id: 'test-1',
      name: 'Tormenta',
      type: 'Mística' as const,
      rarity: 'Rara' as const,
      keywords: [],
      flavorText: '',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      stats: { cost: 3 },
      efecto: 'Hace daño en área',
    }
    render(<CardPreview card={card} standalone />)
    expect(screen.getByText('Tormenta')).toBeInTheDocument()
    expect(screen.getByText('Exportar PNG')).toBeInTheDocument()
  })

  it('displays ATK and DEF for Campeón cards', () => {
    useCardStore.setState({
      draft: {
        name: 'Tanque',
        type: 'Campeón',
        rarity: 'Épica',
        keywords: [],
        flavorText: '',
        stats: { cost: 7, poder: 3000, resistencia: 4000 },
        tipoEfecto: 'Pasivo',
        efectoPasivo: 'Gana poder cada turno',
      },
    })
    render(<CardPreview />)
    // ATQ and RES labels should be visible
    expect(screen.getByText('ATQ')).toBeInTheDocument()
    expect(screen.getByText('RES')).toBeInTheDocument()
    // The values use specific styling, check they render
    expect(screen.getByText('3000')).toBeInTheDocument()
    expect(screen.getByText('4000')).toBeInTheDocument()
  })

  it('shows cost gem with correct value for Campeón', () => {
    useCardStore.setState({
      draft: {
        name: 'Cara',
        type: 'Campeón',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        stats: { cost: 9, poder: 1500, resistencia: 1000 },
      },
    })
    render(<CardPreview />)
    // The cost is rendered in a gem hexagon
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('shows facción medallones stacked for multi-facción Campeón', () => {
    useCardStore.setState({
      draft: {
        name: 'Bifronte',
        type: 'Campeón',
        rarity: 'Épica',
        keywords: [],
        flavorText: '',
        stats: { cost: 6, poder: 2000, resistencia: 1800 },
        facciones: ['Orden', 'Caos'],
      },
    })
    render(<CardPreview />)
    // One medallón (image) per facción, con su src oficial
    expect(screen.getByAltText('Orden')).toBeInTheDocument()
    expect(screen.getByAltText('Caos')).toBeInTheDocument()
    expect(screen.getByAltText('Orden').getAttribute('src')).toBe('/facciones_white.png')
    expect(screen.getByAltText('Caos').getAttribute('src')).toBe('/facciones_blue.png')
    // La runa de la cosmología va superpuesta encima de cada medallón
    expect(screen.getByTestId('rune-Orden')).toBeInTheDocument()
    expect(screen.getByTestId('rune-Caos')).toBeInTheDocument()
    const runeOrden = screen.getByTestId('rune-Orden')
    const medallonOrden = screen.getByAltText('Orden')
    // La runa va DESPUÉS del medallón en el DOM (superpuesta, zIndex 2)
    expect(
      medallonOrden.compareDocumentPosition(runeOrden) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it.skip('hides cost gem for Éter and Vínculo cards', () => {
    useCardStore.setState({
      draft: {
        name: 'SinCoste',
        type: 'Éter',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        stats: { cost: 9 },
        efectoReserva: 'No tiene coste visible',
      },
    })
    render(<CardPreview />)
    // Éter should NOT show the cost value
    expect(screen.queryByText('9')).not.toBeInTheDocument()
  })
})

describe('CardPreview — variante full-art (A2)', () => {
  const baseDraft = {
    name: 'Ultra',
    type: 'Campeón',
    rarity: 'Épica',
    keywords: [],
    flavorText: '',
    stats: { cost: 4, poder: 2000, resistencia: 1500 },
  }

  it('no dibuja el marco rúnico (CardFrame) en full-art', () => {
    useCardStore.setState({
      draft: { ...baseDraft, variante: 'full-art' },
    })
    const { container } = render(<CardPreview />)
    // CardFrame genera polygons rúnicos; en full-art no debe haber ninguno
    expect(container.querySelectorAll('polygon')).toHaveLength(0)
  })

  it('dibuja el marco rúnico en variante normal', () => {
    useCardStore.setState({
      draft: { ...baseDraft, variante: 'normal' },
    })
    const { container } = render(<CardPreview />)
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0)
  })

  it('variante ausente se comporta como normal', () => {
    useCardStore.setState({ draft: baseDraft })
    const { container } = render(<CardPreview />)
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0)
  })
})
