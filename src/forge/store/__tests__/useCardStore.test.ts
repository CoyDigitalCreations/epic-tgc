import { describe, it, expect, beforeEach } from 'vitest'
import { useCardStore } from '../useCardStore'
import type { CampeonCard, AnyCard } from '../../../shared/types'
import { FACCION_COLORS } from '../../../shared/types'

const STORAGE_KEY = 'epic-tgc-collection'

const campeon = (id: string, imageUrl?: string, overrides: Partial<CampeonCard> = {}): CampeonCard =>
  ({
    id,
    name: 'Test',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    stats: { cost: 0, poder: 0, resistencia: 0 },
    imageUrl,
    ...overrides,
  }) as CampeonCard

const estadoConCards = (cards: AnyCard[]) => ({
  colecciones: [{ id: 'default', nombre: 'Mi colección', cards }],
  coleccionActivaId: 'default',
  cards,
})

beforeEach(() => {
  localStorage.clear()
  useCardStore.setState({
    colecciones: [{ id: 'default', nombre: 'Mi colección', cards: [] }],
    coleccionActivaId: 'default',
    cards: [],
    draft: {},
    selectedCardId: null,
    userPacks: [],
  })
})

describe('useCardStore', () => {
  describe('initDraft', () => {
    it('creates a new draft with the given type', () => {
      useCardStore.getState().initDraft('Mística')
      const draft = useCardStore.getState().draft
      expect(draft.type).toBe('Mística')
      expect(draft.id).toBeDefined()
      expect(draft.name).toBe('')
    })
  })

  describe('addCard', () => {
    it('adds a card to the collection', () => {
      const card = campeon('test-1', undefined, { name: 'Test Card' })
      useCardStore.getState().addCard(card)
      expect(useCardStore.getState().cards).toHaveLength(1)
      expect(useCardStore.getState().cards[0].id).toBe('test-1')
    })
  })

  describe('updateCard', () => {
    it('updates an existing card', () => {
      useCardStore.getState().addCard(campeon('test-1'))
      useCardStore.getState().updateCard('test-1', campeon('test-1', undefined, { name: 'Updated Name' }))
      expect(useCardStore.getState().cards[0].name).toBe('Updated Name')
    })
  })

  describe('deleteCard', () => {
    it('removes a card from the collection', () => {
      useCardStore.getState().addCard(campeon('test-1'))
      useCardStore.getState().deleteCard('test-1')
      expect(useCardStore.getState().cards).toHaveLength(0)
    })

    it('clears selectedCardId if deleted card was selected', () => {
      useCardStore.getState().addCard(campeon('test-1'))
      useCardStore.getState().setSelectedCardId('test-1')
      useCardStore.getState().deleteCard('test-1')
      expect(useCardStore.getState().selectedCardId).toBeNull()
    })
  })

  describe('getCard', () => {
    it('finds a card by id', () => {
      useCardStore.getState().addCard(campeon('test-1', undefined, { name: 'Test Card' }))
      const found = useCardStore.getState().getCard('test-1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Card')
    })

    it('returns undefined for non-existent id', () => {
      const found = useCardStore.getState().getCard('no-existe')
      expect(found).toBeUndefined()
    })
  })

  describe('resetDraft', () => {
    it('resets draft to initial state', () => {
      useCardStore.getState().updateDraft('name', 'Custom Name')
      useCardStore.getState().resetDraft()
      expect(useCardStore.getState().draft.name).toBe('')
      expect(useCardStore.getState().draft.type).toBe('Campeón')
    })
  })

  describe('loadCards', () => {
    it('merges by id (new replaces old, others preserved)', () => {
      useCardStore.getState().addCard(campeon('orig-1', undefined, { name: 'Old Card' }))
      const newCards = [
        campeon('orig-1', undefined, { name: 'Updated Card' }),
        campeon('new-1', undefined, { name: 'New Card' }),
      ]
      useCardStore.getState().loadCards(newCards)
      expect(useCardStore.getState().cards).toHaveLength(2)
      expect(useCardStore.getState().cards.find((c) => c.id === 'orig-1')?.name).toBe('Updated Card')
      expect(useCardStore.getState().cards.find((c) => c.id === 'new-1')?.name).toBe('New Card')
    })
  })

  describe('setSelectedCardId', () => {
    it('sets the selected card id', () => {
      useCardStore.getState().setSelectedCardId('test-1')
      expect(useCardStore.getState().selectedCardId).toBe('test-1')
    })
  })
})

