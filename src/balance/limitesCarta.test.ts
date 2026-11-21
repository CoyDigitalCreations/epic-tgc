import { describe, expect, it } from 'vitest'
import { cargarCartas } from './cargador'
import { limitesDeCarta, resumenDeLimites } from './limitesCarta'
import type { LimiteCarta } from './limitesCarta'
import { CONFIG_V1 } from './config'
import type { CartaBalance, EfectoBalance } from './tipos'
import { ALL_CARDS } from './test/seedClasico'

const { cartas } = cargarCartas(ALL_CARDS)
const real = (id: string): CartaBalance => {
  const c = cartas.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

const efecto = (p: Partial<EfectoBalance> = {}): EfectoBalance => ({
  verbo: null, sinVerbo: false, verbosTramos: [], tipo: 'pasivo', trigger: null, objetivoTipo: null, duracion: null,
  costoTipo: null, costoCantidad: 0, activacion: null, keywordsConcedidas: [], esComandante: false, ...p,
})

const campeon = (p: Partial<CartaBalance> = {}): CartaBalance => ({
  id: 'T-001', nombre: 'Prueba', tipo: 'Campeón', rareza: 'Común', coste: 3, mazo: null, roles: ['Normal'],
  stats: { atq: 3, res: 3 }, keywords: [], efectos: [], ...p,
})

const fila = (ls: LimiteCarta[], id: LimiteCarta['id']): LimiteCarta | undefined => ls.find((l) => l.id === id)

describe('limitesDeCarta · un Campeón dentro de todo', () => {
  it('trae tope de ATQ, de RES, presupuesto de stats y de tabú, todos dentro', () => {
    const ls = limitesDeCarta(campeon({ stats: { atq: 3, res: 3 } })) // coste 3: banda 6-8, topes 5
    expect(ls.map((l) => l.id)).toEqual(['atq', 'res', 'suma', 'tabu', 'efecto-por-coste'])
    expect(fila(ls, 'atq')).toMatchObject({ usado: 3, limite: 5, estado: 'dentro' })
    expect(fila(ls, 'res')).toMatchObject({ usado: 3, limite: 5, estado: 'dentro' })
    expect(fila(ls, 'suma')).toMatchObject({ usado: 6, limite: 8, estado: 'dentro' })
    expect(resumenDeLimites(ls).rebasados).toEqual([])
  })
})

describe('limitesDeCarta · lo que rebasa', () => {
  it('un tope individual: ATQ 6 con tope 5 excede aunque la suma esté en banda', () => {
    const ls = limitesDeCarta(campeon({ stats: { atq: 6, res: 1 } }))
    expect(fila(ls, 'atq')).toMatchObject({ usado: 6, limite: 5, estado: 'excede' })
    expect(fila(ls, 'suma')?.estado).not.toBe('excede')
    expect(resumenDeLimites(ls).rebasados.map((l) => l.id)).toEqual(['atq'])
  })

  it('el presupuesto de stats suma el impuesto de efecto: con un efecto fuerte la misma suma ya se pasa', () => {
    const fuerte = efecto({ verbo: 'destroy' })
    const sin = limitesDeCarta(campeon({ stats: { atq: 4, res: 4 } }))
    expect(fila(sin, 'suma')).toMatchObject({ usado: 8, limite: 8, estado: 'limite' })
    const con = limitesDeCarta(campeon({ stats: { atq: 4, res: 4 }, efectos: Array(4).fill(fuerte) }))
    const suma = fila(con, 'suma')!
    expect(suma.estado).toBe('excede')
    expect(suma.usado).toBeGreaterThan(8)
    expect(suma.detalle).toMatch(/impuesto de efecto/)
    expect(suma.detalle).toMatch(/Se pasa por/)
  })

  it('el tabú: una carta de coste 2 con dos reglas de nivel 2 se pasa de su máximo', () => {
    const ls = limitesDeCarta(campeon({ coste: 2, stats: { atq: 3, res: 3 }, efectos: [efecto({ verbo: 'double_attack' }), efecto({ verbo: 'fix_exhaust' })] }))
    const tabu = fila(ls, 'tabu')!
    expect(tabu.estado).toBe('excede')
    expect(tabu.usado).toBeGreaterThan(tabu.limite ?? 0)
    expect(tabu.detalle).toMatch(/Se pasa por/)
  })

  it('el tope de efecto por coste: un índice 8 en coste 2 (tope 4) excede', () => {
    const ls = limitesDeCarta(campeon({ coste: 2, stats: { atq: 3, res: 3 }, efectos: Array(3).fill(efecto({ verbo: 'destroy' })) }))
    const e = fila(ls, 'efecto-por-coste')!
    expect(e.estado).toBe('excede')
    expect(e.limite).toBe(4)
  })

  it('el coste mínimo por verbo: destroy pide coste 3 y una carta de coste 1 lo rebasa', () => {
    const ls = limitesDeCarta(campeon({ coste: 1, stats: { atq: 2, res: 2 }, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(fila(ls, 'verbo-por-coste')).toMatchObject({ estado: 'excede', limite: 3, usado: 1 })
    expect(fila(ls, 'verbo-por-coste')?.detalle).toMatch(/destroy pide coste 3/)
  })
})

describe('limitesDeCarta · lo que le falta', () => {
  it('una suma por debajo del mínimo es «bajo» (carta regalada), y no cuenta como rebasar', () => {
    const ls = limitesDeCarta(campeon({ stats: { atq: 1, res: 1 } })) // coste 3: mínimo 6
    const minima = fila(ls, 'suma-minima')!
    expect(minima).toMatchObject({ estado: 'bajo', usado: 2, limite: 6 })
    const r = resumenDeLimites(ls)
    expect(r.bajoMinimo.map((l) => l.id)).toEqual(['suma-minima'])
    expect(r.rebasados).toEqual([])
  })
})

describe('limitesDeCarta · élites (Soberano, Emperador, Única): más presupuesto, no exención', () => {
  it('Aurora usa casi todo su presupuesto de 21 (18 de stats + 2.6 de impuesto) y queda «en el límite» de suma y de tabú', () => {
    const ls = limitesDeCarta(real('FB-010'))
    expect(fila(ls, 'suma')).toMatchObject({ usado: 20.6, limite: 21, estado: 'limite' })
    expect(fila(ls, 'atq')).toMatchObject({ usado: 9, limite: 14, estado: 'dentro' })
    expect(fila(ls, 'tabu')).toMatchObject({ usado: 6, limite: 6.1, estado: 'limite' })
    expect(fila(ls, 'suma')?.detalle).toMatch(/élite/)
    expect(resumenDeLimites(ls).rebasados).toEqual([])
  })

  it('una élite NO tiene el tope plano de efecto por coste, y lo dice en vez de omitir la fila', () => {
    const e = fila(limitesDeCarta(real('FB-010')), 'efecto-por-coste')!
    expect(e).toMatchObject({ estado: 'sin-limite', limite: null })
    expect(e.detalle).toMatch(/presupuesto de stats y en el de tabú/)
  })

  it('una élite que se pasa de su presupuesto SÍ rebasa', () => {
    const ls = limitesDeCarta(campeon({ coste: 4, roles: ['Soberano'], rareza: 'Única', stats: { atq: 12, res: 12 } }))
    expect(fila(ls, 'suma')?.estado).toBe('excede') // 24 contra 21
  })
})

describe('limitesDeCarta · cartas que no son Campeón', () => {
  it('una Mística no tiene stats: solo tabú y efecto por coste', () => {
    const ls = limitesDeCarta(campeon({ tipo: 'Mística', stats: null, coste: 3, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(ls.map((l) => l.id)).toEqual(['tabu', 'efecto-por-coste'])
    // Con coste 2 el verbo destroy (coste mínimo 3) sí se rebasa, también en una Mística
    const barata = limitesDeCarta(campeon({ tipo: 'Mística', stats: null, coste: 2, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(fila(barata, 'verbo-por-coste')?.estado).toBe('excede')
  })

  it('coste 0 (Vínculo): sin presupuesto de tabú, y lo dice', () => {
    const ls = limitesDeCarta(campeon({ tipo: 'Vínculo', stats: null, coste: 0 }))
    expect(fila(ls, 'tabu')).toMatchObject({ estado: 'sin-limite', limite: null })
  })
})

describe('resumenDeLimites', () => {
  it('separa lo que rebasa, lo que no alcanza y lo que está al límite', () => {
    const r = resumenDeLimites([
      { id: 'atq', etiqueta: 'a', usado: 1, limite: 1, estado: 'excede', detalle: '' },
      { id: 'res', etiqueta: 'b', usado: 1, limite: 1, estado: 'limite', detalle: '' },
      { id: 'suma-minima', etiqueta: 'c', usado: 1, limite: 1, estado: 'bajo', detalle: '' },
      { id: 'tabu', etiqueta: 'd', usado: 1, limite: 9, estado: 'dentro', detalle: '' },
    ])
    expect([r.rebasados.length, r.enLimite.length, r.bajoMinimo.length]).toEqual([1, 1, 1])
  })

  it('usa el criterio de «cerca del tope» de la config', () => {
    const cfg = structuredClone(CONFIG_V1)
    cfg.analisis.cercaDelTope = 3
    expect(fila(limitesDeCarta(campeon({ stats: { atq: 3, res: 3 } }), cfg), 'suma')?.estado).toBe('limite') // 6 de 8: a 2 del tope
    expect(fila(limitesDeCarta(campeon({ stats: { atq: 3, res: 3 } })), 'suma')?.estado).toBe('dentro')
  })
})
