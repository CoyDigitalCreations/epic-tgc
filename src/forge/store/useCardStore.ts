import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { AnyCard, CardType, Paquete } from '../../shared/types'
import { FACCION_COLORS } from '../../shared/types'
import {
  saveCardImage,
  deleteCardImage,
  isDataUrl,
} from '../utils/image-store'

/** Colección de cartas: fuente de verdad del card maker (A3). */
export interface Coleccion {
  id: string
  nombre: string
  /** Facción cosmética opcional (Estásis, Disonancia, ...) */
  faccion?: string
  cards: AnyCard[]
}

interface CardStore {
  // === Colecciones múltiples (A3) — fuente de verdad ===
  colecciones: Coleccion[]
  coleccionActivaId: string
  crearColeccion: (nombre: string, faccion?: string) => void
  setColeccionActiva: (id: string) => void
  renombrarColeccion: (id: string, nombre: string) => void
  eliminarColeccion: (id: string) => void

  // Collection — vista de la colección activa (se mantiene sincronizada)
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

  // === Paquetes personalizados (guardados en localStorage) ===
  userPacks: Paquete[]
  crearPaquete: (datos: {
    nombre: string
    tipo?: Paquete['tipo']
    facciones?: Paquete['facciones']
    lore?: string
    entrega?: string
    /** Id explícito (round-trip de import de paquete JSON) */
    id?: string
  }) => void
  renombrarPaquete: (id: string, nombre: string) => void
  eliminarPaquete: (id: string) => void
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

const coleccionDefault = (): Coleccion => ({
  id: 'default',
  nombre: 'Mi colección',
  cards: [],
})

/** Colección activa por id, con fallback a la primera (siempre existe ≥ 1). */
function activaDe(colecciones: Coleccion[], id: string): Coleccion {
  return colecciones.find((c) => c.id === id) ?? colecciones[0]
}

/** Aplica fn a las cartas de la colección con el id dado (inmutable). */
function conCardsEn(
  colecciones: Coleccion[],
  id: string,
  fn: (cards: AnyCard[]) => AnyCard[],
): Coleccion[] {
  return colecciones.map((c) =>
    c.id === id ? { ...c, cards: fn(c.cards) } : c,
  )
}

/** Slug amigable para el id de un paquete personalizado (sin diacríticos). */
function slugify(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'paquete'
  )
}

/* ─────────────────────────────────────────────
   Image handling — the persisted cards NEVER
   include the base64 art. Images live in IndexedDB
   (see utils/image-store.ts) so localStorage stays
   a few KB instead of blowing its ~5MB quota.
   ───────────────────────────────────────────── */

/** Move inline base64 art to IndexedDB (fire-and-forget, non-blocking).
 *  Rutas estáticas (/cartas/*.png) NO van a IndexedDB: ya viven en public/. */
function persistImages(cards: AnyCard[]): void {
  for (const card of cards) {
    if (card.imageUrl && isDataUrl(card.imageUrl)) {
      saveCardImage(card.id, card.imageUrl)
    }
  }
}

/**
 * Strip inline art before persisting; mark the card as hasImage.
 * Solo aplica a data URLs: las rutas estáticas se conservan tal cual
 * (el navegador las resuelve desde public/ en cada render).
 */
function stripCardImage(card: AnyCard): AnyCard {
  if (!card.imageUrl) return card
  return isDataUrl(card.imageUrl)
    ? { ...card, imageUrl: undefined, hasImage: true }
    : card
}

