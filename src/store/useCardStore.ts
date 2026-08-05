import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { AnyCard, CardType } from '../types'
import {
  saveCardImage,
  deleteCardImage,
  clearCardImages,
} from '../utils/image-store'

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

/* ─────────────────────────────────────────────
   Image handling — the persisted cards NEVER
   include the base64 art. Images live in IndexedDB
   (see utils/image-store.ts) so localStorage stays
   a few KB instead of blowing its ~5MB quota.
   ───────────────────────────────────────────── */

/** Move inline base64 art to IndexedDB (fire-and-forget, non-blocking) */
function persistImages(cards: AnyCard[]): void {
  for (const card of cards) {
    if (card.imageUrl) saveCardImage(card.id, card.imageUrl)
  }
}

/** Strip inline art before persisting; mark the card as hasImage */
function stripCardImage(card: AnyCard): AnyCard {
  return card.imageUrl
    ? { ...card, imageUrl: undefined, hasImage: true }
    : card
}

/** Alert once per session if storage writes fail (never fail silently) */
let storageWarned = false

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      // Collection
      cards: [],
      addCard: (card) => {
        persistImages([card])
        set((state) => ({ cards: [...state.cards, card] }))
      },
      updateCard: (id, card) => {
        const old = get().cards.find((c) => c.id === id)
        // Nueva imagen subida → persistir en IndexedDB
        if (card.imageUrl) {
          persistImages([card])
        } else if (old?.hasImage && card.hasImage === false) {
          // El editor removió la imagen explícitamente (ImageUpload setea hasImage=false)
          deleteCardImage(id)
        }
        // Si el editor NO tocó la imagen (hasImage heredado del draft = true),
        // se conserva: la imagen sigue viviendo en IndexedDB.
        const preserved =
          old?.hasImage && !card.imageUrl && card.hasImage !== false
            ? { ...card, hasImage: true }
            : card
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? preserved : c)),
        }))
      },
      deleteCard: (id) => {
        const old = get().cards.find((c) => c.id === id)
        if (old?.hasImage || old?.imageUrl) deleteCardImage(id)
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          selectedCardId:
            state.selectedCardId === id ? null : state.selectedCardId,
        }))
      },
      loadCards: (cards) => {
        persistImages(cards)
        set((state) => {
          // Merge: reemplazar cartas existentes con mismo ID, agregar nuevas
          const existing = new Map(state.cards.map((c) => [c.id, c]))
          for (const card of cards) existing.set(card.id, card)
          return { cards: [...existing.values()] }
        })
      },
      clearCards: () => {
        clearCardImages()
        set({
          cards: [],
          selectedCardId: null,
          draft: initialDraft,
        })
      },
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
        cards: state.cards.map(stripCardImage),
      }),
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value)
          } catch (err) {
            // Quota guard: never let a full storage break the editor — but
            // NEVER fail silently. If this fires, the user must know that
            // their edits won't survive a reload.
            console.error(
              '[Éter Forge] No se pudo persistir la colección (storage lleno o bloqueado):',
              err,
            )
            if (!storageWarned) {
              storageWarned = true
              alert(
                '[Éter Forge] No se pudo guardar la colección: el almacenamiento local ' +
                  'está lleno o bloqueado por el navegador. Podés seguir trabajando en esta ' +
                  'sesión, pero los cambios se perderán al recargar. Exportá un JSON como respaldo.',
              )
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
      onRehydrateStorage: () => (state) => {
        // Migration: old versions persisted the base64 art INSIDE the cards
        // array. Move any leftover inline images into IndexedDB.
        if (!state) return
        const withImage = state.cards.filter((c) => c.imageUrl)
        if (withImage.length === 0) return
        persistImages(withImage)
        // Compact the legacy payload: rewrite the storage WITHOUT the base64
        // so the old multi-MB entry is freed and future setItem calls succeed.
        try {
          const compacted = state.cards.map(stripCardImage)
          localStorage.setItem(
            'epic-tgc-collection',
            JSON.stringify({ state: { cards: compacted }, version: 0 }),
          )
        } catch (err) {
          console.error(
            '[Éter Forge] No se pudo compactar el storage legacy (la cuota sigue llena):',
            err,
          )
        }
      },
    },
  ),
)
