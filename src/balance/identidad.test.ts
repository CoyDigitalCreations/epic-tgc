import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { clasificarEfecto, clasificarVerbo, resumenIdentidad } from './identidad'
import type { EfectoBalance } from './tipos'

const carga = cargarCartas(ALL_CARDS)

const efecto = (parcial: Partial<EfectoBalance> = {}): EfectoBalance => ({
  verbo: 'destroy',
  sinVerbo: false,
  verbosTramos: [],
  tipo: 'hechizo',
  trigger: null,
  objetivoTipo: null,
  duracion: null,
  costoTipo: null,
  costoCantidad: 0,
  activacion: null,
  keywordsConcedidas: [],
  esComandante: false,
  ...parcial,
})

describe('clasificarVerbo', () => {
  it('S6.1: destroy es identidad en Disonancia y fuera de identidad en Estásis', () => {
    expect(clasificarVerbo('destroy', 'disonancia')).toBe('identidad')
    expect(clasificarVerbo('destroy', 'estasis')).toBe('fuera')
  })

  it('S6.2: toggle_exhaust y fix_exhaust son identidad en Estásis (control de Éter)', () => {
    expect(clasificarVerbo('toggle_exhaust', 'estasis')).toBe('identidad')
    expect(clasificarVerbo('fix_exhaust', 'estasis')).toBe('identidad')
  })

  it('block_ether es fuera de identidad en Disonancia', () => {
    expect(clasificarVerbo('block_ether', 'disonancia')).toBe('fuera')
  })

  it('los verbos neutrales lo son en los dos mazos', () => {
    for (const mazo of ['estasis', 'disonancia'] as const) {
      expect(clasificarVerbo('buff', mazo)).toBe('neutral')
      expect(clasificarVerbo('grant_keyword', mazo)).toBe('neutral')
    }
  })

  it('S6.4: un verbo ausente del mapa es neutral y no lanza', () => {
    expect(clasificarVerbo('verbo_inventado', 'estasis')).toBe('neutral')
    expect(clasificarVerbo('verbo_inventado', 'disonancia')).toBe('neutral')
  })

  it('cambiar el mapa de la config cambia la clasificación', () => {
    const alterada = structuredClone(CONFIG_V1)
    alterada.identidad.disonancia.identidad = alterada.identidad.disonancia.identidad.filter((v) => v !== 'destroy')
    expect(clasificarVerbo('destroy', 'disonancia', alterada)).toBe('neutral')
  })
})

describe('clasificarEfecto', () => {
  it('usa el verbo del efecto', () => {
    expect(clasificarEfecto(efecto({ verbo: 'destroy' }), 'disonancia')).toBe('identidad')
  })

  it('un efecto sin verbo es neutral', () => {
    expect(clasificarEfecto(efecto({ verbo: null, sinVerbo: true }), 'estasis')).toBe('neutral')
  })

  it('un efecto con tramos se clasifica por los verbos de sus tramos (Cassandra)', () => {
    const cassandra = carga.cartas.find((c) => c.id === 'FB-016')
    expect(cassandra?.efectos[0].verbo).toBeNull()
    expect(clasificarEfecto(cassandra!.efectos[0], 'estasis')).toBe('identidad')
    expect(clasificarEfecto(cassandra!.efectos[0], 'disonancia')).toBe('fuera')
  })

  it('si los tramos mezclan, gana la identidad y después lo fuera de identidad', () => {
    const mixto = efecto({ verbo: null, verbosTramos: ['destroy', 'block_ether'] })
    expect(clasificarEfecto(mixto, 'disonancia')).toBe('identidad')
    const ajeno = efecto({ verbo: null, verbosTramos: ['buff', 'block_ether'] })
    expect(clasificarEfecto(ajeno, 'disonancia')).toBe('fuera')
  })
})

describe('resumenIdentidad', () => {
  it('S6.3: cada mazo del seed tiene un porcentaje entre 0 y 100 y los conteos suman el total', () => {
    for (const mazo of ['estasis', 'disonancia'] as const) {
      const r = resumenIdentidad(carga[mazo], mazo)
      expect(r.porcentaje).toBeGreaterThanOrEqual(0)
      expect(r.porcentaje).toBeLessThanOrEqual(100)
      expect(r.identidad + r.neutral + r.fuera).toBe(r.total)
      expect(r.total).toBe(carga[mazo].reduce((n, c) => n + c.efectos.length, 0))
    }
  })

  it('el porcentaje es identidad / total de efectos', () => {
    const cartas = [
      { ...carga.cartas[0], efectos: [efecto({ verbo: 'destroy' }), efecto({ verbo: 'buff' })] },
      { ...carga.cartas[0], efectos: [efecto({ verbo: 'exile' }), efecto({ verbo: 'block_ether' })] },
    ]
    const r = resumenIdentidad(cartas, 'disonancia')
    expect(r).toMatchObject({ identidad: 2, neutral: 1, fuera: 1, total: 4, porcentaje: 50 })
  })

  it('un mazo sin efectos da 0 por ciento, sin NaN', () => {
    expect(resumenIdentidad([], 'estasis')).toEqual({ identidad: 0, neutral: 0, fuera: 0, total: 0, porcentaje: 0 })
  })

  it('S6.3: cambiar el mapa de la config cambia el porcentaje', () => {
    const alterada = structuredClone(CONFIG_V1)
    alterada.identidad.disonancia.identidad = []
    const antes = resumenIdentidad(carga.disonancia, 'disonancia').porcentaje
    const despues = resumenIdentidad(carga.disonancia, 'disonancia', alterada).porcentaje
    expect(antes).toBeGreaterThan(0)
    expect(despues).toBe(0)
  })

  it('es determinista', () => {
    expect(resumenIdentidad(carga.estasis, 'estasis')).toEqual(resumenIdentidad(carga.estasis, 'estasis'))
  })
})
