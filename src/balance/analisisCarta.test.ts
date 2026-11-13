import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from './test/seedClasico'
import { analizarCarta, contextoDeAnalisis, desgloseDePoder, estadoDeCarta, margenesDeStats, razonesDeCarta, textosDeEfectos } from './analisisCarta'
import type { ContextoAnalisis, MargenStat } from './analisisCarta'
import { CONFIG_V1 } from './config'
import { poolLetalidad, techosDelPool } from './letalidad'
import { semaforoDe } from './metricas'
import { evaluarEfectoPorCoste } from './efectoPorCoste'
import { poderDeCarta } from './poderEfecto'
import { esExento } from './presupuesto'
import type { CartaBalance } from './tipos'
import { CARTAS, CARTAS_ANTES, CARTAS_DS_ANTES, CARTAS_ELENA_32, TEXTO_ISOLDE_LEGADO, carta, legado, legadoDS } from './test/cartasReales'
import { efectosComandante } from '../shared/efectoComandante'

const pool = poolLetalidad(CARTAS)
const ctx: ContextoAnalisis = { pool, techos: techosDelPool(pool), ajustes: new Map() }
// Pool con la Disonancia de ANTES del rediseño (Lote 2): los casos «Marek pegado al tope», «Draven sobre el máximo», «Ragnar con Indestructible»
// se apoyaban en esas cartas; tras el rediseño las reales ya caben en banda (mismo criterio que legado() para Estásis)
const poolDS = poolLetalidad(CARTAS_DS_ANTES)
const ctxDS: ContextoAnalisis = { pool: poolDS, techos: techosDelPool(poolDS), ajustes: new Map() }

const porStat = (nombre: string | CartaBalance, cfg = CONFIG_V1, contexto = ctx): Record<MargenStat['stat'], MargenStat> => {
  const m = margenesDeStats(typeof nombre === 'string' ? carta(nombre) : nombre, contexto, cfg)
  const buscar = (s: MargenStat['stat']) => {
    const x = m.find((y) => y.stat === s)
    if (!x) throw new Error(`Falta el margen ${s} de ${nombre}`)
    return x
  }
  return { atq: buscar('atq'), res: buscar('res'), suma: buscar('suma') }
}

