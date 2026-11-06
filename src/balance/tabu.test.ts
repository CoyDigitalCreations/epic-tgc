import { describe, expect, it } from 'vitest'
import cartasPruebaJson from '../../seed/CartasPrueba.json'
import fuenteEfectosJson from '../../seed/FuenteEfectos.json'
import { ALL_CARDS } from '../shared/data/paquetes'
import { KEYWORDS } from '../shared/types/enums'
import { REGLA_IDS } from '../shared/rules/reglas'
import type { AnyCard } from '../shared/types'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarCarta } from './metricas'
import { poderDeCarta } from './poderEfecto'
import { clavesDeEfecto, ETIQUETA_ESTADO_TABU, evaluarTabu, nombreDeInfraccion, reglaDeTabu, resumenTabuPorMazo, tabuDeCarta } from './tabu'
import { carta, CARTAS } from './test/cartasReales'
import type { CartaBalance, ConfigBalance, EfectoBalance } from './tipos'

const efecto = (p: Partial<EfectoBalance> = {}): EfectoBalance => ({
  verbo: null,
  sinVerbo: false,
  verbosTramos: [],
  tipo: 'pasivo',
  trigger: null,
  objetivoTipo: null,
  duracion: null,
  costoTipo: null,
  costoCantidad: 0,
  activacion: null,
  keywordsConcedidas: [],
  esComandante: false,
  ...p,
})

const cartaDe = (p: Partial<CartaBalance> = {}): CartaBalance => ({
  id: 'T-1',
  nombre: 'Prueba',
  tipo: 'Campeón',
  rareza: 'Común',
  coste: 3,
  mazo: null,
  roles: [],
  stats: null,
  keywords: [],
  efectos: [],
  ...p,
})

const clon = (): ConfigBalance => structuredClone(CONFIG_V1)

describe('catálogo de tabú (config)', () => {
  const { tabu } = CONFIG_V1

  it('declara la escala 0-3', () => {
    expect(tabu.niveles).toEqual([0, 1, 2, 3])
  })

  it('cada entrada tiene un nivel de la escala y la regla que rompe en texto', () => {
    for (const categoria of [tabu.verbo, tabu.contexto, tabu.regla, tabu.opcion, tabu.keyword]) {
      for (const [clave, r] of Object.entries(categoria)) {
        expect(tabu.niveles, clave).toContain(r.nivel)
        expect(r.regla.trim().length, clave).toBeGreaterThan(0)
      }
    }
  })

  it('clasifica cada verbo de poder.verbo (los que no rompen nada, en nivel 0 explícito)', () => {
    for (const verbo of Object.keys(CONFIG_V1.poder.verbo)) expect(tabu.verbo[verbo], verbo).toBeDefined()
    expect(tabu.verbo.buff.nivel).toBe(0)
    expect(tabu.verbo.rival_discard.nivel).toBe(0)
  })

  it('clasifica cada regla del catálogo REGLAS del motor y cada regla enumerada del Card-Maker', () => {
    for (const id of REGLA_IDS) expect(tabu.regla[id], id).toBeDefined()
    for (const id of ['disparo_sin_agotar', 'coste_campeones_rival_mas', 'olvido_rival', 'peaje_bloqueo']) expect(tabu.regla[id], id).toBeDefined()
  })

  it('clasifica cada keyword del juego y ninguna rompe reglas por sí sola (son el vocabulario de excepciones del manual)', () => {
    expect(Object.keys(tabu.keyword).sort()).toEqual([...KEYWORDS].sort())
    for (const r of Object.values(tabu.keyword)) expect(r.nivel).toBe(0)
  })

  it('el invariante del motor (la derrota por Vínculos) es nivel 3 y las reglas con excepción nombrada, nivel 1', () => {
    expect(tabu.regla.derrotaPorVinculos.nivel).toBe(3)
    expect(tabu.regla.rupturasPorTurno.nivel).toBe(1)
    expect(tabu.regla.disparoAgota.nivel).toBe(1)
  })

  it('el presupuesto de tabú crece con el coste y cubre todos los costes con banda', () => {
    for (const coste of Object.keys(CONFIG_V1.bandas).map(Number)) expect(tabu.tabuMaxPorCoste[coste], `coste ${coste}`).toBeDefined()
    const costes = Object.keys(tabu.tabuMaxPorCoste).map(Number).sort((a, b) => a - b)
    for (let i = 1; i < costes.length; i++) {
      expect(tabu.tabuMaxPorCoste[costes[i]]).toBeGreaterThan(tabu.tabuMaxPorCoste[costes[i - 1]])
    }
    // Un Éter (coste 1) no puede subir de coste: su presupuesto es 0.
    expect(tabu.tabuMaxPorCoste[1]).toBe(0)
  })
})

