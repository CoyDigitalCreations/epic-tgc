import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import type { AnyCard } from '../shared/types'
import { efectosComandante } from '../shared/efectoComandante'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { CARTAS_DS_ANTES } from './test/cartasReales'

const carga = cargarCartas(ALL_CARDS)

describe('cargarCartas con el seed real', () => {
  it('carga las 66 cartas separadas por mazo', () => {
    // Rediseño de Estásis: +1 carta (FB-033 Runa de Ancla)
    expect(carga.cartas).toHaveLength(66)
    expect(carga.estasis).toHaveLength(33)
    expect(carga.disonancia).toHaveLength(33)
    expect(carga.estasis.length + carga.disonancia.length).toBe(66)
  })

  it('cuenta los efectos de la lista y los comandantes', () => {
    const delSeed = ALL_CARDS.reduce(
      (n, c) => n + (c.efectos?.length ?? 0) + (c.type === 'Campeón' ? efectosComandante(c.efectoComandante).length : 0),
      0,
    )
    expect(carga.totalEfectos).toBe(delSeed)
    // Aurora (2: +2/+2 y Disparo sin agotar) y Ragnar (2: +3 ATQ y Peaje). Antes Ragnar tenía 1 (Indestructible a todos): eran 3.
    expect(carga.cartas.flatMap((c) => c.efectos).filter((e) => e.esComandante)).toHaveLength(4)
  })

  it('extrae los 20 Campeones con stats numéricos', () => {
    expect(carga.campeones).toHaveLength(20)
    for (const c of carga.campeones) {
      expect(c.stats).not.toBeNull()
      expect(typeof c.stats?.atq).toBe('number')
      expect(typeof c.stats?.res).toBe('number')
    }
    const elena = carga.campeones.find((c) => c.id === 'FB-015')
    expect(elena?.stats).toEqual({ atq: 4, res: 2 })
    expect(elena?.coste).toBe(3)
    expect(elena?.mazo).toBe('estasis')
  })

  it('Aurora lleva DOS efectos de Comandante (arreglo) y todos los verbos del seed tienen peso, sin avisos de duración nueva', () => {
    const aurora = carga.cartas.find((c) => c.id === 'FB-010')
    expect(aurora?.efectos.filter((e) => e.esComandante).map((e) => e.verbo)).toEqual(['buff', 'modificar_regla'])
    expect(aurora?.efectos.map((e) => e.verbo)).toEqual(['activar_disparo', 'modificar_regla', 'buff', 'modificar_regla'])
    const verbos = new Set(carga.cartas.flatMap((c) => c.efectos.flatMap((e) => (e.verbo ? [e.verbo] : e.verbosTramos))))
    expect(verbos).toContain('anclar_eter')
    for (const v of verbos) expect(CONFIG_V1.poder.verbo, v).toHaveProperty(v)
    expect(carga.avisos.filter((a) => a.includes('mientras_tenga_eter_bloqueado'))).toEqual([])
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

  it('expone las keywords propias de la carta', () => {
    const k = (id: string) => carga.cartas.find((c) => c.id === id)?.keywords
    expect(k('FB-010')).toEqual(['Inmortal'])
    expect(k('DS-010')).toEqual(['Indestructible'])
    expect(k('FB-024')).toEqual(['Artefacto', 'Presteza'])
    expect(k('FB-012')).toEqual([])
  })

  it('expone la keyword concedida por grant_keyword (también en el comandante)', () => {
    // Ragnar de antes (Lote 2): su continuo y su Comandante daban Indestructible. El nuevo ya no concede keywords; la concedida por un
    // efecto de Éter bloqueado la ilustra DS-009 (Tirador).
    const ragnarAntes = CARTAS_DS_ANTES.find((c) => c.id === 'DS-010')
    expect(ragnarAntes?.efectos.flatMap((e) => e.keywordsConcedidas)).toEqual(['Indestructible', 'Indestructible'])
    expect(carga.cartas.find((c) => c.id === 'DS-010')?.efectos.flatMap((e) => e.keywordsConcedidas)).toEqual([])
    expect(carga.cartas.find((c) => c.id === 'DS-009')?.efectos.flatMap((e) => e.keywordsConcedidas)).toEqual(['Tirador'])
    const vigor = carga.cartas.find((c) => c.id === 'FB-002')
    expect(vigor?.efectos[0].keywordsConcedidas).toEqual(['Vigor'])
    expect(carga.cartas.find((c) => c.id === 'FB-012')?.efectos.every((e) => e.keywordsConcedidas.length === 0)).toBe(true)
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

  it('avisa de una keyword desconocida en la carta o concedida, sin lanzar', () => {
    const r = cargarCartas([
      {
        ...base,
        type: 'Campeón',
        keywords: ['Rarísima'],
        stats: { cost: 2, poder: 3, resistencia: 3 },
        efectos: [{ tipo: 'pasivo', efecto: 'grant_keyword', keyword: 'Misteriosa' }],
      } as unknown as AnyCard,
    ])
    expect(r.cartas[0].keywords).toEqual(['Rarísima'])
    expect(r.avisos.some((a) => a.includes('Rarísima'))).toBe(true)
    expect(r.avisos.some((a) => a.includes('Misteriosa'))).toBe(true)
  })

  it('deja el mazo en null si el paquete no es de los dos conocidos', () => {
    const r = cargarCartas([{ ...base, paqueteId: 'otro', type: 'Éter', stats: { cost: 1 } } as unknown as AnyCard])
    expect(r.cartas[0].mazo).toBeNull()
    expect(r.estasis).toHaveLength(0)
    expect(r.disonancia).toHaveLength(0)
  })
})

describe('cargarCartas: datos que alimentan el índice de tabú', () => {
  const efectosDe = (id: string) => carga.cartas.find((c) => c.id === id)?.efectos ?? []

  it('conserva la regla enumerada, la regla del catálogo y los controladores del objetivo', () => {
    expect(efectosDe('DS-010').map((e) => e.reglaEnumerada)).toEqual([undefined, 'olvido_rival', undefined, 'peaje_bloqueo'])
    expect(efectosDe('DS-033').map((e) => e.reglaCatalogo)).toEqual(['rupturasPorTurno', 'atacarTrasRuptura'])
    expect(efectosDe('DS-006')[0]).toMatchObject({ objetivoControlador: 'rival' })
    expect(efectosDe('FB-023')[0]).toMatchObject({ controladorDestino: 'dueno' })
  })

  it('conserva las opciones de Resonancia y el alcance del reagrupe de Aurora', () => {
    expect(efectosDe('FB-010')[0]).toMatchObject({ sinPagarCosto: true, sinAgotar: true })
    expect(efectosDe('FB-010')[1]).toMatchObject({ reagruparAlcance: 'todo' })
  })

  it('solo agrega los campos cuando el seed los declara (un efecto simple no cambia de forma)', () => {
    const simple = efectosDe('FB-004')[0]
    for (const campo of ['reglaEnumerada', 'reglaCatalogo', 'sinPagarCosto', 'sinAgotar', 'reagruparAlcance', 'controladorDestino']) {
      expect(campo in simple, campo).toBe(false)
    }
  })
})