describe('useCardStore — imágenes', () => {
  it('persiste la card SIN el base64 (marca hasImage en su lugar)', async () => {
    useCardStore.getState().addCard(campeon('card-1', 'data:image/png;base64,AAA'))
    await Promise.resolve()
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toContain('base64')
    expect(stored).toContain('"hasImage":true')
    // En memoria la imagen sigue disponible para el editor
    expect(useCardStore.getState().cards[0].imageUrl).toBe('data:image/png;base64,AAA')
  })

  it('updateCard con imagen removida no deja hasImage ni imageUrl', () => {
    useCardStore.getState().addCard(campeon('card-1', 'data:image/png;base64,AAA'))
    useCardStore.getState().updateCard('card-1', campeon('card-1'))
    const card = useCardStore.getState().cards[0]
    expect(card.hasImage).toBeUndefined()
    expect(card.imageUrl).toBeUndefined()
  })

  it('updateCard CONSERVA la imagen si el editor no la tocó (hasImage heredado = true)', () => {
    useCardStore.setState(estadoConCards([{ ...campeon('card-1'), hasImage: true }]))
    // Editar sin tocar la imagen: el draft hereda hasImage:true (imageUrl ausente)
    useCardStore.getState().updateCard('card-1', { ...campeon('card-1'), hasImage: true })
    const card = useCardStore.getState().cards[0]
    expect(card.hasImage).toBe(true)
    expect(card.imageUrl).toBeUndefined()
  })

  it('updateCard quita el flag si el editor removió la imagen (hasImage = false)', () => {
    useCardStore.setState(estadoConCards([{ ...campeon('card-1'), hasImage: true }]))
    // El editor removió la imagen: ImageUpload setea hasImage:false
    useCardStore.getState().updateCard('card-1', { ...campeon('card-1'), hasImage: false })
    const card = useCardStore.getState().cards[0]
    expect(card.hasImage).toBe(false)
  })

  it('deleteCard remueve la card de la colección', () => {
    useCardStore.getState().addCard(campeon('card-1', 'data:image/png;base64,AAA'))
    useCardStore.getState().deleteCard('card-1')
    expect(useCardStore.getState().cards).toHaveLength(0)
  })
})

describe('useCardStore — colecciones múltiples (A3)', () => {
  it('persiste colecciones en el formato nuevo (no cards planas)', async () => {
    useCardStore.getState().addCard(campeon('card-1'))
    await Promise.resolve()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(2)
    expect(stored.state.colecciones).toBeDefined()
    expect(stored.state.colecciones[0].cards[0].id).toBe('card-1')
    expect(stored.state.coleccionActivaId).toBe('default')
    expect(stored.state.cards).toBeUndefined()
  })

  it('crearColeccion crea y activa una colección vacía', () => {
    useCardStore.getState().crearColeccion('Estásis')
    const { colecciones, coleccionActivaId } = useCardStore.getState()
    expect(colecciones).toHaveLength(2)
    expect(colecciones[1].nombre).toBe('Estásis')
    expect(coleccionActivaId).toBe(colecciones[1].id)
    expect(useCardStore.getState().cards).toHaveLength(0)
  })

  it('las cartas van a la colección activa y al cambiar no se filtran', () => {
    useCardStore.getState().crearColeccion('A')
    const idA = useCardStore.getState().coleccionActivaId
    useCardStore.getState().addCard(campeon('card-1'))
    expect(
      useCardStore.getState().colecciones.find((c) => c.id === idA)?.cards,
    ).toHaveLength(1)

    // Cambiar a la colección original: no debe ver la carta de A
    useCardStore.getState().setColeccionActiva('default')
    expect(useCardStore.getState().cards).toHaveLength(0)

    // Volver a A: la carta sigue ahí
    useCardStore.getState().setColeccionActiva(idA)
    expect(useCardStore.getState().cards).toHaveLength(1)
  })

  it('renombrarColeccion actualiza el nombre', () => {
    useCardStore.getState().renombrarColeccion('default', 'Mi set')
    expect(useCardStore.getState().colecciones[0].nombre).toBe('Mi set')
  })

  it('eliminarColeccion elimina y activa otra colección', () => {
    useCardStore.getState().crearColeccion('Temp')
    const tempId = useCardStore.getState().coleccionActivaId
    useCardStore.getState().addCard(campeon('card-x'))
    useCardStore.getState().eliminarColeccion(tempId)
    expect(useCardStore.getState().colecciones).toHaveLength(1)
    expect(useCardStore.getState().coleccionActivaId).toBe('default')
    expect(useCardStore.getState().cards).toHaveLength(0)
  })

  it('eliminarColeccion de la última crea una default nueva', () => {
    useCardStore.getState().eliminarColeccion('default')
    expect(useCardStore.getState().colecciones).toHaveLength(1)
    expect(useCardStore.getState().colecciones[0].nombre).toBe('Mi colección')
    expect(useCardStore.getState().cards).toHaveLength(0)
  })

  it('clearCards limpia solo la colección activa', () => {
    useCardStore.getState().crearColeccion('A')
    const idA = useCardStore.getState().coleccionActivaId
    useCardStore.getState().addCard(campeon('card-a'))
    useCardStore.getState().setColeccionActiva('default')
    useCardStore.getState().addCard(campeon('card-default'))
    useCardStore.getState().clearCards()
    expect(useCardStore.getState().cards).toHaveLength(0)
    expect(
      useCardStore.getState().colecciones.find((c) => c.id === idA)?.cards,
    ).toHaveLength(1)
  })

  it('setColeccionActiva con id inexistente no cambia nada', () => {
    useCardStore.getState().setColeccionActiva('no-existe')
    expect(useCardStore.getState().coleccionActivaId).toBe('default')
  })
})

