import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCardImage } from '../useCardImage'
import { saveCardImage, clearCardImages } from '../../utils/image-store'
import { cardArtPath } from '../../../shared/data/paquetes'

describe('useCardImage — resolución de arte', () => {
  beforeEach(async () => {
    // Aislamiento: el cache en memoria de image-store sobrevive entre tests
    await clearCardImages()
  })

  it('usa la ruta estática versionada cuando la carta es de un set con arte', () => {
    // Carta oficial de Estásis SIN arte subido: cae a public/cartas/{id}.png
    const { result } = renderHook(() => useCardImage('FB-001', undefined, undefined))
    expect(result.current).toBe(cardArtPath('FB-001'))
    expect(result.current).toBe('/cartas/FB-001.png')
  })

  it('da prioridad al arte inline (base64 o ruta ya cargada)', () => {
    const inline = 'data:image/png;base64,INLINE'
    const { result } = renderHook(() => useCardImage('FB-001', undefined, inline))
    expect(result.current).toBe(inline)
  })

  it('NO inventa rutas para cartas sin arte oficial (p.ej. Disonancia)', () => {
    const { result } = renderHook(() => useCardImage('DS-001', undefined, undefined))
    expect(result.current).toBeUndefined()
  })

  it('devuelve el arte de IndexedDB cuando la carta lo tiene (hasImage)', async () => {
    await saveCardImage('FB-001', 'data:image/png;base64,IDB')
    const { result } = renderHook(() => useCardImage('FB-001', true, undefined))
    await waitFor(() => {
      expect(result.current).toBe('data:image/png;base64,IDB')
    })
  })

  it('cae a la ruta estática si hasImage=true pero no hay nada en IndexedDB', async () => {
    // hasImage marcado pero IndexedDB vacío (arte perdido): fallback a public/
    const { result } = renderHook(() => useCardImage('FB-001', true, undefined))
    await waitFor(() => {
      expect(result.current).toBe('/cartas/FB-001.png')
    })
  })

  it('vuelve a undefined para cartas desconocidas', () => {
    const { result } = renderHook(() => useCardImage('XYZ-999', undefined, undefined))
    expect(result.current).toBeUndefined()
  })
})

describe('useCardImage — efectos colaterales', () => {
  it('no deja lecturas colgadas al cambiar el id (cancellation)', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useCardImage(id, undefined, undefined),
      { initialProps: { id: 'FB-001' } },
    )
    rerender({ id: 'DS-001' })
    expect(result.current).toBeUndefined()
  })
})
