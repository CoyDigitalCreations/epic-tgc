import { describe, it, expect } from 'vitest'
import { CONFIG_V1 } from './config'
import { costeMinimoDeVerbo, evaluarEfectoPorCoste, motivoEfectoPorCoste } from './efectoPorCoste'
import type { CartaBalance, ConfigBalance, EfectoBalance } from './tipos'

const efecto = (parcial: Partial<EfectoBalance> = {}): EfectoBalance => ({
  verbo: 'buff',
  sinVerbo: false,
  verbosTramos: [],
  tipo: 'pasivo',
  trigger: null,
  objetivoTipo: 'self',
  duracion: null,
  costoTipo: null,
  costoCantidad: 0,
  activacion: null,
  keywordsConcedidas: [],
  esComandante: false,
  ...parcial,
})

const carta = (parcial: Partial<CartaBalance> = {}): CartaBalance => ({
  id: 'T-001',
  nombre: 'Prueba',
  tipo: 'Campeón',
  rareza: 'Común',
  coste: 2,
  mazo: 'disonancia',
  roles: [],
  stats: { atq: 2, res: 3 },
  keywords: [],
  efectos: [],
  ...parcial,
})

/** Un efecto «buff» (peso 1) por cada punto de índice pedido. */
const conIndice = (n: number): EfectoBalance[] => Array.from({ length: n }, () => efecto())

const conCfg = (cambio: (c: ConfigBalance) => void): ConfigBalance => {
  const copia = structuredClone(CONFIG_V1)
  cambio(copia)
  return copia
}

describe('costeMinimoDeVerbo', () => {
  it('usa ceil(peso del verbo)', () => {
    expect(costeMinimoDeVerbo('buff')).toBe(1)
    expect(costeMinimoDeVerbo('destroy')).toBe(3)
    expect(costeMinimoDeVerbo('steal_champion')).toBe(4)
    expect(costeMinimoDeVerbo('invocar_y_equipar')).toBe(3)
    expect(costeMinimoDeVerbo('scry')).toBe(1)
  })

  it('un verbo desconocido pesa como el fallback', () => {
    expect(costeMinimoDeVerbo('inventado')).toBe(Math.ceil(CONFIG_V1.poder.fallback))
  })

  it('el override de la config gana sobre la fórmula', () => {
    const cfg = conCfg((c) => {
      c.costeMinimoVerbo = { destroy: 5, buff: 0 }
    })
    expect(costeMinimoDeVerbo('destroy', cfg)).toBe(5)
    expect(costeMinimoDeVerbo('buff', cfg)).toBe(0)
    expect(costeMinimoDeVerbo('exile', cfg)).toBe(3)
  })
})

describe('evaluarEfectoPorCoste: tope de efecto', () => {
  it('el tope es coste × poderPorCoste', () => {
    expect(evaluarEfectoPorCoste(carta({ coste: 3 })).indiceMax).toBe(3 * CONFIG_V1.poderPorCoste)
  })

  it('un Campeón bajo el tope está ok', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(3) }))
    expect(ev).toMatchObject({ indiceMax: 4, indice: 3, excesoIndice: 0, verbosBajoCosto: [], exento: false, ok: true })
  })

  it('justo en el tope sigue ok', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(4) }))
    expect(ev.indice).toBe(4)
    expect(ev.excesoIndice).toBe(0)
    expect(ev.ok).toBe(true)
  })

  it('sobre el tope falla y mide el exceso', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(5) }))
    expect(ev).toMatchObject({ indiceMax: 4, indice: 5, excesoIndice: 1, aplicaTope: true, ok: false })
  })

  it('un Campeón exento reporta el exceso pero nunca falla', () => {
    const soberano = evaluarEfectoPorCoste(carta({ coste: 2, roles: ['Soberano'], efectos: conIndice(8) }))
    expect(soberano).toMatchObject({ exento: true, aplicaTope: false, excesoIndice: 4, ok: true })
    const unica = evaluarEfectoPorCoste(carta({ coste: 2, rareza: 'Única', efectos: conIndice(8) }))
    expect(unica).toMatchObject({ exento: true, ok: true })
  })

  it('un exento no falla ni por verbo bajo su coste', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 1, roles: ['Soberano'], efectos: [efecto({ verbo: 'destroy' })] }))
    expect(ev.verbosBajoCosto).toEqual([{ verbo: 'destroy', costeMinimo: 3 }])
    expect(ev.ok).toBe(true)
  })

  it('el tope es estricto también para las cartas que no son Campeón, sin la tolerancia del semáforo', () => {
    const ev = evaluarEfectoPorCoste(carta({ tipo: 'Mística', stats: null, coste: 2, efectos: conIndice(8) }))
    expect(ev).toMatchObject({ aplicaTope: true, excesoIndice: 4, ok: false })
    // 5 sobre un tope de 4 queda dentro de la tolerancia 1.5 del semáforo, pero aquí ya falla.
    for (const tipo of ['Éter', 'Mística', 'Arcana', 'Vínculo'] as const) {
      expect(evaluarEfectoPorCoste(carta({ tipo, stats: null, coste: 2, efectos: conIndice(5) })).ok, tipo).toBe(false)
      expect(evaluarEfectoPorCoste(carta({ tipo, stats: null, coste: 2, efectos: conIndice(4) })).ok, tipo).toBe(true)
    }
  })

  it('coste 0 se omite', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 0, efectos: [efecto({ verbo: 'destroy' }), ...conIndice(9)] }))
    expect(ev).toMatchObject({ indiceMax: null, excesoIndice: 0, verbosBajoCosto: [], ok: true })
  })

  it('el tope sigue a poderPorCoste de la config', () => {
    const cfg = conCfg((c) => {
      c.poderPorCoste = 3
    })
    const ev = evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(5) }), cfg)
    expect(ev.indiceMax).toBe(6)
    expect(ev.ok).toBe(true)
  })
})

