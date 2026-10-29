import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { borrarMazoNube, listarMazosNube, planificarSincronizacion, subirMazo } from './backend/mazosNube'

/** Mazo personalizado armado desde el editor del Online (66 cardIds expandidos). */
export interface MazoPersonalizado {
  id: string
  nombre: string
  /** 66 cardIds (15 Éter + 45 Principal + 6 Vínculos) — listos para createInitialState. */
  cardIds: string[]
}

const MAX_MAZOS = 5

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** El id del mazo es un uuid: es el mismo en el navegador y en la nube, así sincronizar es un upsert por id. */
export const esIdMazo = (id: string): boolean => UUID_RE.test(id)

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
  /** Une los mazos de este navegador con los de la cuenta (los de la nube mandan con el mismo id) y sube los que faltan. */
  sincronizarConNube: () => Promise<void>
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
        const nuevo: MazoPersonalizado = { id: crypto.randomUUID(), nombre: nombreLimpio, cardIds }
        set((state) => ({ mazosPersonalizados: [...state.mazosPersonalizados, nuevo] }))
        void subirMazo(nuevo)
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
        const mazo = get().mazosPersonalizados.find((m) => m.id === id)
        if (mazo) void subirMazo(mazo)
      },

      actualizarMazo: (id, cardIds) => {
        set((state) => ({
          mazosPersonalizados: state.mazosPersonalizados.map((m) =>
            m.id === id ? { ...m, cardIds } : m,
          ),
        }))
        const mazo = get().mazosPersonalizados.find((m) => m.id === id)
        if (mazo) void subirMazo(mazo)
      },

      eliminarMazo: (id) => {
        set((state) => ({
          mazosPersonalizados: state.mazosPersonalizados.filter((m) => m.id !== id),
        }))
        void borrarMazoNube(id)
      },

      sincronizarConNube: async () => {
        const nube = await listarMazosNube()
        if (nube === null) return // sin nube o sin red: los mazos locales siguen valiendo
        const plan = planificarSincronizacion(get().mazosPersonalizados, nube)
        set({ mazosPersonalizados: plan.resultado })
        await Promise.all(plan.subir.map((m) => subirMazo(m)))
      },
    }),
    {
      name: 'epic-tgc-mazos-personalizados',
      version: 2,
      // v1 usaba un slug del nombre como id; ahora es un uuid (el mismo en la nube). Los mazos viejos lo estrenan aquí.
      migrate: (guardado, version) => {
        const estado = guardado as { mazosPersonalizados?: MazoPersonalizado[] }
        if (version < 2 && Array.isArray(estado.mazosPersonalizados)) {
          estado.mazosPersonalizados = estado.mazosPersonalizados.map((m) => (esIdMazo(m.id) ? m : { ...m, id: crypto.randomUUID() }))
        }
        return estado as MazosState
      },
      partialize: (state) => ({ mazosPersonalizados: state.mazosPersonalizados }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