/** Alert once per session if storage writes fail (never fail silently) */
let storageWarned = false

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      // Colecciones múltiples (A3)
      colecciones: [coleccionDefault()],
      coleccionActivaId: 'default',

      crearColeccion: (nombre, faccion) => {
        set((state) => {
          const nueva: Coleccion = { id: uuid(), nombre, faccion, cards: [] }
          return {
            colecciones: [...state.colecciones, nueva],
            coleccionActivaId: nueva.id,
            cards: [],
          }
        })
      },

      setColeccionActiva: (id) => {
        set((state) => {
          const activa = state.colecciones.find((c) => c.id === id)
          // Id inexistente: no cambia nada
          if (!activa) return state
          return { coleccionActivaId: id, cards: activa.cards }
        })
      },

      renombrarColeccion: (id, nombre) => {
        set((state) => ({
          colecciones: state.colecciones.map((c) =>
            c.id === id ? { ...c, nombre } : c,
          ),
        }))
      },

      eliminarColeccion: (id) => {
        set((state) => {
          // Última colección: no se elimina, se resetea a una default nueva
          if (state.colecciones.length <= 1) {
            return {
              colecciones: [coleccionDefault()],
              coleccionActivaId: 'default',
              cards: [],
              selectedCardId: null,
            }
          }
          const colecciones = state.colecciones.filter((c) => c.id !== id)
          const coleccionActivaId =
            state.coleccionActivaId === id
              ? (colecciones[0]?.id ?? 'default')
              : state.coleccionActivaId
          const activa = activaDe(colecciones, coleccionActivaId)
          return {
            colecciones,
            coleccionActivaId: activa.id,
            cards: activa.cards,
          }
        })
      },

      // Collection — opera sobre la colección activa
      cards: [],
      addCard: (card) => {
        persistImages([card])
        set((state) => {
          const colecciones = conCardsEn(
            state.colecciones,
            state.coleccionActivaId,
            (cards) => [...cards, card],
          )
          return {
            colecciones,
            cards: activaDe(colecciones, state.coleccionActivaId).cards,
          }
        })
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
        set((state) => {
          const colecciones = conCardsEn(
            state.colecciones,
            state.coleccionActivaId,
            (cards) => cards.map((c) => (c.id === id ? preserved : c)),
          )
          return {
            colecciones,
            cards: activaDe(colecciones, state.coleccionActivaId).cards,
          }
        })
      },
      deleteCard: (id) => {
        const old = get().cards.find((c) => c.id === id)
        // Solo hay arte en IndexedDB si la carta lo marcó (hasImage);
        // las rutas estáticas (/cartas/*.png) viven en public/ y no se borran.
        if (old?.hasImage) deleteCardImage(id)
        set((state) => {
          const colecciones = conCardsEn(
            state.colecciones,
            state.coleccionActivaId,
            (cards) => cards.filter((c) => c.id !== id),
          )
          return {
            colecciones,
            cards: activaDe(colecciones, state.coleccionActivaId).cards,
            selectedCardId:
              state.selectedCardId === id ? null : state.selectedCardId,
          }
        })
      },
      loadCards: (cards) => {
        persistImages(cards)
        set((state) => {
          const colecciones = conCardsEn(
            state.colecciones,
            state.coleccionActivaId,
            (existentes) => {
              // Merge: reemplazar cartas existentes con mismo ID, agregar nuevas
              const map = new Map(existentes.map((c) => [c.id, c]))
              for (const card of cards) map.set(card.id, card)
              return [...map.values()]
            },
          )
          return {
            colecciones,
            cards: activaDe(colecciones, state.coleccionActivaId).cards,
          }
        })
      },
      clearCards: () => {
        // Limpia SOLO la colección activa: borra sus imágenes de IndexedDB
        // pero respeta las demás colecciones.
        set((state) => {
          const activa = activaDe(state.colecciones, state.coleccionActivaId)
          for (const c of activa.cards) {
            if (c.hasImage) deleteCardImage(c.id)
          }
          return {
            colecciones: state.colecciones.map((c) =>
              c.id === activa.id ? { ...c, cards: [] } : c,
            ),
            cards: [],
            selectedCardId: null,
            draft: initialDraft,
          }
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

      // Paquetes personalizados (creados desde el card maker, sin código)
      userPacks: [],
      crearPaquete: (datos) => {
        const { nombre, tipo, facciones, lore, entrega, id: idExplicito } = datos
        set((state) => {
          const base = slugify(idExplicito ?? nombre)
          const usados = new Set(state.userPacks.map((p) => p.id))
          let id = base
          for (let i = 2; usados.has(id); i++) id = `${base}-${i}`
          const faccion = facciones?.[0]
          const paquete: Paquete = {
            id,
            nombre,
            tipo: tipo ?? 'Mazo Temático',
            color: faccion ? (FACCION_COLORS[faccion] ?? '#6b7280') : '#6b7280',
            facciones: facciones ?? [],
            entrega: entrega ?? 'Personalizado',
            distribucion: { eter: 15, principal: 45, vinculos: 6 },
            lore: lore ?? '',
          }
          return { userPacks: [...state.userPacks, paquete] }
        })
      },
      renombrarPaquete: (id, nombre) => {
        set((state) => ({
          userPacks: state.userPacks.map((p) =>
            p.id === id ? { ...p, nombre } : p,
          ),
        }))
      },
      eliminarPaquete: (id) => {
        set((state) => {
          // Desasigna las cartas de TODAS las colecciones (no las borra):
          // el paquete es metadata, las cartas viven en la colección.
          const colecciones = state.colecciones.map((c) => ({
            ...c,
            cards: c.cards.map(
              ({ paqueteId: _paqueteId, ...rest }) => rest as AnyCard,
            ),
          }))
          return {
            userPacks: state.userPacks.filter((p) => p.id !== id),
            colecciones,
            cards: activaDe(colecciones, state.coleccionActivaId).cards,
          }
        })
      },
    }),
    {
      name: 'epic-tgc-collection',
      version: 2,
      partialize: (state) => ({
        colecciones: state.colecciones.map((c) => ({
          ...c,
          cards: c.cards.map(stripCardImage),
        })),
        coleccionActivaId: state.coleccionActivaId,
        userPacks: state.userPacks,
      }),
      migrate: (state, version) => {
        const s = state as Partial<CardStore> & {
          cards?: AnyCard[]
          userPacks?: Paquete[]
        }
        if (version === 0) {
          // v0 → v1: las cards planas pasan a la colección default.
          // Esto RECUPERA las cartas editadas guardadas en el formato viejo.
          return {
            ...s,
            colecciones: [{ ...coleccionDefault(), cards: s.cards ?? [] }],
            coleccionActivaId: 'default',
            userPacks: s.userPacks ?? [],
          }
        }
        // v1 → v2 (o mayor): aditivo — garantiza userPacks presente.
        return { ...(state as CardStore), userPacks: s.userPacks ?? [] }
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<CardStore> | undefined
        if (!p) return current
        const colecciones =
          Array.isArray(p.colecciones) && p.colecciones.length > 0
            ? p.colecciones
            : current.colecciones
        const coleccionActivaId = p.coleccionActivaId ?? current.coleccionActivaId
        const activa = activaDe(colecciones, coleccionActivaId)
        return {
          ...current,
          ...p,
          colecciones,
          coleccionActivaId: activa.id,
          // La vista `cards` SIEMPRE refleja la colección activa
          cards: activa.cards,
          userPacks: p.userPacks ?? current.userPacks ?? [],
        }
      },
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
        // Old versions persisted the base64 art INSIDE the cards. Move any
        // leftover inline images (in ANY colección) into IndexedDB.
        if (!state) return
        const conImagen = state.colecciones
          .flatMap((c) => c.cards)
          .filter((c) => c.imageUrl)
        if (conImagen.length === 0) return
        persistImages(conImagen)
        // Compact the legacy payload: rewrite the storage WITHOUT the base64
        // so the old multi-MB entry is freed and future setItem calls succeed.
        try {
          const compacted = {
            state: {
              colecciones: state.colecciones.map((c) => ({
                ...c,
                cards: c.cards.map(stripCardImage),
              })),
              coleccionActivaId: state.coleccionActivaId,
              userPacks: state.userPacks ?? [],
            },
            version: 2,
          }
          localStorage.setItem('epic-tgc-collection', JSON.stringify(compacted))
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