describe('margenesDeStats: estados', () => {
  // Elena real es ahora 4/2 (suma 6, dentro de la banda de coste 3). Los números de estos casos son los de la Elena 3/0 de antes.
  it('S1.1: Elena (3/0, coste 3) queda bajo banda y semaforoDe no cambia', () => {
    const { suma } = porStat(legado('Elena'))
    expect(suma.estado).toBe('bajo')
    expect(suma.texto).toBe('Bajo banda: puede subir')
    // Bandas v1.1: coste 3 = 6-8. Con el tope de costo del 50 % el efecto de Elena vale 2.3 (antes 0.85) y paga un impuesto de 0.1,
    // así que su suma máxima es 7.9 y le faltan 4.9 (antes 5): misma intención, el número sigue al índice nuevo.
    expect(suma.holgura).toBe(CONFIG_V1.bandas[3].sumaMax - 0.1 - 3)
    expect(semaforoDe(legado('Elena'))).toEqual({ desvio: 0, semaforo: 'verde' })
  })

  it('S1.1b: la Elena de antes (3/2, suma 5) sigue bajo banda y la real (4/2, suma 6) ya entra en la banda', () => {
    expect(porStat(legado('Elena 3/2')).suma.estado).toBe('bajo')
    expect(porStat('Elena').suma.estado).toBe('verde')
  })

  // Con las bandas v1.1 (coste 3 = 6-8, coste 4 = 8-10) ya no hay cartas reales bajo banda salvo Elena.
  // Para seguir probando que la banda y semaforoDe son ejes distintos, se bajan los stats a 2/2 (suma 4).
  it.each(['Seraphina', 'Cassandra', 'Varek', 'Thane'])('S1.2: %s con stats 2/2 queda bajo banda aunque semaforoDe la marque verde', (n) => {
    const base = carta(n)
    const baja: CartaBalance = { ...base, stats: { atq: 2, res: 2 } }
    expect(margenesDeStats(base, ctx).find((m) => m.stat === 'suma')?.estado).not.toBe('bajo')
    expect(margenesDeStats(baja, ctx).find((m) => m.stat === 'suma')?.estado).toBe('bajo')
    expect(semaforoDe(baja).semaforo).toBe('verde')
  })

  // La Isolde real (3/6, coste 4) ya cabe; el caso «excede el tope de RES» se conserva con la Isolde de antes (3/7, coste 3, destroy).
  it('S1.3: Isolde (3/7) excede el tope de RES por 2 y su ATQ queda verde', () => {
    const { atq, res, suma } = porStat(legado('Isolde'))
    expect(res.estado).toBe('rojo')
    expect(res.tope).toBe(5)
    expect(res.holgura).toBe(-2)
    expect(res.puedeSubir).toBe(0)
    expect(atq.estado).toBe('verde')
    // Con el impuesto de su efecto (1) la suma máxima baja a 7 (8 - 1) y 10 la pasa.
    expect(suma.tope).toBe(7)
    expect(suma.estado).toBe('rojo')
  })

  it('S1.4: una carta dentro de rango (Rowena 3/6, coste 4) es verde en los tres', () => {
    const { atq, res, suma } = porStat('Rowena')
    expect([atq.estado, res.estado, suma.estado]).toEqual(['verde', 'verde', 'verde'])
    expect(suma.holgura).toBeGreaterThanOrEqual(0)
  })

  it('S1.5: Aurora y Ragnar son exentas, con su tope propio 18/9/9 y sin rojo ni bajo', () => {
    for (const n of ['Aurora', 'Ragnar']) {
      const { atq, res, suma } = porStat(n)
      expect([atq.estado, res.estado, suma.estado]).toEqual(['exenta', 'exenta', 'exenta'])
      expect([atq.tope, res.tope, suma.tope]).toEqual([9, 9, 18])
      expect([atq.puedeSubir, res.puedeSubir, suma.puedeSubir]).toEqual([null, null, null])
    }
  })

  it('S1.6: un stat con holgura <= cercaDelTope es amarillo con «Cerca del tope» (Marek, ATQ 5 con tope 5 del coste 3)', () => {
    const { atq } = porStat(legadoDS('Marek'), CONFIG_V1, ctxDS) // la Marek de antes (5/4); hoy es 4/3
    expect(atq.holgura).toBe(0)
    expect(atq.estado).toBe('amarillo')
    expect(atq.texto).toBe('Cerca del tope')
  })

  it('S9.5: otra config.analisis.cercaDelTope cambia el estado (Rowena, RES con holgura 1)', () => {
    expect(porStat('Rowena').res.estado).toBe('verde')
    const cfg = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: 1.5 } }
    expect(porStat('Rowena', cfg).res.estado).toBe('amarillo')
  })

  it('frontera de cercaDelTope en ATQ/RES: holgura igual al umbral es amarillo y apenas mayor es verde', () => {
    const { atq, res } = porStat('Rowena')
    for (const m of [atq, res]) {
      expect(m.holgura).toBeGreaterThan(0)
      const igual = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: m.holgura } }
      const menor = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: m.holgura - 0.01 } }
      expect(porStat('Rowena', igual)[m.stat as 'atq' | 'res'].estado, m.stat).toBe('amarillo')
      expect(porStat('Rowena', menor)[m.stat as 'atq' | 'res'].estado, m.stat).toBe('verde')
    }
  })

  it('frontera de cercaDelTope en la suma: holgura igual al umbral es amarillo y apenas mayor es verde', () => {
    const { suma } = porStat('Rowena')
    expect(suma.holgura).toBeGreaterThan(0)
    const igual = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: suma.holgura } }
    const menor = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: suma.holgura - 0.01 } }
    expect(porStat('Rowena', igual).suma.estado).toBe('amarillo')
    expect(porStat('Rowena', menor).suma.estado).toBe('verde')
  })

  it('Mira de antes (FB-012, 4/4, coste 2) pasa el máximo de 6 de las bandas v1.1: «excede»', () => {
    const mira = legado('Mira')
    expect(mira.stats).toEqual({ atq: 4, res: 4 })
    const { suma } = porStat(mira)
    expect(suma.tope).toBe(CONFIG_V1.bandas[2].sumaMax)
    expect(suma.holgura).toBe(-2)
    expect(estadoDe(mira).estado).toBe('excede')
  })

  it('Mira con stats 3/3 (coste 2): suma 6 contra objetivo 6 queda «Cerca del tope», ATQ y RES verdes, en el límite y sin poder subir', () => {
    // La Mira de antes (4/4) ya se pasa con las bandas v1.1; se baja a 3/3 para mantener el caso de la suma exacta en el máximo.
    const mira: CartaBalance = { ...legado('Mira'), stats: { atq: 3, res: 3 } }
    const m = margenesDeStats(mira, ctx)
    const [atq, res, suma] = (['atq', 'res', 'suma'] as const).map((s) => m.find((x) => x.stat === s) as MargenStat)
    expect(suma.valor).toBe(6)
    expect(suma.tope).toBe(6)
    expect(suma.holgura).toBe(0)
    expect(suma.estado).toBe('amarillo')
    expect(suma.texto).toBe('Cerca del tope')
    expect(atq.estado).toBe('verde')
    expect(res.estado).toBe('verde')
    expect(suma.puedeSubir).toBe(0)
    expect(estadoDe(mira).estado).toBe('en-limite')
  })

  it('una carta sin stats no tiene márgenes', () => {
    const eter = CARTAS.find((c) => c.stats === null)
    expect(eter).toBeDefined()
    expect(margenesDeStats(eter!, ctx)).toEqual([])
  })
})

