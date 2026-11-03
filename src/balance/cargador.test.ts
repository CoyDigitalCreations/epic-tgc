import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import type { AnyCard } from '../shared/types'
import { cargarCartas } from './cargador'

const carga = cargarCartas(ALL_CARDS)

describe('cargarCartas con el seed real', () => {
  it('carga las 65 cartas separadas por mazo', () => {
    expect(carga.cartas).toHaveLength(65)
    expect(carga.estasis).toHaveLength(32)
    expect(carga.disonancia).toHaveLength(33)
    expect(carga.estasis.length + carga.disonancia.length).toBe(65)
  })

  it('cuenta los efectos de la lista y los comandantes', () => {
    const delSeed = ALL_CARDS.reduce(
      (n, c) => n + (c.efectos?.length ?? 0) + (c.type === 'Campeón' && c.efectoComandante ? 1 : 0),
      0,
    )
    expect(carga.totalEfectos).toBe(delSeed)
    expect(carga.cartas.flatMap((c) => c.efectos).filter((e) => e.esComandante)).toHaveLength(2)
  })

  it('extrae los 20 Campeones con stats numéricos', () => {
    expect(carga.campeones).toHaveLength(20)
    for (const c of carga.campeones) {
      expect(c.stats).not.toBeNull()
      expect(typeof c.stats?.atq).toBe('number')
      expect(typeof c.stats?.res).toBe('number')
    }
    const elena = carga.campeones.find((c) => c.id === 'FB-015')
    expect(elena?.stats).toEqual({ atq: 3, res: 0 })
    expect(elena?.coste).toBe(3)
    expect(elena?.mazo).toBe('estasis')
  })

  it('conserva roles y rareza', () => {
    const aurora = carga.cartas.find((c) => c.id === 'FB-010')
    expect(aurora?.roles).toEqual(['Soberano'])
    expect(aurora?.rareza).toBe('Única')
  })

  it('tolera hasta_alba_oponente sin lanzar y lo conserva con un aviso', () => {
    const nymeria = carga.cartas.find((c) => c.id === 'FB-017')
    expect(nymeria?.efectos.some((e) => e.duracion === 'hasta_alba_oponente')).toBe(true)
    expect(carga.avisos.some((a) => a.includes('hasta_alba_oponente'))).toBe(true)
  })

  it('no muta el seed', () => {
    const antes = JSON.stringify(ALL_CARDS)
    cargarCartas(ALL_CARDS)
    expect(JSON.stringify(ALL_CARDS)).toBe(antes)
  })
})

describe('cargarCartas en los bordes', () => {
  const base = {
    id: 'X-001',
    name: 'Prueba',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '',
    updatedAt: '',
    paqueteId: 'estasis',
  }

  it('acepta una carta sin efectos', () => {
    const r = cargarCartas([{ ...base, type: 'Mística', stats: { cost: 2 } } as unknown as AnyCard])
    expect(r.cartas).toHaveLength(1)
    expect(r.cartas[0].efectos).toEqual([])
    expect(r.totalEfectos).toBe(0)
  })

  it('marca «sin verbo» un efecto que no declara verbo', () => {
    const r = cargarCartas([
      {
        ...base,
        id: 'DS-024',
        type: 'Mística',
        stats: { cost: 1 },
        efectos: [{ tipo: 'hechizo' }],
      } as unknown as AnyCard,
    ])
    expect(r.cartas[0].efectos[0].sinVerbo).toBe(true)
    expect(r.cartas[0].efectos[0].verbo).toBeNull()
    expect(r.avisos.some((a) => a.includes('sin verbo'))).toBe(true)
  })

  it('no marca sin verbo un efecto cuyos verbos vienen en tramos', () => {
    const cassandra = carga.cartas.find((c) => c.id === 'FB-016')
    expect(cassandra?.efectos[0].sinVerbo).toBe(false)
    expect(cassandra?.efectos[0].verbosTramos).toEqual(['toggle_exhaust', 'fix_exhaust'])
  })

  it('acepta un Campeón sin stats y no le asigna evaluación', () => {
    const r = cargarCartas([{ ...base, type: 'Campeón' } as unknown as AnyCard])
    expect(r.cartas).toHaveLength(1)
    expect(r.cartas[0].stats).toBeNull()
    expect(r.cartas[0].coste).toBe(0)
  })

  it('deja el mazo en null si el paquete no es de los dos conocidos', () => {
    const r = cargarCartas([{ ...base, paqueteId: 'otro', type: 'Éter', stats: { cost: 1 } } as unknown as AnyCard])
    expect(r.cartas[0].mazo).toBeNull()
    expect(r.estasis).toHaveLength(0)
    expect(r.disonancia).toHaveLength(0)
  })
})
