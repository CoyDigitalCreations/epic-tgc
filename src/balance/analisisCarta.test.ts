import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { analizarCarta, contextoDeAnalisis, desgloseDePoder, estadoDeCarta, margenesDeStats, razonesDeCarta, textosDeEfectos } from './analisisCarta'
import type { ContextoAnalisis, MargenStat } from './analisisCarta'
import { CONFIG_V1 } from './config'
import { poolLetalidad, techosDelPool } from './letalidad'
import { semaforoDe } from './metricas'
import { poderDeCarta } from './poderEfecto'
import type { CartaBalance } from './tipos'
import { CARTAS, carta } from './test/cartasReales'

const pool = poolLetalidad(CARTAS)
const ctx: ContextoAnalisis = { pool, techos: techosDelPool(pool), ajustes: new Map() }

const porStat = (nombre: string, cfg = CONFIG_V1): Record<MargenStat['stat'], MargenStat> => {
  const m = margenesDeStats(carta(nombre), ctx, cfg)
  const buscar = (s: MargenStat['stat']) => {
    const x = m.find((y) => y.stat === s)
    if (!x) throw new Error(`Falta el margen ${s} de ${nombre}`)
    return x
  }
  return { atq: buscar('atq'), res: buscar('res'), suma: buscar('suma') }
}

describe('margenesDeStats: estados', () => {
  it('S1.1: Elena (3/0, coste 3) queda bajo banda y semaforoDe no cambia', () => {
    const { suma } = porStat('Elena')
    expect(suma.estado).toBe('bajo')
    expect(suma.texto).toBe('Bajo banda: puede subir')
    expect(suma.holgura).toBe(7)
    expect(semaforoDe(carta('Elena'))).toEqual({ desvio: 0, semaforo: 'verde' })
  })

  it.each(['Seraphina', 'Cassandra', 'Varek', 'Thane'])('S1.2: %s queda bajo banda aunque semaforoDe la marque verde', (n) => {
    expect(porStat(n).suma.estado).toBe('bajo')
    expect(semaforoDe(carta(n)).semaforo).toBe('verde')
  })

  it('S1.3: Isolde (3/7) excede el tope de RES por 1 y su ATQ queda verde', () => {
    const { atq, res, suma } = porStat('Isolde')
    expect(res.estado).toBe('rojo')
    expect(res.tope).toBe(6)
    expect(res.holgura).toBe(-1)
    expect(res.puedeSubir).toBe(0)
    expect(atq.estado).toBe('verde')
    // Con el impuesto de su efecto (1) la suma máxima baja a 9 y 10 la pasa.
    expect(suma.tope).toBe(9)
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

  it('S1.6: un stat con holgura <= cercaDelTope es amarillo con «Cerca del tope» (Vaela, ATQ 5 con tope 5)', () => {
    const { atq } = porStat('Vaela')
    expect(atq.holgura).toBe(0)
    expect(atq.estado).toBe('amarillo')
    expect(atq.texto).toBe('Cerca del tope')
  })

  it('S9.5: otra config.analisis.cercaDelTope cambia el estado (Rowena, RES con holgura 1)', () => {
    expect(porStat('Rowena').res.estado).toBe('verde')
    const cfg = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: 1.5 } }
    expect(porStat('Rowena', cfg).res.estado).toBe('amarillo')
  })

  it('una carta sin stats no tiene márgenes', () => {
    const eter = CARTAS.find((c) => c.stats === null)
    expect(eter).toBeDefined()
    expect(margenesDeStats(eter!, ctx)).toEqual([])
  })
})

