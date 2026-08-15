import { describe, expect, it, beforeEach } from 'vitest'
import { useMazosStore, type MazoPersonalizado } from '../useMazosStore'

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

  it('agrega un mazo con id slugificado', () => {
    const res = useMazosStore.getState().agregarMazo({
      nombre: 'Los Mutantes',
      cardIds: mazoValido('x').cardIds,
    })
    expect(res.ok).toBe(true)
    const mazos = useMazosStore.getState().mazosPersonalizados
    expect(mazos.length).toBe(1)
    expect(mazos[0].nombre).toBe('Los Mutantes')
    expect(mazos[0].id).toBe('los-mutantes')
    expect(mazos[0].cardIds).toHaveLength(66)
  })

  it('dedupe del id slugificado agrega sufijo -2', () => {
    useMazosStore.getState().agregarMazo({ nombre: 'Rojo', cardIds: mazoValido('x').cardIds })
    useMazosStore.getState().agregarMazo({ nombre: 'Rojo', cardIds: mazoValido('x').cardIds })
    const mazos = useMazosStore.getState().mazosPersonalizados
    expect(mazos.map((m) => m.id)).toEqual(['rojo', 'rojo-2'])
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
})
