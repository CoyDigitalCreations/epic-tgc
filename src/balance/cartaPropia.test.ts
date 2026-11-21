import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import type { AnyCard } from '../shared/types'
import { analizarCartaPropia } from './cartaPropia'
import type { LimiteCarta } from './limitesCarta'

const publicada = (id: string): AnyCard => {
  const c = ALL_CARDS.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

/** Una carta como la deja el Card-Maker a medio hacer: casi sin datos. */
const aMedioHacer = (p: Partial<AnyCard> = {}): AnyCard =>
  ({
    id: 'custom-1',
    name: '',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    stats: { cost: 0, poder: 0, resistencia: 0 },
    ...p,
  }) as AnyCard

const fila = (ls: LimiteCarta[], id: LimiteCarta['id']) => ls.find((l) => l.id === id)

describe('analizarCartaPropia', () => {
  it('mide una carta publicada igual que el Tablero: Aurora usa 20.6 de 21 de presupuesto y no rebasa nada', () => {
    const r = analizarCartaPropia(publicada('FB-010'))
    expect(r.carta.id).toBe('FB-010')
    expect(fila(r.limites, 'suma')).toMatchObject({ usado: 20.6, limite: 21 })
    expect(r.limites.some((l) => l.estado === 'excede')).toBe(false)
    expect(r.analisis.presupuesto?.elite).toBe(true)
  })

  it('no lanza con una carta a medio hacer y mide lo que hay', () => {
    expect(() => analizarCartaPropia(aMedioHacer())).not.toThrow()
    const r = analizarCartaPropia(aMedioHacer())
    expect(r.limites.length).toBeGreaterThan(0)
    expect(r.carta.nombre).toBe('')
  })

  it('una carta propia que se pasa de su coste lo dice: ATQ 9 con coste 2 (tope 4) rebasa', () => {
    const r = analizarCartaPropia(aMedioHacer({ name: 'Brutal', stats: { cost: 2, poder: 9, resistencia: 1 } }))
    expect(fila(r.limites, 'atq')).toMatchObject({ usado: 9, limite: 4, estado: 'excede' })
    expect(fila(r.limites, 'suma')?.estado).toBe('excede')
  })

  it('se mide sin pool: no hay ajuste propuesto y no cuenta rivales', () => {
    const r = analizarCartaPropia(aMedioHacer({ name: 'Prueba', stats: { cost: 3, poder: 3, resistencia: 3 } }))
    expect(r.analisis.ajuste).toBeNull()
    expect(r.analisis.letalidad?.total).toBe(0)
  })

  it('avisa de lo que el balanceador no conoce (keyword desconocida) en vez de fallar', () => {
    const r = analizarCartaPropia(aMedioHacer({ keywords: ['Volador'] as never, stats: { cost: 3, poder: 3, resistencia: 3 } }))
    expect(r.avisos.some((a) => a.includes('Volador'))).toBe(true)
  })

  it('no muta la carta que recibe', () => {
    const card = aMedioHacer({ name: 'Intacta', stats: { cost: 3, poder: 3, resistencia: 3 } })
    const copia = structuredClone(card)
    analizarCartaPropia(card)
    expect(card).toEqual(copia)
  })

  it('una Mística (sin stats) se mide solo con tabú y efecto por coste', () => {
    const r = analizarCartaPropia(aMedioHacer({ type: 'Mística', name: 'Hechizo', stats: { cost: 2 } } as never))
    expect(r.limites.map((l) => l.id)).not.toContain('atq')
    expect(r.limites.map((l) => l.id)).toContain('tabu')
  })
})