describe('margenesDeStats: puede subir', () => {
  it('S2.1: Elena puede subir 2 de ATQ, 5 de RES y 4.9 de suma (coste 3: tope 5, suma máxima 8 menos el impuesto 0.1)', () => {
    const { atq, res, suma } = porStat(legado('Elena'))
    expect([atq.holgura, res.holgura, suma.holgura]).toEqual([2, 5, 4.9])
    // puedeSubir son stats enteros: la suma 4.9 solo permite subir 4 (antes 5), y la RES queda en 4 por la suma
    expect([atq.puedeSubir, res.puedeSubir, suma.puedeSubir]).toEqual([2, 4, 4])
  })

  it('S2.2: una carta pegada al tope no puede subir', () => {
    const { atq, suma } = porStat(legadoDS('Marek'), CONFIG_V1, ctxDS)
    expect(atq.holgura).toBe(0)
    expect(atq.puedeSubir).toBe(0)
    expect(suma.puedeSubir).toBe(0)
  })

  it('S2.3: el impuesto rebaja la suma máxima (Draven, 4/4, impuesto 0.8): se pasa y no puede subir', () => {
    const { atq, suma } = porStat(legadoDS('Draven'), CONFIG_V1, ctxDS) // la Draven de antes (4/4); hoy es 3/3
    expect(suma.tope).toBe(5.2)
    expect(suma.holgura).toBe(-2.8)
    expect(suma.estado).toBe('rojo')
    expect(atq.holgura).toBe(0)
    expect(atq.puedeSubir).toBe(0)
  })

  it('redondea a 2 decimales antes de comparar (Marek, impuesto 0.3: 7.7 - 9 sería -1.2999999999999998, queda -1.3)', () => {
    expect(porStat(legadoDS('Marek'), CONFIG_V1, ctxDS).suma.holgura).toBe(-1.3)
  })
})

const estadoDe = (c: CartaBalance) => {
  const desglose = desgloseDePoder(c, [])
  return { desglose, ...estadoDeCarta(c, margenesDeStats(c, ctx), desglose) }
}

describe('desgloseDePoder', () => {
  it('S5.4: el desglose trae el índice, los efectos con sus componentes y las keywords impresas', () => {
    const aurora = carta('Aurora')
    const d = desgloseDePoder(aurora, [])
    expect(d.indice).toBe(poderDeCarta(aurora).indice)
    expect(d.efectos).toHaveLength(aurora.efectos.length)
    expect(d.keywords).toContainEqual({ keyword: 'Inmortal', peso: 2.5 })
    const efectos = d.efectos.reduce((n, e) => n + e.componentes.poder, 0)
    expect(d.totalBruto).toBe(efectos + d.keywords.reduce((n, k) => n + k.peso, 0))
  })

  it('S5.4: Ragnar muestra el peso de Indestructible por 1.5 como keyword concedida', () => {
    // Ragnar de antes: su Comandante daba Indestructible a todos. El nuevo (+3 ATQ y Peaje) ya no concede keywords.
    const d = desgloseDePoder(legadoDS('Ragnar'), [])
    expect(d.efectos.some((e) => e.componentes.keywords === 3)).toBe(true)
    expect(desgloseDePoder(carta('Ragnar'), []).efectos.some((e) => e.componentes.keywords > 0)).toBe(false)
  })

  it('S5.2: el trigger se muestra con el peso por defecto', () => {
    const d = desgloseDePoder(carta('Elena'), [])
    expect(d.efectos.length).toBeGreaterThan(0)
    for (const e of d.efectos) expect(e.componentes.trigger).toBe(CONFIG_V1.poder.fallback)
  })

  it('S5.5: el efecto de Comandante va al final con su texto y marca', () => {
    const conComandante = CARTAS.find((c) => c.efectos.some((e) => e.esComandante))
    expect(conComandante).toBeDefined()
    const textos = conComandante!.efectos.map((_, i) => `texto ${i}`)
    const d = desgloseDePoder(conComandante!, textos)
    const ultimo = d.efectos[d.efectos.length - 1]
    expect(ultimo.esComandante).toBe(true)
    expect(ultimo.texto).toBe(`texto ${textos.length - 1}`)
    // Aurora lleva DOS efectos de Comandante: forman un bloque al final y ninguno de los anteriores es de Comandante
    const nComandante = d.efectos.filter((e) => e.esComandante).length
    expect(d.efectos.slice(-nComandante).every((e) => e.esComandante)).toBe(true)
    expect(d.efectos.slice(0, d.efectos.length - nComandante).every((e) => !e.esComandante)).toBe(true)
  })

  it('S9.2: una carta sin efectos ni keywords da poder 0, desglose vacío y sin NaN', () => {
    const base = carta('Elena')
    const vacia: CartaBalance = { ...base, efectos: [], keywords: [] }
    const d = desgloseDePoder(vacia, [])
    expect(d.efectos).toEqual([])
    expect(d.indice).toBe(0)
    expect(d.totalBruto).toBe(0)
    expect(Number.isNaN(d.holgura)).toBe(false)
  })

  it('S9.3: un efecto sin verbo vale 0 y se marca; los verbos solo en tramos (Cassandra) no', () => {
    const base = carta('Elena')
    const sin: CartaBalance = {
      ...base,
      efectos: [{ ...base.efectos[0], verbo: null, sinVerbo: true, verbosTramos: [] }],
    }
    const d = desgloseDePoder(sin, [])
    expect(d.efectos[0].sinVerbo).toBe(true)
    expect(d.efectos[0].componentes.poder).toBe(0)

    const cass = desgloseDePoder(carta('Cassandra'), [])
    const conTramos = cass.efectos.find((e) => e.verbo === null)
    expect(conTramos).toBeDefined()
    expect(conTramos!.sinVerbo).toBe(false)
    expect(conTramos!.componentes.base).toBeGreaterThan(0)
  })

  it('S6.1: una carta sin stats se mide contra coste × poderPorCoste y la holgura es esperado − índice', () => {
    const eter = CARTAS.find((c) => c.tipo === 'Éter' && c.coste === 1)
    expect(eter).toBeDefined()
    const d = desgloseDePoder(eter!, [])
    expect(d.esperado).toBe(2)
    expect(d.holgura).toBe(Math.round((2 - d.indice) * 100) / 100)
  })

  it('un Campeón con stats no tiene poder esperado: se mide por presupuesto', () => {
    const d = desgloseDePoder(carta('Elena'), [])
    expect(d.esperado).toBeNull()
    expect(d.holgura).toBeNull()
  })

  it('S7.1: un Vínculo (coste 0) trae índice y desglose, pero no poder esperado', () => {
    const vinculos = CARTAS.filter((c) => c.tipo === 'Vínculo')
    expect(vinculos.length).toBeGreaterThan(0)
    for (const v of vinculos) {
      const d = desgloseDePoder(v, [])
      expect(d.esperado, v.id).toBeNull()
      expect(d.indice, v.id).toBe(poderDeCarta(v).indice)
    }
  })
})