describe('margenesDeStats: puede subir', () => {
  it('S2.1: Elena puede subir 3 de ATQ, 6 de RES y 7 de suma', () => {
    const { atq, res, suma } = porStat('Elena')
    expect([atq.holgura, res.holgura, suma.holgura]).toEqual([3, 6, 7])
    expect([atq.puedeSubir, res.puedeSubir, suma.puedeSubir]).toEqual([3, 6, 7])
  })

  it('S2.2: una carta pegada al tope no puede subir', () => {
    const { atq, suma } = porStat('Vaela')
    expect(atq.puedeSubir).toBe(0)
    expect(suma.puedeSubir).toBe(0)
  })

  it('S2.3: el impuesto rebaja la suma máxima (Draven, 4/4, impuesto 0.8): se pasa y no puede subir', () => {
    const { atq, suma } = porStat('Draven')
    expect(suma.tope).toBe(7.2)
    expect(suma.holgura).toBe(-0.8)
    expect(suma.estado).toBe('rojo')
    expect(atq.holgura).toBe(1)
    expect(atq.puedeSubir).toBe(0)
  })

  it('redondea a 2 decimales antes de comparar (Marek, impuesto 0.3: holgura de suma 0.7)', () => {
    expect(porStat('Marek').suma.holgura).toBe(0.7)
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
    const d = desgloseDePoder(carta('Ragnar'), [])
    expect(d.efectos.some((e) => e.componentes.keywords === 3)).toBe(true)
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
    expect(d.efectos.slice(0, -1).every((e) => !e.esComandante)).toBe(true)
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
  it('Isolde excede, Elena queda bajo banda, Rowena está dentro y Vaela en el límite', () => {
    expect(estadoDe(carta('Isolde')).estado).toBe('excede')
    expect(estadoDe(carta('Elena')).estado).toBe('bajo-banda')
    expect(estadoDe(carta('Elena')).etiqueta).toBe('Bajo banda: puede subir')
    expect(estadoDe(carta('Rowena')).estado).toBe('dentro')
    expect(estadoDe(carta('Vaela')).estado).toBe('en-limite')
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
    for (const v of CARTAS.filter((c) => c.tipo === 'Vínculo')) {
      expect(estadoDe(v).estado, v.id).toBe('sin-semaforo')
    }
  })
})

describe('contextoDeAnalisis', () => {
  it('calcula una vez el pool (18 Campeones no exentos de las 65), los techos y los ajustes', () => {
    const c = contextoDeAnalisis(CARTAS)
    expect(c.pool).toHaveLength(18)
    expect(c.techos).toEqual({ atq: 5, res: 7 })
    expect(c.ajustes.get('FB-015')?.despues).toEqual({ poder: 6, resistencia: 2 })
    expect(c.ajustes.has('FB-011')).toBe(false)
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
    expect(textosDeEfectos(card('FB-014'))).toEqual(['Puedes pagar 2 Éter, destruye 1 Mística o Arcana que controla el rival.'])
  })

  it('pone el texto del Comandante al final (Aurora)', () => {
    const aurora = card('FB-010')
    const textos = textosDeEfectos(aurora)
    expect(textos).toHaveLength(carta('Aurora').efectos.length)
    const comandante = aurora && 'efectoComandante' in aurora ? aurora.efectoComandante?.texto ?? null : null
    expect(comandante).not.toBeNull()
    expect(textos[textos.length - 1]).toBe(comandante)
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

  it('S3.1: la RES se compara con el techo de RES del pool (7)', () => {
    expect(de(sintetica(2, 7), 'res').superaTecho).toBe(true)
    expect(de(sintetica(2, 6), 'res').superaTecho).toBe(false)
    expect(de(sintetica(2, 6), 'res').techoPool).toBe(7)
  })

  it('S3.2: Nymeria (ATQ 4) mata a 3 rivales más con ATQ 5 (los de RES 5, sin contarse a sí misma)', () => {
    // La spec decía 11 -> 15 (+4): contaba a Nymeria (4/5) contra sí misma. Aquí no se cuenta a sí misma.
    const rivalesConRes5 = ctx.pool.filter((o) => o.id !== carta('Nymeria').id && o.stats?.res === 5)
    expect(rivalesConRes5).toHaveLength(3)
    expect(de(carta('Nymeria'), 'atq').ganancia).toEqual({ mata: 3, loMatan: 0 })
  })

  it('S3.3: subir RES de 0 a 1 no cambia a quién la mata (escalón plano)', () => {
    expect(de(carta('Elena'), 'res').ganancia).toEqual({ mata: 0, loMatan: 0 })
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
  const razones = (c: CartaBalance) => {
    const desglose = desgloseDePoder(c, textosReales(c.id))
    return razonesDeCarta(c, margenesDeStats(c, ctxCompleto), desglose, ctxCompleto.ajustes.get(c.id) ?? null, ctxCompleto)
  }

  it('S4.1: Isolde explica RES 7 contra el tope 6, el impuesto 1.0 y cita el texto del efecto', () => {
    const r = razones(carta('Isolde'))
    const res = r.find((x) => x.texto.includes('RES 7'))
    expect(res).toBeDefined()
    expect(res!.nivel).toBe('error')
    expect(res!.texto).toContain('tope de 6')
    const impuesto = r.find((x) => x.texto.includes('destruye 1 Mística o Arcana'))
    expect(impuesto).toBeDefined()
    expect(impuesto!.texto).toContain('impuesto de 1.0')
  })

  it('S4.1: dice qué stat causa el exceso a partir del ajuste exploratorio (RES baja de 7 a 6)', () => {
    const r = razones(carta('Isolde'))
    expect(r.some((x) => /RES.*7.*6/.test(x.texto) && x.texto.includes('ajuste'))).toBe(true)
  })

  it('S4.2: Elena explica que su suma 3 queda por debajo del mínimo de 8 para coste 3', () => {
    const r = razones(carta('Elena'))
    const suma = r.find((x) => /suma 3/.test(x.texto))
    expect(suma).toBeDefined()
    expect(suma!.nivel).toBe('aviso')
    expect(suma!.texto).toMatch(/mínimo de 8/)
    expect(suma!.texto).toMatch(/coste 3/)
  })

  it('S4.4: una carta dentro de rango o exenta no tiene razones', () => {
    expect(razones(carta('Rowena'))).toEqual([])
    expect(razones(carta('Aurora'))).toEqual([])
  })

  it('un stat cerca del tope es solo informativo (Vaela, ATQ 5 con tope 5)', () => {
    const r = razones(carta('Vaela'))
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.nivel === 'info')).toBe(true)
    expect(r.some((x) => x.texto.includes('ATQ 5'))).toBe(true)
  })

  it('S7.1: un Vínculo lleva el aviso de que no tiene poder esperado comparable', () => {
    const v = CARTAS.find((c) => c.tipo === 'Vínculo')!
    expect(razones(v).map((x) => x.texto)).toContain('Sin coste: no hay poder esperado comparable.')
  })

  it('una carta sin stats que pasa su poder esperado explica el desvío', () => {
    const roja = CARTAS.filter((c) => c.stats === null && c.tipo !== 'Vínculo' && estadoDe(c).estado === 'excede')
    for (const c of roja) {
      const r = razones(c)
      expect(r.some((x) => x.nivel === 'error' && x.texto.includes('poder esperado')), c.id).toBe(true)
    }
  })

  it('en las 65 cartas: sin razones si está dentro o exenta, y con un error si excede', () => {
    for (const c of CARTAS) {
      const e = estadoDe(c).estado
      const r = razones(c)
      if (e === 'dentro' || e === 'exenta') expect(r, c.id).toEqual([])
      if (e === 'excede') expect(r.some((x) => x.nivel === 'error'), c.id).toBe(true)
    }
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
  const analizar = (c: CartaBalance, contexto = ctxCompleto) =>
    analizarCarta(c, contexto, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id)))

  it('S8.1: Elena queda bajo banda, con el ajuste exploratorio 3/0 -> 6/2 que supera el techo', () => {
    const a = analizar(carta('Elena'))
    expect(a.estado).toBe('bajo-banda')
    expect(a.etiqueta).toBe('Bajo banda: puede subir')
    expect(a.ajuste?.antes).toEqual({ poder: 3, resistencia: 0 })
    expect(a.ajuste?.despues).toEqual({ poder: 6, resistencia: 2 })
    expect(a.ajuste?.superaTecho).toBe(true)
    expect(a.etiquetaAjuste).toBe('Exploratorio')
    expect(a.razones.length).toBeGreaterThan(0)
    expect(a.nombre).toBe(carta('Elena').nombre)
    expect(a.config).toBe('según CONFIG_V1 (borrador)')
  })

  it('S8.2: Vaela no tiene ajuste propuesto', () => {
    const a = analizar(carta('Vaela'))
    expect(a.ajuste).toBeNull()
    expect(a.etiquetaAjuste).toBeNull()
  })

  it('Isolde excede, trae su letalidad y marca el verbo fuera de identidad', () => {
    const a = analizar(carta('Isolde'))
    expect(a.estado).toBe('excede')
    expect(a.presupuesto?.excesoRes).toBe(1)
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
    const base = carta('Isolde')
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
    const frescas = congelar(structuredClone(CARTAS))
    const c1 = contextoDeAnalisis(frescas)
    const c2 = contextoDeAnalisis(frescas)
    const una = frescas.map((c) => analizarCarta(c, c1, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id))))
    const dos = frescas.map((c) => analizarCarta(c, c2, textosDeEfectos(ALL_CARDS.find((x) => x.id === c.id))))
    expect(una).toHaveLength(65)
    expect(dos).toEqual(una)
    expect(una.filter((a) => a.estado === 'excede').length).toBeGreaterThan(0)
    expect(una.filter((a) => a.estado === 'bajo-banda')).toHaveLength(5)
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

  it('S9.6: es determinista y no cambia aunque cambie la config de pasos', () => {
    const cfg = { ...CONFIG_V1, analisis: { ...CONFIG_V1.analisis, cercaDelTope: 1.5 } }
    const a = analizarCarta(carta('Rowena'), ctxCompleto, [], cfg)
    expect(a.estado).toBe('en-limite')
    expect(analizar(carta('Rowena')).estado).toBe('dentro')
  })
})