describe('evaluarEfectoPorCoste: coste mínimo por verbo', () => {
  it('un verbo bajo su coste mínimo falla en cualquier tipo de carta', () => {
    const ev = evaluarEfectoPorCoste(carta({ tipo: 'Mística', stats: null, coste: 2, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(ev.verbosBajoCosto).toEqual([{ verbo: 'destroy', costeMinimo: 3 }])
    expect(ev.ok).toBe(false)
  })

  it('en el coste mínimo exacto está ok', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 3, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(ev.verbosBajoCosto).toEqual([])
    expect(ev.ok).toBe(true)
  })

  it('cuenta los verbos de tramos y los de comandante, sin repetir', () => {
    const ev = evaluarEfectoPorCoste(
      carta({
        coste: 1,
        efectos: [
          efecto({ verbo: null, verbosTramos: ['steal_champion', 'buff'] }),
          efecto({ verbo: 'steal_champion', esComandante: true, tipo: 'comandante' }),
        ],
      }),
    )
    expect(ev.verbosBajoCosto).toEqual([{ verbo: 'steal_champion', costeMinimo: 4 }])
  })

  it('un override más alto o más bajo cambia el resultado', () => {
    const base = carta({ coste: 3, efectos: [efecto({ verbo: 'destroy' })] })
    const sube = conCfg((c) => {
      c.costeMinimoVerbo = { destroy: 5 }
    })
    expect(evaluarEfectoPorCoste(base, sube).verbosBajoCosto).toEqual([{ verbo: 'destroy', costeMinimo: 5 }])
    const baja = conCfg((c) => {
      c.costeMinimoVerbo = { destroy: 1 }
    })
    expect(evaluarEfectoPorCoste({ ...base, tipo: 'Mística', stats: null, coste: 1 }, baja).verbosBajoCosto).toEqual([])
  })
})

describe('motivoEfectoPorCoste', () => {
  it('es null si la carta pasa, está exenta o no tiene coste', () => {
    expect(motivoEfectoPorCoste(evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(3) })))).toBeNull()
    expect(motivoEfectoPorCoste(evaluarEfectoPorCoste(carta({ coste: 2, roles: ['Soberano'], efectos: conIndice(8) })))).toBeNull()
    expect(motivoEfectoPorCoste(evaluarEfectoPorCoste(carta({ coste: 0, efectos: conIndice(8) })))).toBeNull()
  })

  it('cita índice y tope cuando se pasa', () => {
    expect(motivoEfectoPorCoste(evaluarEfectoPorCoste(carta({ coste: 2, efectos: conIndice(5) })))).toBe('índice 5 > tope 4')
  })

  it('cita el verbo y su coste mínimo', () => {
    const ev = evaluarEfectoPorCoste(carta({ tipo: 'Mística', stats: null, coste: 2, efectos: [efecto({ verbo: 'destroy' })] }))
    expect(motivoEfectoPorCoste(ev)).toBe('verbo destroy pide coste 3')
  })

  it('une los motivos si fallan los dos chequeos', () => {
    const ev = evaluarEfectoPorCoste(carta({ coste: 1, efectos: [efecto({ verbo: 'destroy' }), ...conIndice(2)] }))
    expect(motivoEfectoPorCoste(ev)).toBe('índice 5 > tope 2; verbo destroy pide coste 3')
  })
})
