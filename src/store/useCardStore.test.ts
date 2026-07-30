import { describe, it, expect, beforeEach } from 'vitest'
import { useCardStore } from './useCardStore'
import type { AnyCard } from '../types'

// Reset store before each test
beforeEach(() => {
  useCardStore.setState({
    cards: [],
    draft: { name: '', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '', stats: { cost: 0, poder: 0, resistencia: 0 } },
    selectedCardId: null,
  })
})

const makeCard = (overrides: Partial<AnyCard> = {}): AnyCard => ({
  id: 'test-1',
  name: 'Test Card',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  element: undefined as never,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  stats: { cost: 3, poder: 1000, resistencia: 800 },
  efectoPasivo: 'Test pasiva',
  ...overrides,
}) as AnyCard

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
      const card = makeCard()
      useCardStore.getState().addCard(card)
      expect(useCardStore.getState().cards).toHaveLength(1)
      expect(useCardStore.getState().cards[0].id).toBe('test-1')
    })
  })

  describe('updateCard', () => {
    it('updates an existing card', () => {
      const card = makeCard()
      useCardStore.getState().addCard(card)
      const updated = makeCard({ name: 'Updated Name' })
      useCardStore.getState().updateCard('test-1', updated)
      expect(useCardStore.getState().cards[0].name).toBe('Updated Name')
    })
  })

  describe('deleteCard', () => {
    it('removes a card from the collection', () => {
      useCardStore.getState().addCard(makeCard())
      useCardStore.getState().deleteCard('test-1')
      expect(useCardStore.getState().cards).toHaveLength(0)
    })

    it('clears selectedCardId if deleted card was selected', () => {
      useCardStore.getState().addCard(makeCard())
      useCardStore.getState().setSelectedCardId('test-1')
      useCardStore.getState().deleteCard('test-1')
      expect(useCardStore.getState().selectedCardId).toBeNull()
    })
  })

  describe('getCard', () => {
    it('finds a card by id', () => {
      useCardStore.getState().addCard(makeCard())
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
      useCardStore.getState().addCard(makeCard({ id: 'orig-1', name: 'Old Card' }))
      const newCards = [
        makeCard({ id: 'orig-1', name: 'Updated Card' }),
        makeCard({ id: 'new-1', name: 'New Card' }),
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