describe('useCardStore — paquetes personalizados', () => {
  it('crearPaquete agrega a userPacks con id slugificado', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Los Mutantes' })
    const packs = useCardStore.getState().userPacks
    expect(packs).toHaveLength(1)
    expect(packs[0].id).toBe('los-mutantes')
    expect(packs[0].nombre).toBe('Los Mutantes')
  })

  it('slugify dedupe: mismo nombre dos veces → sufijo -2', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    expect(useCardStore.getState().userPacks.map((p) => p.id)).toEqual([
      'mutantes',
      'mutantes-2',
    ])
  })

  it('crearPaquete respeta un id explícito (round-trip de import)', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes', id: 'm2' })
    const p = useCardStore.getState().userPacks[0]
    expect(p.id).toBe('m2')
    expect(p.nombre).toBe('Mutantes')
  })

  it('el dedupe también aplica con id explícito', () => {
    useCardStore.getState().crearPaquete({ nombre: 'A', id: 'x' })
    useCardStore.getState().crearPaquete({ nombre: 'B', id: 'x' })
    expect(useCardStore.getState().userPacks.map((p) => p.id)).toEqual([
      'x',
      'x-2',
    ])
  })

  it('color derivado de la facción; sin facción → default gris', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Ordenados', facciones: ['Orden'] })
    useCardStore.getState().crearPaquete({ nombre: 'Neutros' })
    const [orden, neutro] = useCardStore.getState().userPacks
    expect(orden.color).toBe(FACCION_COLORS.Orden)
    expect(neutro.color).toBe('#6b7280')
  })

  it('valores por defecto: tipo Mazo Temático, distribucion 15/45/6, entrega Personalizado', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    const p = useCardStore.getState().userPacks[0]
    expect(p.tipo).toBe('Mazo Temático')
    expect(p.distribucion).toEqual({ eter: 15, principal: 45, vinculos: 6 })
    expect(p.entrega).toBe('Personalizado')
    expect(p.lore).toBe('')
  })

  it('renombrarPaquete cambia solo el nombre (id estable)', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    const id = useCardStore.getState().userPacks[0].id
    useCardStore.getState().renombrarPaquete(id, 'Mutantes II')
    const p = useCardStore.getState().userPacks[0]
    expect(p.id).toBe(id)
    expect(p.nombre).toBe('Mutantes II')
  })

  it('eliminarPaquete quita el paquete y desasigna las cartas en TODAS las colecciones', () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    const id = useCardStore.getState().userPacks[0].id
    useCardStore.getState().addCard(campeon('m-1', undefined, { paqueteId: id }))
    useCardStore.getState().crearColeccion('A')
    useCardStore.getState().addCard(campeon('m-2', undefined, { paqueteId: id }))
    useCardStore.getState().eliminarPaquete(id)
    expect(useCardStore.getState().userPacks).toHaveLength(0)
    const todas = useCardStore.getState().colecciones.flatMap((c) => c.cards)
    expect(todas).toHaveLength(2)
    expect(todas.every((c) => c.paqueteId === undefined)).toBe(true)
    // La vista cards de la colección activa sigue consistente
    expect(useCardStore.getState().cards).toHaveLength(1)
  })

  it('persiste userPacks en localStorage y la rehidratación lo recupera', async () => {
    useCardStore.getState().crearPaquete({ nombre: 'Mutantes' })
    await Promise.resolve()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(2)
    expect(stored.state.userPacks).toHaveLength(1)
    expect(stored.state.userPacks[0].id).toBe('mutantes')
  })

  it('migrate v1→v2: storage v1 sin userPacks → rehidrata con userPacks vacío', async () => {
    const v1 = {
      state: {
        colecciones: [{ id: 'default', nombre: 'Mi colección', cards: [] }],
        coleccionActivaId: 'default',
      },
      version: 1,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
    await useCardStore.persist.rehydrate()
    expect(useCardStore.getState().userPacks).toEqual([])
    expect(useCardStore.getState().colecciones).toHaveLength(1)
  })
})
