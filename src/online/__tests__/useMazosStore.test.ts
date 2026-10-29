import { describe, expect, it, beforeEach, vi } from 'vitest'
import { esIdMazo, useMazosStore, type MazoPersonalizado } from '../useMazosStore'

// La nube no se toca desde estos tests: se espía lo que el store le pide
vi.mock('../backend/mazosNube', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../backend/mazosNube')>()),
  subirMazo: vi.fn().mockResolvedValue(true),
  borrarMazoNube: vi.fn().mockResolvedValue(true),
  listarMazosNube: vi.fn().mockResolvedValue(null),
}))
import { borrarMazoNube, listarMazosNube, subirMazo } from '../backend/mazosNube'

const KEY = 'epic-tgc-mazos-personalizados'

const mazoValido = (nombre: string): MazoPersonalizado => ({
  id: 'x',
  nombre,
  cardIds: Array.from({ length: 66 }, (_, i) => `carta-${i}`),
})

function limpiar() {
  localStorage.removeItem(KEY)
  useMazosStore.getState().eliminarMazo(useMazosStore.getState().mazosPersonalizados[0]?.id ?? 'noop')
  // reseteo directo del estado (eliminarMazo sobre id inexistente es no-op)
  useMazosStore.setState({ mazosPersonalizados: [] })
}

describe('useMazosStore', () => {
  beforeEach(limpiar)

  it('agrega un mazo con id uuid y lo sube a la nube', () => {
    const res = useMazosStore.getState().agregarMazo({
      nombre: 'Los Mutantes',
      cardIds: mazoValido('x').cardIds,
    })
    expect(res.ok).toBe(true)
    const mazos = useMazosStore.getState().mazosPersonalizados
    expect(mazos.length).toBe(1)
    expect(mazos[0].nombre).toBe('Los Mutantes')
    expect(esIdMazo(mazos[0].id)).toBe(true)
    expect(subirMazo).toHaveBeenCalledWith(mazos[0])
    expect(mazos[0].cardIds).toHaveLength(66)
  })

  it('dos mazos con el mismo nombre tienen ids distintos', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'Rojo', cardIds: mazoValido('x').cardIds })
    useMazosStore.getState().agregarMazo({ nombre: 'Rojo', cardIds: mazoValido('x').cardIds })
    const ids = useMazosStore.getState().mazosPersonalizados.map((m) => m.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('rechaza un nombre vacío con error', () => {
    const res = useMazosStore.getState().agregarMazo({
      nombre: '   ',
      cardIds: mazoValido('x').cardIds,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/nombre/i)
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('rechaza el 6º mazo (tope 5) y NO agrega', () => {
    for (let i = 1; i <= 5; i++) {
      useMazosStore.getState().agregarMazo({ nombre: `Mazo ${i}`, cardIds: mazoValido('x').cardIds })
    }
    const res = useMazosStore.getState().agregarMazo({
      nombre: 'Mazo 6',
      cardIds: mazoValido('x').cardIds,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/5/)
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(5)
  })

  it('renombrar cambia solo el nombre (id estable)', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'Original', cardIds: mazoValido('x').cardIds })
    const id = useMazosStore.getState().mazosPersonalizados[0].id
    useMazosStore.getState().renombrarMazo(id, 'Nuevo nombre')
    const mazo = useMazosStore.getState().mazosPersonalizados[0]
    expect(mazo.nombre).toBe('Nuevo nombre')
    expect(mazo.id).toBe(id)
  })

  it('actualizar reemplaza los cardIds', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'A', cardIds: mazoValido('x').cardIds })
    const id = useMazosStore.getState().mazosPersonalizados[0].id
    const nuevos = Array.from({ length: 66 }, (_, i) => `otra-${i}`)
    useMazosStore.getState().actualizarMazo(id, nuevos)
    expect(useMazosStore.getState().mazosPersonalizados[0].cardIds).toEqual(nuevos)
  })

  it('eliminar quita el mazo', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'A', cardIds: mazoValido('x').cardIds })
    const id = useMazosStore.getState().mazosPersonalizados[0].id
    useMazosStore.getState().eliminarMazo(id)
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('persiste en localStorage y rehidrata', async () => {
    useMazosStore.getState().agregarMazo({ nombre: 'Persistido', cardIds: mazoValido('x').cardIds })
    const guardado = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    expect(guardado.state.mazosPersonalizados).toHaveLength(1)
    expect(guardado.state.mazosPersonalizados[0].nombre).toBe('Persistido')

    // Simula un reload: reinicia el estado y rehidrata desde el storage persistido.
    localStorage.setItem(KEY, JSON.stringify(guardado))
    await useMazosStore.persist.rehydrate()
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(1)
    expect(useMazosStore.getState().mazosPersonalizados[0].nombre).toBe('Persistido')
  })

  it('eliminar también lo borra de la nube', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'A', cardIds: mazoValido('x').cardIds })
    const id = useMazosStore.getState().mazosPersonalizados[0].id
    useMazosStore.getState().eliminarMazo(id)
    expect(borrarMazoNube).toHaveBeenCalledWith(id)
  })

  it('editar o renombrar sube la versión nueva', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'A', cardIds: mazoValido('x').cardIds })
    const id = useMazosStore.getState().mazosPersonalizados[0].id
    useMazosStore.getState().renombrarMazo(id, 'B')
    expect(subirMazo).toHaveBeenLastCalledWith(expect.objectContaining({ id, nombre: 'B' }))
  })

  describe('sincronizarConNube', () => {
    const nubeId = '11111111-1111-4111-8111-111111111111'
    const deNube = { id: nubeId, nombre: 'De la nube', cardIds: mazoValido('x').cardIds }

    it('trae los mazos de la cuenta y sube los que solo estaban aquí', async () => {
      useMazosStore.getState().agregarMazo({ nombre: 'Local', cardIds: mazoValido('x').cardIds })
      const local = useMazosStore.getState().mazosPersonalizados[0]
      vi.mocked(subirMazo).mockClear()
      vi.mocked(listarMazosNube).mockResolvedValueOnce([deNube])
      await useMazosStore.getState().sincronizarConNube()
      expect(useMazosStore.getState().mazosPersonalizados.map((m) => m.id)).toEqual([nubeId, local.id])
      expect(subirMazo).toHaveBeenCalledTimes(1)
      expect(subirMazo).toHaveBeenCalledWith(local)
    })

    it('sin nube (null) no toca los mazos locales', async () => {
      useMazosStore.getState().agregarMazo({ nombre: 'Local', cardIds: mazoValido('x').cardIds })
      vi.mocked(listarMazosNube).mockResolvedValueOnce(null)
      await useMazosStore.getState().sincronizarConNube()
      expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(1)
    })
  })

  it('migra los ids viejos (slug) a uuid al rehidratar un estado v1', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { mazosPersonalizados: [{ id: 'los-mutantes', nombre: 'Los Mutantes', cardIds: ['a'] }] }, version: 1 }))
    await useMazosStore.persist.rehydrate()
    const [m] = useMazosStore.getState().mazosPersonalizados
    expect(m.nombre).toBe('Los Mutantes')
    expect(esIdMazo(m.id)).toBe(true)
  })
})