describe('estadoDeCarta', () => {
  it('Isolde (de antes y la real) exceden, la Elena de antes queda bajo banda, la real y Rowena están dentro y Korr en el límite', () => {
    expect(estadoDe(legado('Isolde')).estado).toBe('excede')
    // Intención cambiada con el tope de costo del 50 %: la Isolde real (3/6, suma 9) llegaba justo a su máximo con impuesto 1.0
    // (en el límite); su índice sube de 4.00 a 4.75, el impuesto a 1.4 y ahora excede (máximo 8.6).
    expect(estadoDe(carta('Isolde')).estado).toBe('excede')
    expect(estadoDe(legado('Elena 3/2')).estado).toBe('bajo-banda')
    expect(estadoDe(legado('Elena 3/2')).etiqueta).toBe('Bajo banda: puede subir')
    expect(estadoDe(carta('Elena')).estado).toBe('dentro')
    expect(estadoDe(carta('Rowena')).estado).toBe('dentro')
    expect(estadoDe(carta('Korr')).estado).toBe('en-limite')
  })

  it('Aurora y Ragnar son exentas', () => {
    expect(estadoDe(carta('Aurora')).estado).toBe('exenta')
    expect(estadoDe(carta('Ragnar')).estado).toBe('exenta')
  })

  it('S6.2: una Mística no tiene márgenes y usa el color de semaforoDe', () => {
    const m = CARTAS.find((c) => c.tipo === 'Mística' && c.coste > 0)
    expect(m).toBeDefined()
    expect(margenesDeStats(m!, ctx)).toEqual([])
    const e = estadoDe(m!)
    const color = semaforoDe(m!).semaforo
    expect(e.estado).toBe(color === 'verde' ? 'dentro' : color === 'amarillo' ? 'en-limite' : 'excede')
    expect(e.desglose.esperado).toBe(m!.coste * CONFIG_V1.poderPorCoste)
  })

  it('S7.1/S7.2: ningún Vínculo tiene semáforo', () => {
    const vinculos = CARTAS.filter((c) => c.tipo === 'Vínculo')
    expect(vinculos.length).toBeGreaterThan(0)
    for (const v of vinculos) {
      expect(estadoDe(v).estado, v.id).toBe('sin-semaforo')
    }
  })
})

describe('contextoDeAnalisis', () => {
  it('calcula una vez el pool (18 Campeones no exentos de las 66), los techos y los ajustes', () => {
    const c = contextoDeAnalisis(CARTAS)
    expect(c.pool).toHaveLength(18)
    expect(c.techos).toEqual({ atq: 5, res: 6 })
    // Elena (4/2, suma 6) ya cabe en la banda de coste 3: sin ajuste. Con la Elena de antes (3/2) el ajuste exploratorio es 4/2.
    expect(c.ajustes.has('FB-015')).toBe(false)
    expect(contextoDeAnalisis(CARTAS_ELENA_32).ajustes.get('FB-015')?.despues).toEqual({ poder: 4, resistencia: 2 })
    // Vaela (5/2, coste 3) ya cabe; una carta sobre el máximo (Draven) sí tiene ajuste
    expect(c.ajustes.has('FB-011')).toBe(false)
    expect(contextoDeAnalisis(CARTAS_DS_ANTES).ajustes.has('DS-012')).toBe(true) // la Draven de antes (4/4)
    expect(c.ajustes.has('DS-012')).toBe(false) // la de hoy (3/3) ya cabe
    expect(c.ajustes.has('FB-013')).toBe(false)
  })

  it('S10.1: nunca incluye cartas de referencia, ni en el pool ni en los ajustes', () => {
    const vaela = carta('Vaela')
    const ref: CartaBalance = { ...carta('Elena'), id: 'PR-999', esReferencia: true }
    const refSana: CartaBalance = { ...vaela, id: 'PR-998', esReferencia: true }
    const c = contextoDeAnalisis([...CARTAS, ref, refSana])
    expect(c.pool).toHaveLength(18)
    expect(c.pool.some((x) => x.id.startsWith('PR-'))).toBe(false)
    expect([...c.ajustes.keys()].some((k) => k.startsWith('PR-'))).toBe(false)
  })

  it('no muta las cartas de entrada', () => {
    const copia = structuredClone(CARTAS)
    contextoDeAnalisis(CARTAS)
    expect(CARTAS).toEqual(copia)
  })
})

