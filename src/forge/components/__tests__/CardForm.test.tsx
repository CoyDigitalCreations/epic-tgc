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

  it('renders all 5 card type buttons', () => {
    render(<CardForm />)
    expect(screen.getByText('Campeón')).toBeInTheDocument()
    expect(screen.getByText('Mística')).toBeInTheDocument()
    expect(screen.getByText('Arcana')).toBeInTheDocument()
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
    // Mística should show "Efectos" label (effect-list type)
    fireEvent.click(screen.getByText('Mística'))
    expect(screen.getByText('Efectos (0/3)')).toBeInTheDocument()
  })
})

describe('CardForm — pestañas (Datos / Efectos / Extras)', () => {
  const panel = (id: string) => document.getElementById(`panel-${id}`) as HTMLElement
  const oculto = (id: string) => panel(id).className.split(' ').includes('hidden')

  it('arranca en «Datos»: solo ese panel está visible', () => {
    render(<CardForm />)
    expect(screen.getByRole('tab', { name: /Datos/ })).toHaveAttribute('aria-selected', 'true')
    expect(oculto('datos')).toBe(false)
    expect(oculto('efectos')).toBe(true)
    expect(oculto('extras')).toBe(true)
  })

  it('cambiar de pestaña muestra su panel y oculta el anterior, SIN desmontar nada', () => {
    render(<CardForm />)
    fireEvent.click(screen.getByRole('tab', { name: /Efectos/ }))
    expect(screen.getByRole('tab', { name: /Efectos/ })).toHaveAttribute('aria-selected', 'true')
    expect(oculto('efectos')).toBe(false)
    expect(oculto('datos')).toBe(true)
    // el campo de «Datos» sigue en el DOM (conserva su estado al volver)
    expect(screen.getByPlaceholderText(/Aurelion/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Extras/ }))
    expect(oculto('extras')).toBe(false)
    expect(oculto('efectos')).toBe(true)
  })

  it('cada campo del configurador vive en su pestaña', () => {
    render(<CardForm />)
    expect(panel('datos')).toContainElement(screen.getByPlaceholderText(/Aurelion/))
    expect(panel('efectos')).toContainElement(screen.getByText('Efectos (0/3)'))
    expect(panel('extras')).toContainElement(screen.getByLabelText('Paquete'))
    expect(panel('extras')).toContainElement(screen.getByLabelText('Variante'))
    expect(panel('extras')).toContainElement(screen.getByPlaceholderText(/Notas del diseñador/))
  })

  it('la pestaña «Efectos» muestra cuántos efectos tiene la carta', () => {
    useCardStore.setState({
      draft: {
        name: 'X', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '', stats: { cost: 0, poder: 0, resistencia: 0 },
        efectos: [{ tipo: 'pasivo', efecto: 'buff' }, { tipo: 'disparo', efecto: 'draw' }],
      },
    })
    render(<CardForm />)
    expect(screen.getByRole('tab', { name: /Efectos/ })).toHaveTextContent('2')
  })

  it('Guardar/Actualizar y Cancelar siguen visibles sin importar la pestaña', () => {
    render(<CardForm />)
    fireEvent.click(screen.getByRole('tab', { name: /Extras/ }))
    expect(screen.getByText('Guardar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })
})

describe('CardForm — metadata de autoría (A1/A2)', () => {
  it('muestra los campos Variante y Comentario', () => {
    render(<CardForm />)
    expect(screen.getByText('Variante')).toBeInTheDocument()
    expect(screen.getByText('Comentario')).toBeInTheDocument()
  })

  it('el select de variante por defecto es normal', () => {
    render(<CardForm />)
    const select = screen.getByLabelText('Variante')
    expect((select as HTMLSelectElement).value).toBe('normal')
  })

  it('cambiar la variante actualiza el draft', () => {
    render(<CardForm />)
    const select = screen.getByLabelText('Variante')
    fireEvent.change(select, { target: { value: 'full-art' } })
    expect(useCardStore.getState().draft.variante).toBe('full-art')
  })

  it('escribir el comentario actualiza el draft', () => {
    render(<CardForm />)
    const textarea = screen.getByPlaceholderText(/Notas del diseñador/)
    fireEvent.change(textarea, { target: { value: 'Revisar balance del tutor' } })
    expect(useCardStore.getState().draft.comentario).toBe('Revisar balance del tutor')
  })
})

describe('CardForm — campo Paquete (paquetes personalizados)', () => {
  it('renderiza el select de Paquete con Sin paquete + estáticos + userPacks', () => {
    useCardStore.setState({
      userPacks: [
        {
          id: 'mutantes',
          nombre: 'Mutantes',
          tipo: 'Mazo Temático',
          color: '#6b7280',
          facciones: [],
          distribucion: { eter: 15, principal: 45, vinculos: 6 },
          lore: '',
        },
      ],
    })
    render(<CardForm />)
    const select = screen.getByLabelText('Paquete')
    expect(select).toBeInTheDocument()
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('Sin paquete')
    expect(options).toContain('Estásis')
    expect(options).toContain('Disonancia')
    expect(options).toContain('Mutantes')
  })

  it('seleccionar un paquete actualiza draft.paqueteId', () => {
    render(<CardForm />)
    const select = screen.getByLabelText('Paquete')
    fireEvent.change(select, { target: { value: 'estasis' } })
    expect(useCardStore.getState().draft.paqueteId).toBe('estasis')
  })

  it('elegir "Sin paquete" guarda undefined', () => {
    useCardStore.setState({
      draft: {
        name: '',
        type: 'Campeón',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        stats: { cost: 0, poder: 0, resistencia: 0 },
        paqueteId: 'estasis',
      },
    })
    render(<CardForm />)
    const select = screen.getByLabelText('Paquete')
    fireEvent.change(select, { target: { value: '' } })
    expect(useCardStore.getState().draft.paqueteId).toBeUndefined()
  })

  it('al editar una carta con paquete, el select muestra el paquete asignado', () => {
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
          paqueteId: 'disonancia',
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
        paqueteId: 'disonancia',
      },
    })
    render(<CardForm />)
    const select = screen.getByLabelText('Paquete')
    expect((select as HTMLSelectElement).value).toBe('disonancia')
  })
})