describe('guarda: ningún verbo, regla ni keyword del seed queda sin clasificar', () => {
  /** Recorre el JSON crudo y junta cada valor que el catálogo tiene que conocer. */
  function recolectar(cartas: unknown[]) {
    const verbos = new Set<string>()
    const reglas = new Set<string>()
    const keywords = new Set<string>()
    const recorrer = (o: unknown): void => {
      if (Array.isArray(o)) return o.forEach(recorrer)
      if (o === null || typeof o !== 'object') return
      const x = o as Record<string, unknown>
      if (typeof x.efecto === 'string') verbos.add(x.efecto)
      if (typeof x.reglaEnumerada === 'string') reglas.add(x.reglaEnumerada)
      if (typeof x.regla === 'object' && x.regla !== null && typeof (x.regla as { id?: unknown }).id === 'string') reglas.add((x.regla as { id: string }).id)
      if (typeof x.keyword === 'string') keywords.add(x.keyword)
      if (Array.isArray(x.keywords)) for (const k of x.keywords) if (typeof k === 'string') keywords.add(k)
      Object.values(x).forEach(recorrer)
    }
    recorrer(cartas)
    return { verbos, reglas, keywords }
  }

  it.each([
    ['FuenteEfectos.json (las 66 publicadas)', fuenteEfectosJson as unknown[]],
    ['CartasPrueba.json (referencia)', cartasPruebaJson as unknown[]],
  ])('%s: cada verbo, regla y keyword está en el catálogo', (_nombre, cartas) => {
    const { verbos, reglas, keywords } = recolectar(cartas)
    expect(verbos.size).toBeGreaterThan(0)
    for (const v of verbos) expect(CONFIG_V1.tabu.verbo[v], `verbo ${v}`).toBeDefined()
    for (const r of reglas) expect(CONFIG_V1.tabu.regla[r], `regla ${r}`).toBeDefined()
    for (const k of keywords) expect(CONFIG_V1.tabu.keyword[k as keyof typeof CONFIG_V1.tabu.keyword], `keyword ${k}`).toBeDefined()
  })

  it('las cartas ya normalizadas (publicadas y de referencia) no dejan ninguna clave sin clasificar', () => {
    const todas = [...cargarCartas(ALL_CARDS).cartas, ...cargarCartas(cartasPruebaJson as unknown as AnyCard[]).cartas]
    expect(todas.length).toBeGreaterThan(CARTAS.length)
    for (const c of todas) expect(tabuDeCarta(c).sinClasificar, c.id).toEqual([])
  })
})

