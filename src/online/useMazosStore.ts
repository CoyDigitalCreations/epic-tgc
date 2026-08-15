import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Mazo personalizado armado desde el editor del Online (66 cardIds expandidos). */
export interface MazoPersonalizado {
  id: string
  nombre: string
  /** 66 cardIds (15 Éter + 45 Principal + 6 Vínculos) — listos para createInitialState. */
  cardIds: string[]
}

const MAX_MAZOS = 5

/** Slug amigable para el id de un mazo personalizado (sin diacríticos). */
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
      .replace(/^-+|-+$/g, '') || 'mazo'
  )
}

export interface MazosState {
  mazosPersonalizados: MazoPersonalizado[]
  /** Agrega un mazo; rechaza con error si se supera el tope de 5 o el nombre está vacío. */
  agregarMazo: (mazo: { nombre: string; cardIds: string[] }) => {
    ok: boolean
    error?: string
  }
  renombrarMazo: (id: string, nombre: string) => void
  actualizarMazo: (id: string, cardIds: string[]) => void
  eliminarMazo: (id: string) => void
}

export const useMazosStore = create<MazosState>()(
  persist(
    (set, get) => ({
      mazosPersonalizados: [],

      agregarMazo: ({ nombre, cardIds }) => {
        const nombreLimpio = nombre.trim()
        if (!nombreLimpio) {
          return { ok: false, error: 'El mazo necesita un nombre.' }
        }
        if (get().mazosPersonalizados.length >= MAX_MAZOS) {
          return {
            ok: false,
            error: `Máximo ${MAX_MAZOS} mazos personalizados.`,
          }
        }
        const usados = new Set(get().mazosPersonalizados.map((m) => m.id))
        const base = slugify(nombreLimpio)
        let id = base
        for (let i = 2; usados.has(id); i++) id = `${base}-${i}`
        set((state) => ({
          mazosPersonalizados: [
            ...state.mazosPersonalizados,
            { id, nombre: nombreLimpio, cardIds },
          ],
        }))
        return { ok: true }
      },

      renombrarMazo: (id, nombre) => {
        const nombreLimpio = nombre.trim()
        if (!nombreLimpio) return
        set((state) => ({
          mazosPersonalizados: state.mazosPersonalizados.map((m) =>
            m.id === id ? { ...m, nombre: nombreLimpio } : m,
          ),
        }))
      },

      actualizarMazo: (id, cardIds) => {
        set((state) => ({
          mazosPersonalizados: state.mazosPersonalizados.map((m) =>
            m.id === id ? { ...m, cardIds } : m,
          ),
        }))
      },

      eliminarMazo: (id) => {
        set((state) => ({
          mazosPersonalizados: state.mazosPersonalizados.filter((m) => m.id !== id),
        }))
      },
    }),
    {
      name: 'epic-tgc-mazos-personalizados',
      version: 1,
      partialize: (state) => ({ mazosPersonalizados: state.mazosPersonalizados }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