describe('textosDeEfectos', () => {
  const card = (id: string) => ALL_CARDS.find((c) => c.id === id)

  it('devuelve el texto de cada efecto, alineado por índice con el cargador (Isolde)', () => {
    expect(textosDeEfectos(card('FB-014'))).toEqual(['Puedes pagar 2 Éter, 1 Campeón que controles gana Inmortal, hasta el final del turno.'])
  })

  it('pone el texto del Comandante al final (Aurora)', () => {
    const aurora = card('FB-010')
    const textos = textosDeEfectos(aurora)
    expect(textos).toHaveLength(carta('Aurora').efectos.length)
    // Aurora lleva dos efectos de Comandante: sus textos van al final, en orden
    const comandantes = aurora && 'efectoComandante' in aurora ? efectosComandante(aurora.efectoComandante).map((e) => e.texto ?? null) : []
    expect(comandantes).toHaveLength(2)
    expect(comandantes.every((t) => t !== null)).toBe(true)
    expect(textos.slice(-comandantes.length)).toEqual(comandantes)
  })

  it('una carta sin definir da una lista vacía', () => {
    expect(textosDeEfectos(undefined)).toEqual([])
  })

  it('un efecto sin texto queda en null', () => {
    const base = card('FB-014')
    expect(base).toBeDefined()
    const sinTexto = { ...base!, efectos: [{ ...(base!.efectos?.[0] ?? { tipo: 'pasivo' as const }), texto: undefined }] } as typeof base
    expect(textosDeEfectos(sinTexto)).toEqual([null])
  })
})

describe('margenesDeStats: letalidad como aviso', () => {
  const sintetica = (atq: number, res: number): CartaBalance => ({ ...carta('Rowena'), id: 'T-001', stats: { atq, res } })
  const de = (c: CartaBalance, stat: MargenStat['stat']) => {
    const m = margenesDeStats(c, ctx).find((x) => x.stat === stat)
    return m as MargenStat
  }

  it('S3.1: con ATQ 5 subir +1 pasa el techo del pool (5) y solo avisa: puedeSubir no cambia', () => {
    const c = sintetica(5, 2)
    const atq = de(c, 'atq')
    expect(atq.techoPool).toBe(5)
    expect(atq.superaTecho).toBe(true)
    // tope 7, suma máxima 11 con suma 7: sigue pudiendo subir 2 aunque pase el techo.
    expect(atq.puedeSubir).toBe(2)
    expect(de(sintetica(4, 2), 'atq').superaTecho).toBe(false)
  })

  // El techo de RES del pool bajó de 7 a 6 (Isolde 3/7 pasó a 3/6): los mismos casos, un escalón más abajo.
  it('S3.1: la RES se compara con el techo de RES del pool (6)', () => {
    expect(de(sintetica(2, 6), 'res').superaTecho).toBe(true)
    expect(de(sintetica(2, 5), 'res').superaTecho).toBe(false)
    expect(de(sintetica(2, 5), 'res').techoPool).toBe(6)
  })

  it('S3.2: Nymeria (ATQ 4) mata a 2 rivales más con ATQ 5 (los de RES 5, sin contarse a sí misma)', () => {
    // La spec decía 11 -> 15 (+4): contaba a Nymeria (4/5) contra sí misma. Aquí no se cuenta a sí misma.
    // Rediseño de Disonancia: Korr pasó de 3/5 a 4/4, así que ya no es de RES 5 (eran 3 rivales, ahora 2).
    const rivalesConRes5 = ctx.pool.filter((o) => o.id !== carta('Nymeria').id && o.stats?.res === 5)
    expect(rivalesConRes5).toHaveLength(2)
    expect(de(carta('Nymeria'), 'atq').ganancia).toEqual({ mata: 2, loMatan: 0 })
  })

  it('S3.3: subir RES de 0 a 1 no cambia a quién la mata (escalón plano)', () => {
    expect(de(legado('Elena'), 'res').ganancia).toEqual({ mata: 0, loMatan: 0 })
  })

  it('la suma no lleva techo ni ganancia', () => {
    const suma = de(carta('Nymeria'), 'suma')
    expect(suma.techoPool).toBeNull()
    expect(suma.ganancia).toBeNull()
    expect(suma.superaTecho).toBe(false)
  })

  it('un paso de subida distinto en la config cambia la ganancia', () => {
    const cfg = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, pasoSubida: 2 } }
    const base = margenesDeStats(carta('Nymeria'), ctx, cfg).find((x) => x.stat === 'atq') as MargenStat
    expect(base.ganancia?.mata).toBeGreaterThan(4)
  })
})