describe('claves de un efecto', () => {
  it('un verbo común aporta su verbo y un modificar_regla aporta la regla que modifica', () => {
    expect(clavesDeEfecto(efecto({ verbo: 'steal_ether' }))).toEqual(['verbo:steal_ether'])
    expect(clavesDeEfecto(efecto({ verbo: 'modificar_regla', reglaEnumerada: 'olvido_rival' }))).toEqual(['regla:olvido_rival'])
    expect(clavesDeEfecto(efecto({ verbo: 'modificar_regla', reglaCatalogo: 'rupturasPorTurno' }))).toEqual(['regla:rupturasPorTurno'])
    expect(clavesDeEfecto(efecto({ verbo: 'modificar_regla' }))).toEqual(['verbo:modificar_regla'])
  })

  it('mover Éter del rival (o de ambos) usa su contexto en lugar del verbo; mover Éter propio, el verbo', () => {
    const mover = (objetivoControlador: string) => efecto({ verbo: 'mover', objetivoTipo: 'eter', objetivoControlador })
    expect(clavesDeEfecto(mover('rival'))).toEqual(['contexto:mover_eter_ajeno'])
    expect(clavesDeEfecto(mover('ambos'))).toEqual(['contexto:mover_eter_ajeno'])
    expect(clavesDeEfecto(mover('propio'))).toEqual(['verbo:mover'])
  })

  it('recuperar a la mano de su dueño usa su contexto; a la propia, el verbo', () => {
    expect(clavesDeEfecto(efecto({ verbo: 'recuperar_mano', controladorDestino: 'dueno' }))).toEqual(['contexto:recuperar_mano_al_dueno'])
    expect(clavesDeEfecto(efecto({ verbo: 'recuperar_mano' }))).toEqual(['verbo:recuperar_mano'])
  })

  it('las opciones y las keywords concedidas suman la suya; «sin agotar» es la regla disparo_sin_agotar', () => {
    const claves = clavesDeEfecto(
      efecto({ verbo: 'activar_disparo', sinPagarCosto: true, sinAgotar: true, reagruparAlcance: 'todo', keywordsConcedidas: ['Tirador'] }),
    )
    expect(claves).toEqual([
      'verbo:activar_disparo',
      'opcion:sin_pagar_costo',
      'regla:disparo_sin_agotar',
      'opcion:reagrupar_todo',
      'keyword:Tirador',
    ])
  })

  it('un efecto sin verbo propio usa los verbos de sus tramos', () => {
    expect(clavesDeEfecto(efecto({ verbosTramos: ['toggle_exhaust', 'fix_exhaust'] }))).toEqual(['verbo:toggle_exhaust', 'verbo:fix_exhaust'])
  })

  it('nombreDeInfraccion quita la categoría', () => {
    expect(nombreDeInfraccion('regla:olvido_rival')).toBe('olvido_rival')
  })
})

