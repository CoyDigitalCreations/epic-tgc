import type { ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { leerFiltros, useFiltrosBalance } from './useFiltrosBalance'

const envoltorio = (url: string) =>
  function Envoltorio({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  }

function montar(url: string) {
  return renderHook(() => ({ f: useFiltrosBalance(), ubicacion: useLocation() }), { wrapper: envoltorio(url) })
}

describe('leerFiltros', () => {
  it('lee mazo, tipo, coste, rareza y vista de la URL', () => {
    const r = leerFiltros(new URLSearchParams('mazo=estasis&tipo=Campeón&coste=3&rareza=Única&vista=ranking'))
    expect(r.filtros).toEqual({ mazo: 'estasis', tipo: 'Campeón', coste: 3, rareza: 'Única' })
    expect(r.vista).toBe('ranking')
  })

  it('sin parámetros devuelve todo vacío y la vista por defecto', () => {
    const r = leerFiltros(new URLSearchParams(''))
    expect(r.filtros).toEqual({ mazo: null, tipo: null, coste: null, rareza: null })
    expect(r.vista).toBe('resumen')
  })

  it('ignora valores inválidos sin lanzar', () => {
    const r = leerFiltros(new URLSearchParams('mazo=caos&tipo=Dragón&coste=abc&rareza=Mítica&vista=nada'))
    expect(r.filtros).toEqual({ mazo: null, tipo: null, coste: null, rareza: null })
    expect(r.vista).toBe('resumen')
  })

  it('rechaza costes negativos o con decimales', () => {
    expect(leerFiltros(new URLSearchParams('coste=-1')).filtros.coste).toBeNull()
    expect(leerFiltros(new URLSearchParams('coste=2.5')).filtros.coste).toBeNull()
    expect(leerFiltros(new URLSearchParams('coste=0')).filtros.coste).toBe(0)
  })
})

describe('useFiltrosBalance', () => {
  it('toma los filtros iniciales de la URL (MemoryRouter initialEntries)', () => {
    const { result } = montar('/balance?mazo=disonancia&coste=3&vista=dispersion')
    expect(result.current.f.filtros).toEqual({ mazo: 'disonancia', tipo: null, coste: 3, rareza: null })
    expect(result.current.f.vista).toBe('dispersion')
  })

  it('cambiar un filtro actualiza la URL y conserva los demás', () => {
    const { result } = montar('/balance?mazo=estasis')
    act(() => result.current.f.setFiltro('coste', 2))
    expect(result.current.f.filtros).toMatchObject({ mazo: 'estasis', coste: 2 })
    expect(result.current.ubicacion.search).toContain('mazo=estasis')
    expect(result.current.ubicacion.search).toContain('coste=2')
  })

  it('poner un filtro en null lo quita de la URL', () => {
    const { result } = montar('/balance?mazo=estasis&coste=2')
    act(() => result.current.f.setFiltro('mazo', null))
    expect(result.current.ubicacion.search).not.toContain('mazo')
    expect(result.current.f.filtros.mazo).toBeNull()
  })

  it('cambia la vista', () => {
    const { result } = montar('/balance')
    act(() => result.current.f.setVista('auditoria'))
    expect(result.current.f.vista).toBe('auditoria')
    expect(result.current.ubicacion.search).toContain('vista=auditoria')
  })

  it('limpiar quita los filtros y deja la vista', () => {
    const { result } = montar('/balance?mazo=estasis&tipo=Campeón&vista=ranking')
    act(() => result.current.f.limpiar())
    expect(result.current.f.filtros).toEqual({ mazo: null, tipo: null, coste: null, rareza: null })
    expect(result.current.f.vista).toBe('ranking')
  })
})