describe('razonesDeCarta', () => {
  const ctxCompleto = contextoDeAnalisis(CARTAS)
  const textosReales = (id: string) => textosDeEfectos(ALL_CARDS.find((c) => c.id === id))
  const ctxAntes = contextoDeAnalisis(CARTAS_ANTES)
  const razones = (c: CartaBalance, textos: readonly (string | null)[] = textosReales(c.id), contexto = ctxCompleto) => {
    const desglose = desgloseDePoder(c, textos)
    return razonesDeCarta(c, margenesDeStats(c, contexto), desglose, contexto.ajustes.get(c.id) ?? null, contexto)
  }

  it('S4.1: Isolde (de antes) explica RES 7 contra el tope 5, el impuesto 1.0 y cita el texto del efecto', () => {
    const r = razones(legado('Isolde'), [TEXTO_ISOLDE_LEGADO], ctxAntes)
    const res = r.find((x) => x.texto.includes('RES 7'))
    expect(res).toBeDefined()
    expect(res!.nivel).toBe('error')
    expect(res!.texto).toContain('tope de 5')
    const impuesto = r.find((x) => x.texto.includes('destruye 1 Mística o Arcana'))
    expect(impuesto).toBeDefined()
    expect(impuesto!.texto).toContain('impuesto de 1.0')
  })

  it('S4.1: dice qué stat causa el exceso a partir del ajuste exploratorio (RES baja de 7 a 5)', () => {
    const r = razones(legado('Isolde'), [TEXTO_ISOLDE_LEGADO], ctxAntes)
    expect(r.some((x) => /RES.*7.*5/.test(x.texto) && x.texto.includes('ajuste'))).toBe(true)
  })

  it('S4.2: Elena (de antes) explica que su suma 3 queda por debajo del mínimo de 5.9 para coste 3 (6 menos el impuesto 0.1)', () => {
    const r = razones(legado('Elena'), textosReales('FB-015'), ctxAntes)
    const suma = r.find((x) => /suma 3/.test(x.texto))
    expect(suma).toBeDefined()
    expect(suma!.nivel).toBe('aviso')
    expect(suma!.texto).toMatch(/mínimo de 5\.9/)
    expect(suma!.texto).toMatch(/coste 3/)
  })

  it('S4.4: una carta dentro de rango o exenta no tiene razones', () => {
    expect(razones(carta('Rowena'))).toEqual([])
    expect(razones(carta('Aurora'))).toEqual([])
  })

  it('un stat cerca del tope es solo informativo (Korr, RES 5 con tope 5 del coste 3 y suma 8 en el máximo)', () => {
    // Korr de antes (3/5); hoy es 4/4 y su RES ya no está pegada al tope
    const r = razones(legadoDS('Korr'), [null], contextoDeAnalisis(CARTAS_DS_ANTES))
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.nivel === 'info')).toBe(true)
    expect(r.some((x) => x.texto.includes('RES 5'))).toBe(true)
  })

  it('S7.1: un Vínculo lleva el aviso de que no tiene poder esperado comparable', () => {
    const v = CARTAS.find((c) => c.tipo === 'Vínculo')!
    expect(razones(v).map((x) => x.texto)).toContain('Sin coste: no hay poder esperado comparable.')
  })

  it('una carta sin stats que pasa su poder esperado explica el desvío (carta sintética)', () => {
    // Ninguna de las cartas reales sin stats excede: se fabrica un Éter de coste 1 con efectos de sobra.
    const base = CARTAS.find((c) => c.stats === null && c.tipo === 'Éter' && c.coste === 1 && c.efectos.length > 0)
    expect(base).toBeDefined()
    const cara: CartaBalance = { ...base!, id: 'T-010', efectos: Array.from({ length: 12 }, () => base!.efectos[0]) }
    const d = desgloseDePoder(cara, [])
    expect(d.esperado).toBe(CONFIG_V1.poderPorCoste * cara.coste)
    expect(d.indice).toBeGreaterThan(d.esperado!)
    expect(estadoDe(cara).estado).toBe('excede')
    const r = razones(cara)
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((x) => x.nivel === 'error' && x.texto.includes('poder esperado'))).toBe(true)
  })

  it('en las 65 cartas: sin razones si está dentro o exenta (salvo tope de efecto y verbo bajo coste), y con un error si excede', () => {
    const deEfectoPorCoste = (texto: string) => texto.includes('tope de efecto') || texto.includes('exige coste mínimo')
    for (const c of CARTAS) {
      const e = estadoDe(c).estado
      const r = razones(c)
      if (e === 'dentro' || e === 'exenta') expect(r.filter((x) => !deEfectoPorCoste(x.texto)), c.id).toEqual([])
      if (e === 'excede') expect(r.some((x) => x.nivel === 'error'), c.id).toBe(true)
      // Una carta que no pasa el efecto por coste nunca se muestra favorable.
      if (!evaluarEfectoPorCoste(c).ok) expect(e, c.id).toBe('excede')
      // Las razones de efecto por coste aparecen exactamente cuando la carta no pasa esa evaluación.
      expect(r.some((x) => deEfectoPorCoste(x.texto)), c.id).toBe(!evaluarEfectoPorCoste(c).ok)
    }
  })

  it('una carta sin stats dentro del semáforo pero con el efecto por coste roto excede, con su razón', () => {
    // FB-008 Despertar ya no pasa su tope (índice 1.5 tras el rediseño). El caso «semáforo amarillo con índice > tope 2» se conserva
    // con un Éter sintético (FB-002 + el efecto de FB-001: índice 2.5). FB-003 (semáforo verde, verbo draw pide coste 2) sigue real.
    const dosEfectos = CARTAS.find((c) => c.id === 'FB-002')!
    const despertar: CartaBalance = { ...dosEfectos, id: 'T-020', efectos: [...dosEfectos.efectos, ...CARTAS.find((c) => c.id === 'FB-001')!.efectos] }
    expect(semaforoDe(despertar).semaforo).toBe('amarillo')
    expect(estadoDe(despertar).estado).toBe('excede')
    expect(estadoDe(despertar).etiqueta).toBe('Excede el presupuesto')
    expect(razones(despertar).filter((x) => x.nivel === 'error')).toHaveLength(1)
    // Lote 3: FB-003 (Éter con draw, coste 1) queda exento del coste mínimo por verbo: ya no excede por eso.
    const sangre = CARTAS.find((c) => c.id === 'FB-003')!
    expect(estadoDe(sangre).estado).not.toBe('excede')
    expect(razones(sangre).map((x) => x.texto).join(' ')).not.toMatch(/exige coste mínimo/)
    // Un Campeón de coste 1 con ese mismo verbo SÍ incumple el coste mínimo.
    const campeon: CartaBalance = { ...CARTAS.find((c) => c.tipo === 'Campeón' && c.stats !== null && !esExento(c))!, id: 'T-021', coste: 1, efectos: sangre.efectos }
    expect(razones(campeon).map((x) => x.texto)).toContain('El verbo draw exige coste mínimo 2, pero la carta cuesta 1.')
  })

  it('razona el tope de efecto de un Campeón y el coste mínimo de un verbo', () => {
    const base = CARTAS.find((c) => c.tipo === 'Campeón' && c.stats !== null && c.coste === 2 && !esExento(c))!
    const verboCaro = CARTAS.flatMap((c) => c.efectos).find((e) => e.verbo === 'destroy')!
    const cara: CartaBalance = {
      ...base,
      id: 'T-011',
      efectos: Array.from({ length: 6 }, () => ({ ...verboCaro, verbo: 'destroy', sinVerbo: false, verbosTramos: [] })),
    }
    const r = razones(cara)
    expect(r.some((x) => x.nivel === 'error' && /pasa el tope de efecto 4\.0 \(coste 2 × 2\)/.test(x.texto))).toBe(true)
    expect(r.some((x) => x.nivel === 'error' && x.texto.includes('El verbo destroy exige coste mínimo 3'))).toBe(true)
  })

  it('S4.3/S8.1: ninguna razón de las 65 cartas usa voseo rioplatense', () => {
    const voseo = /\b(tenés|podés|querés|sos|vos|fijate|mirá|elegí|subí|bajá|poné|hacé|sabés|necesitás|tené|ponete|cambiá)\b/i
    for (const c of CARTAS) {
      for (const r of razones(c)) expect(r.texto, c.id).not.toMatch(voseo)
    }
  })
})

