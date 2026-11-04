import type { ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router'
import { leerFiltros, useFiltrosBalance, VISTAS } from './useFiltrosBalance'

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

  it('reconoce las diez vistas, incluida el análisis de carta', () => {
    expect(VISTAS).toEqual([
      'resumen',
      'dispersion',
      'presupuesto',
      'verbos',
      'ranking',
      'curva',
      'letalidad',
      'comparador',
      'auditoria',
      'analisis',
    ])
    expect(leerFiltros(new URLSearchParams('vista=letalidad')).vista).toBe('letalidad')
    expect(leerFiltros(new URLSearchParams('vista=analisis')).vista).toBe('analisis')
  })

  it('lee la carta solo si es una de las ids válidas; sin ids no hay carta', () => {
    const ids = new Set(['FB-015', 'DS-011'])
    expect(leerFiltros(new URLSearchParams('carta=FB-015'), ids).carta).toBe('FB-015')
    expect(leerFiltros(new URLSearchParams('carta=ZZ-999'), ids).carta).toBeNull()
    expect(leerFiltros(new URLSearchParams('carta=FB-015')).carta).toBeNull()
    expect(leerFiltros(new URLSearchParams(''), ids).carta).toBeNull()
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

describe('useFiltrosBalance: carta', () => {
  const IDS = new Set(['FB-015', 'DS-011'])
  const montarConIds = (url: string) =>
    renderHook(() => ({ f: useFiltrosBalance(IDS), ubicacion: useLocation(), navegacion: useNavigationType() }), {
      wrapper: envoltorio(url),
    })

  it('expone la carta válida de la URL', () => {
    const { result } = montarConIds('/balance?vista=analisis&carta=FB-015')
    expect(result.current.f.carta).toBe('FB-015')
  })

  it('una carta inválida se borra de la URL con replace y queda sin selección', () => {
    const { result } = montarConIds('/balance?vista=analisis&carta=ZZ-999&mazo=estasis')
    expect(result.current.f.carta).toBeNull()
    expect(result.current.ubicacion.search).not.toContain('carta')
    expect(result.current.ubicacion.search).toContain('mazo=estasis')
    expect(result.current.navegacion).toBe('REPLACE')
  })

  it('sin ids válidas no toca la URL (FiltrosBalance usa el hook sin ids)', () => {
    const { result } = montar('/balance?carta=ZZ-999')
    expect(result.current.ubicacion.search).toContain('carta=ZZ-999')
  })

  it('setCarta cambia la carta de la URL y null la quita', () => {
    const { result } = montarConIds('/balance?vista=analisis&carta=FB-015')
    act(() => result.current.f.setCarta('DS-011'))
    expect(result.current.f.carta).toBe('DS-011')
    expect(result.current.ubicacion.search).toContain('carta=DS-011')
    act(() => result.current.f.setCarta(null))
    expect(result.current.ubicacion.search).not.toContain('carta')
  })

  it('limpiar conserva la carta y la vista', () => {
    const { result } = montarConIds('/balance?vista=analisis&carta=FB-015&mazo=estasis&coste=3')
    act(() => result.current.f.limpiar())
    expect(result.current.f.filtros).toEqual({ mazo: null, tipo: null, coste: null, rareza: null })
    expect(result.current.f.carta).toBe('FB-015')
    expect(result.current.f.vista).toBe('analisis')
  })

  it('analizar(id) cambia vista y carta en un solo setParams, conservando los filtros', () => {
    const { result } = montarConIds('/balance?vista=auditoria&mazo=estasis')
    act(() => result.current.f.analizar('FB-015'))
    expect(result.current.f.vista).toBe('analisis')
    expect(result.current.f.carta).toBe('FB-015')
    expect(result.current.ubicacion.search).toContain('mazo=estasis')
  })
})
