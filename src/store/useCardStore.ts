import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { AnyCard, CardType } from '../types'

interface CardStore {
  // Collection
  cards: AnyCard[]
  addCard: (card: AnyCard) => void
  updateCard: (id: string, card: AnyCard) => void
  deleteCard: (id: string) => void
  loadCards: (cards: AnyCard[]) => void
  clearCards: () => void
  getCard: (id: string) => AnyCard | undefined

  // Draft (current editing) — free-form object being built
  draft: Record<string, unknown>
  setDraft: (draft: Record<string, unknown>) => void
  updateDraft: (field: string, value: unknown) => void
  resetDraft: () => void
  initDraft: (type: CardType) => void

  // UI
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
}

const initialDraft: Record<string, unknown> = {
  name: '',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  limiteCopias: '3',
  stats: { cost: 0, poder: 0, resistencia: 0 },
}

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      // Collection
      cards: [],
      addCard: (card) =>
        set((state) => ({ cards: [...state.cards, card] })),
      updateCard: (id, card) =>
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? card : c)),
        })),
      deleteCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          selectedCardId:
            state.selectedCardId === id ? null : state.selectedCardId,
        })),
      loadCards: (cards) =>
    set((state) => {
      // Merge: reemplazar cartas existentes con mismo ID, agregar nuevas
      const existing = new Map(state.cards.map((c) => [c.id, c]))
      for (const card of cards) existing.set(card.id, card)
      return { cards: [...existing.values()] }
    }),
      clearCards: () =>
        set({
          cards: [],
          selectedCardId: null,
          draft: initialDraft,
        }),
      getCard: (id) => get().cards.find((c) => c.id === id),

      // Draft
      draft: initialDraft,
      setDraft: (draft) => set({ draft }),
      updateDraft: (field, value) =>
        set((state) => ({ draft: { ...state.draft, [field]: value } })),
      resetDraft: () => set({ draft: initialDraft }),
      initDraft: (type) =>
        set({
          draft: {
            name: '',
            type,
            rarity: 'Común',
            keywords: [],
            flavorText: '',
            limiteCopias: '3',
            stats: { cost: 0, poder: 0, resistencia: 0 },
            id: uuid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),

      // UI
      selectedCardId: null,
      setSelectedCardId: (id) => set({ selectedCardId: id }),
    }),
    {
      name: 'epic-tgc-collection',
      partialize: (state) => ({
        cards: state.cards,
      }),
    },
  ),
)
