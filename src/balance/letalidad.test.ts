import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { letalidad, matrizLetalidad, poolLetalidad, techosDelPool, umbralesPorStat } from './letalidad'
import type { CartaBalance } from './tipos'

const { cartas } = cargarCartas(ALL_CARDS)
const pool = poolLetalidad(cartas)
const carta = (id: string): CartaBalance => {
  const c = cartas.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

const campeon = (id: string, atq: number, res: number, extra: Partial<CartaBalance> = {}): CartaBalance => ({
  id,
  nombre: id,
  tipo: 'Campeón',
  rareza: 'Común',
  coste: 2,
  mazo: 'estasis',
  roles: ['Normal'],
  stats: { atq, res },
  keywords: [],
  efectos: [],
  ...extra,
})

describe('poolLetalidad', () => {
  it('son los 18 Campeones no exentos del seed (sin Aurora ni Ragnar)', () => {
    expect(pool).toHaveLength(18)
    expect(pool.map((c) => c.id)).not.toContain('FB-010')
    expect(pool.map((c) => c.id)).not.toContain('DS-010')
  })

  it('descarta lo que no es Campeón o no tiene stats', () => {
    const mistica = campeon('X-1', 1, 1, { tipo: 'Mística', stats: null })
    expect(poolLetalidad([mistica, campeon('X-2', 1, 1, { stats: null }), campeon('X-3', 2, 2)]).map((c) => c.id)).toEqual(['X-3'])
  })

  it('R11: por defecto la referencia (esReferencia) queda fuera, y entra solo si se pide', () => {
    const ref = campeon('PR-1', 2, 2, { esReferencia: true })
    expect(poolLetalidad([...cartas, ref])).toHaveLength(18)
    expect(poolLetalidad([...cartas, ref], CONFIG_V1, { incluirReferencia: true })).toHaveLength(19)
  })
})

describe('letalidad de una carta', () => {
  it('daño >= RES mata (el empate mata)', () => {
    const p = [campeon('A', 3, 3), campeon('B', 3, 3)]
    const l = letalidad(p[0], p)
    expect(l?.mata).toBe(1)
    expect(l?.loMatan).toBe(1)
  })

  it('excluye a la propia carta del pool', () => {
    const a = campeon('A', 5, 3)
    const l = letalidad(a, [a, campeon('B', 0, 9)])
    expect(l?.total).toBe(1)
    expect(l?.mata).toBe(0)
    expect(l?.loMatan).toBe(0)
  })

  it('devuelve conteos y porcentajes con un decimal', () => {
    const a = campeon('A', 2, 2)
    const p = [a, campeon('B', 1, 9), campeon('C', 3, 1), campeon('D', 0, 0)]
    const l = letalidad(a, p)
    expect(l).toMatchObject({ total: 3, mata: 2, loMatan: 1 })
    expect(l?.pctMata).toBe(66.7)
    expect(l?.pctLoMatan).toBe(33.3)
  })

  it('con un pool vacío no hay NaN', () => {
    const a = campeon('A', 2, 2)
    expect(letalidad(a, [a])).toMatchObject({ total: 0, pctMata: 0, pctLoMatan: 0, dominante: false })
  })

  it('una carta sin stats no tiene letalidad', () => {
    expect(letalidad(campeon('A', 0, 0, { stats: null }), pool)).toBeNull()
  })

  // Rediseño de Disonancia (Lote 2): Kael 4/2, Draven 3/3, Marek 4/3, Korr 4/4: el pool tiene un ATQ 5 menos (solo Vaela) y un RES 5 menos
  // (Korr 3/5 pasó a 4/4), así que Nymeria y Vorlag matan a 12 y solo Vaela (ATQ 5) los mata a ellos.
  it('R10: Nymeria y Vorlag (4/5) son dominantes: matan 12 y los mata 1', () => {
    for (const id of ['FB-017', 'DS-017']) {
      const l = letalidad(carta(id), pool)
      expect(l).toMatchObject({ mata: 12, loMatan: 1, total: 17, dominante: true })
    }
  })

  it('R10: Vaela (5/2) mata a casi todos y muere ante todos, no es dominante', () => {
    // Kael ya no es 5/3: con el rediseño de Disonancia es 4/2 (mata a 11 y muere ante todos; tampoco es dominante)
    const l = letalidad(carta('FB-011'), pool)
    expect(l?.mata).toBeGreaterThanOrEqual(14)
    expect(l?.loMatan).toBe(l?.total)
    expect(l?.dominante).toBe(false)
    const kael = letalidad(carta('DS-011'), pool)
    expect(kael).toMatchObject({ mata: 11, loMatan: 17, dominante: false })
  })

  it('R10: Isolde, Rowena y Skarn (RES 6-7) son invulnerables en combate', () => {
    for (const id of ['FB-014', 'FB-018', 'DS-018']) expect(letalidad(carta(id), pool)?.loMatan).toBe(0)
  })

  it('coincide con un conteo independiente sobre el seed real', () => {
    for (const c of pool) {
      const otros = pool.filter((o) => o.id !== c.id)
      const l = letalidad(c, pool)
      expect(l?.mata).toBe(otros.filter((o) => (c.stats?.atq ?? 0) >= (o.stats?.res ?? 0)).length)
      expect(l?.loMatan).toBe(otros.filter((o) => (o.stats?.atq ?? 0) >= (c.stats?.res ?? 0)).length)
    }
  })

  it('los umbrales de dominante viven en config', () => {
    const laxa = structuredClone(CONFIG_V1)
    laxa.letalidad.dominanteMata = 0
    laxa.letalidad.dominanteLoMatan = 100
    expect(letalidad(carta('FB-011'), pool, laxa)?.dominante).toBe(true)
  })
})

describe('matrizLetalidad', () => {
  it('celdas[i][j] dice si i mata a j; la diagonal es falsa', () => {
    const p = [campeon('A', 3, 1), campeon('B', 0, 3)]
    const m = matrizLetalidad(p)
    expect(m.ids).toEqual(['A', 'B'])
    expect(m.celdas).toEqual([
      [false, true],
      [false, false],
    ])
  })

  it('con el seed real es cuadrada de 18 y coherente con letalidad()', () => {
    const m = matrizLetalidad(pool)
    expect(m.celdas).toHaveLength(18)
    pool.forEach((c, i) => {
      expect(m.celdas[i].filter(Boolean).length).toBe(letalidad(c, pool)?.mata)
    })
  })
})

describe('umbralesPorStat (escalones)', () => {
  const u = umbralesPorStat(pool)
  const lm = (valor: number) => u.res.find((f) => f.valor === valor)?.loMatan
  const mt = (valor: number) => u.atq.find((f) => f.valor === valor)?.mata

  it('R10: RES 0 a 3 son equivalentes: los matan a todos', () => {
    for (const v of [0, 1, 2, 3]) expect(lm(v)).toBe(18)
  })

  // Rediseño de Estásis: Isolde pasó de RES 7 a 6 y Rowena y Vaela cambiaron de perfil; el pool ya no llega a RES 7. Elena sube a ATQ 4, así que un RES 4 ahora lo matan 10.
  // Rediseño de Disonancia: Kael 4/2 y Marek 4/3 ya no son de ATQ 5, Korr pasó a 4/4: un RES 4 lo matan 9 y un RES 5 solo Vaela (1).
  // Emisario (DS-031) pasó a coste 3 y 4/3 (su tutor llega a Ragnar): ahora tiene ATQ 4, así que un RES 4 lo matan 10.
  it('RES 4 la matan 10, RES 5 la mata 1 y RES 6 o más no la mata nadie', () => {
    expect(lm(4)).toBe(10)
    expect(lm(5)).toBe(1)
    expect(lm(6)).toBe(0)
    expect(lm(7)).toBeUndefined()
  })

  it('ATQ 4 mata a 12, ATQ 5 a 15', () => {
    expect(mt(4)).toBe(12)
    expect(mt(5)).toBe(15)
  })

  it('cubre todos los valores de 0 al máximo de cada stat y trae porcentajes', () => {
    expect(u.res.map((f) => f.valor)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(u.atq.map((f) => f.valor)).toEqual([0, 1, 2, 3, 4, 5])
    expect(u.res[0].pct).toBe(100)
  })

  it('con un pool vacío no truena', () => {
    expect(umbralesPorStat([])).toEqual({ atq: [], res: [] })
  })
})

describe('techosDelPool', () => {
  it('ATQ máximo 5 y RES máxima 6 en el seed real (antes 7: Isolde bajó a 3/6)', () => {
    expect(techosDelPool(pool)).toEqual({ atq: 5, res: 6 })
  })
})
