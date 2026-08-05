import { describe, it, expect, beforeEach } from 'vitest'
import { useCardStore } from '../useCardStore'

const STORAGE_KEY = 'epic-tgc-collection'

const campeon = (id: string, imageUrl?: string) =>
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
  }) as import('../../types').CampeonCard

beforeEach(() => {
  localStorage.clear()
  useCardStore.setState({ cards: [], draft: {}, selectedCardId: null })
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
    useCardStore.setState({ cards: [{ ...campeon('card-1'), hasImage: true }] })
    // Editar sin tocar la imagen: el draft hereda hasImage:true (imageUrl ausente)
    useCardStore.getState().updateCard('card-1', { ...campeon('card-1'), hasImage: true })
    const card = useCardStore.getState().cards[0]
    expect(card.hasImage).toBe(true)
    expect(card.imageUrl).toBeUndefined()
  })

  it('updateCard quita el flag si el editor removió la imagen (hasImage = false)', () => {
    useCardStore.setState({ cards: [{ ...campeon('card-1'), hasImage: true }] })
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