describe('tabuDeCarta: agregación', () => {
  it('una carta que no rompe nada tiene 0 puntos y nivel 0, con sus efectos clasificados en nivel 0', () => {
    const t = tabuDeCarta(carta('Seraphina'))
    expect(t.puntos).toBe(0)
    expect(t.nivelMax).toBe(0)
    expect(t.detalle).toEqual([{ efecto: 'verbo:toggle_exhaust', nivel: 0, regla: CONFIG_V1.tabu.verbo.toggle_exhaust.regla }])
    expect(t.sinClasificar).toEqual([])
  })

  it('los puntos suman los niveles de las infracciones distintas y el nivel máximo es el más alto', () => {
    const c = cartaDe({ efectos: [efecto({ verbo: 'steal_ether' }), efecto({ verbo: 'double_attack' })] })
    const t = tabuDeCarta(c)
    expect(t.puntos).toBe(3)
    expect(t.nivelMax).toBe(2)
    expect(t.detalle.map((d) => [d.efecto, d.nivel])).toEqual([
      ['verbo:double_attack', 2],
      ['verbo:steal_ether', 1],
    ])
  })

  it('la misma infracción en dos efectos cuenta una sola vez', () => {
    const c = cartaDe({ efectos: [efecto({ verbo: 'steal_ether' }), efecto({ verbo: 'steal_ether', tipo: 'disparo' })] })
    expect(tabuDeCarta(c).puntos).toBe(1)
  })

  it('«sin agotar» y la regla disparo_sin_agotar son la misma infracción (Aurora no la paga dos veces)', () => {
    const c = cartaDe({
      efectos: [
        efecto({ verbo: 'activar_disparo', sinAgotar: true }),
        efecto({ verbo: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', esComandante: true }),
      ],
    })
    expect(tabuDeCarta(c).detalle.filter((d) => d.efecto === 'regla:disparo_sin_agotar')).toHaveLength(1)
  })

  it('incluye el efecto de Comandante y los efectos de bloqueo de Éter', () => {
    // Ragnar: Arrebato (1) + Olvido (1) + reagrupar todo (1) + Peaje del Comandante (2)
    const ragnar = tabuDeCarta(carta('Ragnar'))
    expect(ragnar.puntos).toBe(5)
    expect(ragnar.nivelMax).toBe(2)
    expect(ragnar.detalle.map((d) => d.efecto)).toEqual(
      expect.arrayContaining(['regla:peaje_bloqueo', 'verbo:steal_ether', 'regla:olvido_rival', 'opcion:reagrupar_todo']),
    )
    // Éter del Primogénito: efecto de bloqueo con direct_attack (imbloqueable)
    expect(tabuDeCarta(carta('Éter del Primogénito')).detalle).toEqual([
      { efecto: 'verbo:direct_attack', nivel: 1, regla: CONFIG_V1.tabu.verbo.direct_attack.regla },
    ])
  })

  it('las keywords impresas y concedidas se clasifican (nivel 0) sin sumar puntos', () => {
    const t = tabuDeCarta(cartaDe({ keywords: ['Tirador'], efectos: [efecto({ verbo: 'grant_keyword', keywordsConcedidas: ['Carga'] })] }))
    expect(t.puntos).toBe(0)
    expect(t.detalle.map((d) => d.efecto)).toEqual(expect.arrayContaining(['keyword:Tirador', 'keyword:Carga', 'verbo:grant_keyword']))
  })

  it('un verbo que la config no conoce se avisa en sinClasificar, cuenta como nivel 0 y no rompe el cálculo', () => {
    const t = tabuDeCarta(cartaDe({ efectos: [efecto({ verbo: 'verbo_nuevo' })] }))
    expect(t.sinClasificar).toEqual(['verbo:verbo_nuevo'])
    expect(t.puntos).toBe(0)
    expect(t.detalle[0].regla).toMatch(/sin clasificar/i)
  })

  it('lee los niveles de la config que recibe', () => {
    const cfg = clon()
    cfg.tabu.verbo.steal_ether.nivel = 3
    const c = cartaDe({ efectos: [efecto({ verbo: 'steal_ether' })] })
    expect(tabuDeCarta(c).puntos).toBe(1)
    expect(tabuDeCarta(c, cfg).puntos).toBe(3)
    expect(tabuDeCarta(c, cfg).nivelMax).toBe(3)
  })

  it('es pura: no muta la carta', () => {
    const c = cartaDe({ efectos: [efecto({ verbo: 'steal_ether' })] })
    const copia = structuredClone(c)
    tabuDeCarta(c)
    expect(c).toEqual(copia)
  })

  it('reglaDeTabu devuelve null para una clave desconocida', () => {
    expect(reglaDeTabu('verbo:steal_ether')?.nivel).toBe(1)
    expect(reglaDeTabu('regla:no_existe')).toBeNull()
  })
})

describe('cartas reales: la justificación de cada nivel', () => {
  const puntos = (nombre: string) => tabuDeCarta(carta(nombre)).puntos

  it('Estásis: Elena declara 2 ataques (2), Cassandra fija el agotamiento (2), la Runa de Ancla impide reagrupar (2)', () => {
    // Su keyword Recarga se clasifica en nivel 0 y no suma
    expect(tabuDeCarta(carta('Elena')).detalle[0]).toEqual({ efecto: 'verbo:double_attack', nivel: 2, regla: expect.stringContaining('§9.2') })
    expect(tabuDeCarta(carta('Elena')).puntos).toBe(2)
    expect(puntos('Cassandra')).toBe(2)
    expect(tabuDeCarta(carta('Runa de Ancla')).detalle[0]).toMatchObject({ efecto: 'verbo:anclar_eter', nivel: 2 })
  })

  it('Aurora: Resonancia sin pagar (2), sin agotar (1), Tributo (1), reagrupe total (1) y activar el Disparo de otro (1)', () => {
    const t = tabuDeCarta(carta('Aurora'))
    expect(t.puntos).toBe(6)
    expect(t.nivelMax).toBe(2)
    expect(t.detalle.filter((d) => d.nivel > 0).map((d) => d.efecto).sort()).toEqual(
      ['opcion:reagrupar_todo', 'opcion:sin_pagar_costo', 'regla:coste_campeones_rival_mas', 'regla:disparo_sin_agotar', 'verbo:activar_disparo'].sort(),
    )
  })

  it('FB-023 devuelve el Campeón a la mano de su dueño (1) y Nymeria mueve Éter del rival (1)', () => {
    expect(tabuDeCarta(carta('El Reino Perdido')).detalle[0]).toMatchObject({ efecto: 'contexto:recuperar_mano_al_dueno', nivel: 1 })
    expect(tabuDeCarta(carta('Nymeria')).detalle[0]).toMatchObject({ efecto: 'contexto:mover_eter_ajeno', nivel: 1 })
  })

  it('Disonancia: arrebatar Éter (1), Olvido (1), Embestida del Sur (1 + 1) y el Peaje (2)', () => {
    expect(puntos('Draven')).toBe(1)
    expect(puntos('Maldición del Sur')).toBe(1)
    expect(puntos('Embestida del Sur')).toBe(2)
    expect(tabuDeCarta(carta('Ragnar')).detalle.find((d) => d.efecto === 'regla:peaje_bloqueo')?.nivel).toBe(2)
  })

  it('las cartas de remoción, robo y descarte normales no rompen nada (nivel 0 explícito)', () => {
    for (const nombre of ['Tormenta del Sur', 'Varek', 'Marek', 'Éter del Trueno', 'Heredad del Alba', 'Marcha de las Primeras']) {
      expect(puntos(nombre), nombre).toBe(0)
    }
  })

  it('el tabú es un eje independiente: cambiar su config no mueve el poder ni el semáforo de ninguna carta', () => {
    const cfg = clon()
    cfg.tabu.verbo.steal_ether.nivel = 3
    cfg.tabu.tabuMaxPorCoste[4] = 0
    for (const c of CARTAS) {
      expect(poderDeCarta(c, cfg).indice, c.id).toBe(poderDeCarta(c).indice)
      expect(evaluarCarta(c, cfg), c.id).toEqual(evaluarCarta(c))
    }
  })
})

describe('evaluarTabu: presupuesto por coste', () => {
  it('dentro: sobra presupuesto o no rompe nada', () => {
    const ev = evaluarTabu(cartaDe({ coste: 4, efectos: [efecto({ verbo: 'steal_ether' })] }))
    expect(ev).toMatchObject({ max: 3, exceso: 0, estado: 'dentro', exento: false, excederiaSinExencion: false })
  })

  it('en el límite: agota su presupuesto con al menos 1 punto', () => {
    const ev = evaluarTabu(cartaDe({ coste: 3, efectos: [efecto({ verbo: 'double_attack' })] }))
    expect(ev).toMatchObject({ puntos: 2, max: 2, estado: 'en-limite' })
  })

  it('con presupuesto 0 y sin tabú queda dentro (no «en el límite»)', () => {
    const ev = evaluarTabu(cartaDe({ tipo: 'Éter', coste: 1, efectos: [efecto({ verbo: 'buff' })] }))
    expect(ev).toMatchObject({ puntos: 0, max: 0, estado: 'dentro' })
  })

  it('excede: pasa su máximo y reporta cuánto', () => {
    const ev = evaluarTabu(cartaDe({ coste: 2, efectos: [efecto({ verbo: 'double_attack' })] }))
    expect(ev).toMatchObject({ puntos: 2, max: 1, exceso: 1, estado: 'excede' })
  })

  it('los Éteres NO están exentos: steal_ether en un Éter de coste 1 excede', () => {
    const ev = evaluarTabu(carta('Éter del Desgarro'))
    expect(ev).toMatchObject({ puntos: 1, max: 0, exceso: 1, estado: 'excede', exento: false })
    expect(evaluarTabu(carta('Éter del Primogénito')).estado).toBe('excede')
    expect(evaluarTabu(carta('Éter del Viento')).estado).toBe('excede')
  })

  it('exenta: un Campeón Única, Soberano o Emperador se reporta pero nunca excede (y avisa si lo haría)', () => {
    const aurora = evaluarTabu(carta('Aurora'))
    expect(aurora).toMatchObject({ puntos: 6, max: 3, exceso: 3, estado: 'exenta', exento: true, excederiaSinExencion: true })
    expect(evaluarTabu(carta('Ragnar'))).toMatchObject({ estado: 'exenta', excederiaSinExencion: true })
    const soberano = evaluarTabu(cartaDe({ roles: ['Soberano'], coste: 2, efectos: [efecto({ verbo: 'double_attack' })] }))
    expect(soberano).toMatchObject({ estado: 'exenta', excederiaSinExencion: true })
    const unica = evaluarTabu(cartaDe({ rareza: 'Única', coste: 4 }))
    expect(unica).toMatchObject({ estado: 'exenta', excederiaSinExencion: false })
  })

  it('la exención es solo de Campeones: una Mística Única sí puede exceder', () => {
    const ev = evaluarTabu(cartaDe({ tipo: 'Mística', rareza: 'Única', coste: 2, efectos: [efecto({ verbo: 'double_attack' })] }))
    expect(ev.estado).toBe('excede')
  })

  it('coste 0 (Vínculos) no tiene presupuesto ni veredicto', () => {
    const ev = evaluarTabu(carta('Cristal del Nudo'))
    expect(ev).toMatchObject({ puntos: 1, max: null, exceso: 0, estado: 'sin-presupuesto' })
  })

  it('lee la tabla de la config que recibe', () => {
    const cfg = clon()
    cfg.tabu.tabuMaxPorCoste[3] = 1
    expect(evaluarTabu(carta('Elena'), cfg)).toMatchObject({ max: 1, estado: 'excede' })
    expect(evaluarTabu(carta('Elena'))).toMatchObject({ max: 2, estado: 'en-limite' })
  })

  it('cada estado tiene su etiqueta en español', () => {
    expect(Object.keys(ETIQUETA_ESTADO_TABU).sort()).toEqual(['dentro', 'en-limite', 'excede', 'exenta', 'sin-presupuesto'])
  })
})

describe('calibración: Estásis y Disonancia con el catálogo y el presupuesto vigentes', () => {
  const resumen = resumenTabuPorMazo(CARTAS)
  const de = (mazo: string) => resumen.find((r) => r.mazo === mazo)

  it('Estásis (rediseñada y aceptada) queda casi toda dentro: ninguna carta excede', () => {
    expect(de('estasis')).toMatchObject({ cartas: 33, total: 18, medio: 0.55, excede: 0, enLimite: 2, exentasQueExcederian: 1 })
    expect(de('estasis')?.porNivel).toEqual({ 0: 23, 1: 6, 2: 4, 3: 0 })
  })

  it('Disonancia: los tres Éteres de coste 1 con tabú (DS-006, DS-007, DS-008) exceden', () => {
    expect(de('disonancia')).toMatchObject({ cartas: 33, total: 17, medio: 0.52, excede: 3, enLimite: 3, exentasQueExcederian: 1 })
    expect(de('disonancia')?.porNivel).toEqual({ 0: 21, 1: 11, 2: 1, 3: 0 })
    const excedidas = CARTAS.filter((c) => evaluarTabu(c).estado === 'excede').map((c) => c.id)
    expect(excedidas.sort()).toEqual(['DS-006', 'DS-007', 'DS-008'])
  })

  it('la referencia nunca entra en el resumen, salvo que se pida', () => {
    const referencia = { ...carta('Elena'), id: 'PR-999', esReferencia: true, mazo: 'estasis' as const }
    expect(resumenTabuPorMazo([...CARTAS, referencia]).find((r) => r.mazo === 'estasis')?.cartas).toBe(33)
    expect(resumenTabuPorMazo([...CARTAS, referencia], CONFIG_V1, { incluirReferencia: true }).find((r) => r.mazo === 'estasis')?.cartas).toBe(34)
  })

  it('un mazo sin cartas tiene total 0 y medio null (nunca NaN)', () => {
    const solo = resumenTabuPorMazo(CARTAS.filter((c) => c.mazo === 'estasis'))
    expect(solo.find((r) => r.mazo === 'disonancia')).toMatchObject({ cartas: 0, total: 0, medio: null, excede: 0 })
  })
})