describe('analizarCarta', () => {
  const ctxCompleto = contextoDeAnalisis(CARTAS)
  const ctxAntesAnalisis = contextoDeAnalisis(CARTAS_ANTES)
  const analizar = (c: CartaBalance, contexto = ctxCompleto) =>
    analizarCarta(c, contexto, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id)))

  it('S8.1: Elena (de antes) queda bajo banda, con el ajuste exploratorio 3/0 -> 5/1 (el tope de ATQ del coste 3 coincide con el techo del pool)', () => {
    const a = analizar(legado('Elena'), ctxAntesAnalisis)
    expect(a.estado).toBe('bajo-banda')
    expect(a.etiqueta).toBe('Bajo banda: puede subir')
    expect(a.ajuste?.antes).toEqual({ poder: 3, resistencia: 0 })
    expect(a.ajuste?.despues).toEqual({ poder: 5, resistencia: 1 })
    expect(a.ajuste?.superaTecho).toBe(false)
    expect(a.etiquetaAjuste).toBe('Exploratorio')
    expect(a.razones.length).toBeGreaterThan(0)
    expect(a.nombre).toBe(carta('Elena').nombre)
    expect(a.config).toBe('según CONFIG_V1 (borrador)')
  })

  it('S8.1b: la Elena de antes (3/2) queda bajo banda con el ajuste exploratorio 3/2 -> 4/2', () => {
    const a = analizar(legado('Elena 3/2'), contextoDeAnalisis(CARTAS_ELENA_32))
    expect(a.estado).toBe('bajo-banda')
    expect(a.ajuste?.antes).toEqual({ poder: 3, resistencia: 2 })
    expect(a.ajuste?.despues).toEqual({ poder: 4, resistencia: 2 })
    expect(a.ajuste?.superaTecho).toBe(false)
  })

  it('S8.1c: la Elena real (4/2, suma 6) está dentro de banda y no tiene ajuste propuesto', () => {
    const a = analizar(carta('Elena'))
    expect(a.estado).toBe('dentro')
    expect(a.ajuste).toBeNull()
    expect(a.etiquetaAjuste).toBeNull()
  })

  it('S8.2: Seraphina (dentro de banda) no tiene ajuste propuesto', () => {
    const a = analizar(carta('Seraphina'))
    expect(a.ajuste).toBeNull()
    expect(a.etiquetaAjuste).toBeNull()
  })

  it('Isolde (de antes) excede, trae su letalidad y marca el verbo fuera de identidad', () => {
    const a = analizar(legado('Isolde'), ctxAntesAnalisis)
    expect(a.estado).toBe('excede')
    expect(a.presupuesto?.excesoRes).toBe(2)
    expect(a.letalidad?.total).toBe(17)
    expect(a.fueraDeIdentidad).toEqual(['destroy'])
  })

  it('S10.1: una carta de referencia se analiza contra el pool de las 65, sin ajuste y sin entrar al pool', () => {
    const pr: CartaBalance = { ...carta('Isolde'), id: 'PR-030', esReferencia: true }
    const a = analizar(pr)
    expect(a.esReferencia).toBe(true)
    expect(a.ajuste).toBeNull()
    expect(a.etiquetaAjuste).toBeNull()
    expect(a.letalidad?.total).toBe(18)
    expect(ctxCompleto.pool).toHaveLength(18)
    expect(ctxCompleto.pool.some((c) => c.id === 'PR-030')).toBe(false)
  })

  it('S6.2: una carta sin stats trae índice y poder esperado, sin márgenes, letalidad ni ajuste', () => {
    const m = CARTAS.find((c) => c.tipo === 'Mística' && c.coste > 0)!
    const a = analizar(m)
    expect(a.margenes).toEqual([])
    expect(a.presupuesto).toBeNull()
    expect(a.letalidad).toBeNull()
    expect(a.ajuste).toBeNull()
    expect(a.desglose.esperado).toBe(m.coste * CONFIG_V1.poderPorCoste)
  })

  it('S7.1: un Vínculo no tiene semáforo, pero sí índice, desglose y el aviso', () => {
    const v = CARTAS.find((c) => c.tipo === 'Vínculo')!
    const a = analizar(v)
    expect(a.estado).toBe('sin-semaforo')
    expect(a.desglose.indice).toBe(poderDeCarta(v).indice)
    expect(a.razones.map((r) => r.texto)).toContain('Sin coste: no hay poder esperado comparable.')
  })

  it('S9.4: el efecto de Comandante cuenta en el índice, en el impuesto y en las razones', () => {
    const base = legado('Isolde')
    const conComandante: CartaBalance = {
      ...base,
      id: 'T-002',
      efectos: [...base.efectos, { ...base.efectos[0], esComandante: true }],
    }
    const a = analizarCarta(conComandante, ctxCompleto, ['Efecto normal', 'Texto del Comandante'])
    expect(a.desglose.efectos[1].esComandante).toBe(true)
    expect(a.desglose.indice).toBe(poderDeCarta(conComandante).indice)
    expect(a.razones.some((r) => r.texto.includes('Texto del Comandante'))).toBe(true)
    expect(a.presupuesto?.impuesto).toBeGreaterThan(1)
  })

  it('S9.2: una carta sin efectos no produce NaN ni lanza', () => {
    const vacia: CartaBalance = { ...carta('Elena'), id: 'T-003', efectos: [], keywords: [] }
    const a = analizar(vacia)
    expect(a.desglose.efectos).toEqual([])
    expect(a.desglose.indice).toBe(0)
    expect(JSON.stringify(a)).not.toContain('NaN')
  })

  it('S9.1: con las cartas congeladas, dos corridas dan resultados idénticos y no lanzan', () => {
    const congelar = <T>(x: T): T => {
      if (x !== null && typeof x === 'object' && !Object.isFrozen(x)) {
        Object.freeze(x)
        for (const v of Object.values(x as object)) congelar(v)
      }
      return x
    }
    // Se usa el seed con la Elena de antes (3/2) para que el estado «bajo banda» siga representado
    const frescas = congelar(structuredClone(CARTAS_ELENA_32))
    const c1 = contextoDeAnalisis(frescas)
    const c2 = contextoDeAnalisis(frescas)
    const una = frescas.map((c) => analizarCarta(c, c1, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id))))
    const dos = frescas.map((c) => analizarCarta(c, c2, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id))))
    expect(una).toHaveLength(66)
    expect(dos).toEqual(una)
    expect(una.filter((a) => a.estado === 'excede').length).toBeGreaterThan(0)
    expect(una.filter((a) => a.estado === 'bajo-banda')).toHaveLength(1)
    expect(una.every((a) => !JSON.stringify(a).includes('NaN'))).toBe(true)
  })

  it('S4.3/S8.1: ningún texto del análisis de las 65 cartas (estados, etiquetas, razones, ajuste) usa voseo', () => {
    const voseo = /\b(tenés|podés|querés|sos|vos|fijate|mirá|elegí|subí|bajá|poné|hacé|sabés|necesitás|tené|ponete|cambiá)\b/i
    for (const c of CARTAS) {
      const a = analizar(c)
      const textos = [a.etiqueta, a.config, ...a.razones.map((r) => r.texto), ...a.margenes.map((m) => m.texto), ...(a.ajuste ? [a.ajuste.motivo, ...a.ajuste.avisos] : [])]
      for (const t of textos) expect(t, c.id).not.toMatch(voseo)
    }
  })

  it('S9.5: el análisis lee la config recibida: otro cercaDelTope cambia el estado y el default no', () => {
    const cfg = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: 1.5 } }
    const a = analizarCarta(carta('Rowena'), ctxCompleto, [], cfg)
    expect(a.estado).toBe('en-limite')
    expect(analizar(carta('Rowena')).estado).toBe('dentro')
  })
})
