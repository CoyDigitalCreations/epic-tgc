/**
 * Lote 1 del rediseño de Disonancia: reglas nuevas (olvido_rival, peaje_bloqueo), bandera `alAzar`, verbo «arrebata» de
 * steal_ether y defectos del generador de textos (diagnóstico §4: «puedes» en tercera persona, prefijo de Reserva,
 * rival_discard opcional y plural de los objetivos «todos»).
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../../shared/types/cards'

const campeonRival = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
const campeonPropio = { tipo: 'campeon', controlador: 'propio', zona: 'campo' } as const
const eterRivalReserva = { tipo: 'eter', controlador: 'rival', zona: 'reserva', zonaDestino: 'reserva', controladorDestino: 'propio' } as const

describe('olvido_rival', () => {
  it('Maldición del Sur (hechizo, hasta el final del turno)', () => {
    const t = generateEffectText({ tipo: 'hechizo', efecto: 'modificar_regla', reglaEnumerada: 'olvido_rival', duracion: 'turno' })
    expect(t).toBe('Las cartas del rival que irían a su Cementerio se exilian en su lugar, hasta el final del turno.')
  })
  it('sin duración: la frase exacta del diseño', () => {
    const t = generateEffectText({ tipo: 'vinculo', efecto: 'modificar_regla', reglaEnumerada: 'olvido_rival' })
    expect(t).toBe('Las cartas del rival que irían a su Cementerio se exilian en su lugar.')
  })
  it('Continuo de Ragnar: con el coste de bloqueo y la duración', () => {
    const t = generateEffectText({
      tipo: 'continuo', efecto: 'modificar_regla', reglaEnumerada: 'olvido_rival', duracion: 'mientras_tenga_eter_bloqueado',
      costo: { tipo: 'bloqueo_fijo', cantidad: 3 }, activacion: 'una_por_turno', reagrupar: { fase: 'alba', turno: 'propio', alcance: 'todo' },
    })
    expect(t).toBe('Una vez por turno, bloquea 3 Éter, las cartas del rival que irían a su Cementerio se exilian en su lugar, mientras tenga Éter bloqueado. Al inicio de tu Alba reagrupa todo el Éter bloqueado en esta carta.')
  })
})

describe('peaje_bloqueo', () => {
  const peaje = (n?: number): EfectoData => ({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'peaje_bloqueo', reglaValor: n })
  it('Comandante de Ragnar: Peaje de 1 Éter', () => {
    expect(generateEffectText(peaje(1))).toBe('Para bloquear a tus Campeones, el rival paga 1 Éter por cada uno.')
  })
  it('con otro valor', () => {
    expect(generateEffectText(peaje(2))).toBe('Para bloquear a tus Campeones, el rival paga 2 Éter por cada uno.')
  })
  it('sin valor cae a 1 (igual que el tributo)', () => {
    expect(generateEffectText(peaje(undefined))).toBe('Para bloquear a tus Campeones, el rival paga 1 Éter por cada uno.')
  })
  it('buff de Comandante (ATQ 2): «Incremento de 2 de ATQ.»', () => {
    const buff: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }
    expect(generateEffectText(buff)).toBe('Incremento de 2 de ATQ.')
  })
})

describe('alAzar en rival_discard', () => {
  const base: EfectoData = { tipo: 'pago', efecto: 'rival_discard', trigger: 'al_pagar_eter', objetivo: { tipo: 'rival_hand', controlador: 'rival', zona: 'mano' }, cantidad: 1 }
  it('Éter del Trueno: «al azar»', () => {
    expect(generateEffectText({ ...base, alAzar: true })).toBe('Cuando pagues esta carta, el rival descarta 1 carta de su mano al azar.')
  })
  it('sin la bandera el texto no cambia', () => {
    expect(generateEffectText(base)).toBe('Cuando pagues esta carta, el rival descarta 1 carta de su mano.')
  })
  it('varias cartas', () => {
    expect(generateEffectText({ ...base, cantidad: 2, alAzar: true })).toBe('Cuando pagues esta carta, el rival descarta 2 cartas de su mano al azar.')
  })
})

describe('rival_discard opcional vs obligatorio', () => {
  const deuda: EfectoData = {
    tipo: 'vinculo', efecto: 'rival_discard', trigger: 'inicio_alba', objetivo: { tipo: 'rival_hand', controlador: 'rival', zona: 'mano' },
    cantidad: 1, duracion: '1_por_turno', alAzar: true,
  }
  it('con trigger y sin coste es opcional: «puedes descartar»', () => {
    expect(generateEffectText(deuda)).toBe('Al inicio de tu Alba, puedes hacer que el rival descarte 1 carta de su mano al azar, una vez por turno.')
  })
  it('obligatorio: sin «puedes»', () => {
    expect(generateEffectText({ ...deuda, obligatorio: true })).toBe('Al inicio de tu Alba, el rival descarta 1 carta de su mano al azar, una vez por turno.')
  })
  it('Mística sin trigger: obligatorio de siempre', () => {
    expect(generateEffectText({ tipo: 'hechizo', efecto: 'rival_discard', objetivo: { tipo: 'rival_hand', controlador: 'rival', zona: 'mano' }, cantidad: 2 }))
      .toBe('El rival descarta 2 cartas de su mano.')
  })
  it('con «Cuando pagues esta carta» (el pago ya es la elección) sigue sin «puedes»', () => {
    expect(generateEffectText({ tipo: 'pago', efecto: 'rival_discard', trigger: 'al_pagar_eter', objetivo: { tipo: 'rival_hand', controlador: 'rival', zona: 'mano' }, cantidad: 1 }))
      .toBe('Cuando pagues esta carta, el rival descarta 1 carta de su mano.')
  })
})

describe('steal_ether: «arrebata»', () => {
  it('Éter del Desgarro: arrebata 1 Éter de la Reserva del rival', () => {
    const t = generateEffectText({ tipo: 'pago', efecto: 'steal_ether', trigger: 'al_pagar_eter', objetivo: eterRivalReserva, cantidad: 1 })
    expect(t).toBe('Cuando pagues esta carta, arrebata 1 Éter de la Reserva del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('hasta 2 (Disparo de Ragnar)', () => {
    const t = generateEffectText({ tipo: 'disparo', efecto: 'steal_ether', costo: { tipo: 'eter', cantidad: 2 }, activacion: 'una_por_turno', objetivo: eterRivalReserva, cantidad: 2, esHasta: true })
    expect(t).toBe('Puedes pagar 2 Éter, una vez por turno, arrebata hasta 2 Éter de la Reserva del rival y puedes usarlos desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('sin cantidad: 1', () => {
    const t = generateEffectText({ tipo: 'hechizo', efecto: 'steal_ether', objetivo: eterRivalReserva })
    expect(t).toBe('Arrebata 1 Éter de la Reserva del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('opcional con trigger y sin coste (Draven): «puedes arrebatar»', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'steal_ether', trigger: 'al_matar_en_combate', objetivo: eterRivalReserva, cantidad: 1 })
    expect(t).toBe('Al matar en combate, puedes arrebatar 1 Éter de la Reserva del rival y usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('obligatorio: sin «puedes»', () => {
    const t = generateEffectText({ tipo: 'vinculo', efecto: 'steal_ether', trigger: 'inicio_alba', activacion: undefined, objetivo: eterRivalReserva, cantidad: 1, obligatorio: true, duracion: '1_por_turno' })
    expect(t).toBe('Al inicio de tu Alba, arrebata 1 Éter de la Reserva del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival, una vez por turno.')
  })
  it('steal_ether de la zona de pago del rival', () => {
    const t = generateEffectText({ tipo: 'hechizo', efecto: 'steal_ether', objetivo: { ...eterRivalReserva, zona: 'pagado' }, cantidad: 1 })
    expect(t).toBe('Arrebata 1 Éter de la zona de pago del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('con un objetivo que no es Éter del rival conserva «toma control de»', () => {
    const t = generateEffectText({ tipo: 'hechizo', efecto: 'steal_ether', objetivo: { tipo: 'eter', controlador: 'propio', zona: 'reserva' }, cantidad: 1 })
    expect(t).toContain('Toma control de')
  })
})

describe('defecto (a): sin «puedes» cuando el objetivo es el sujeto del verbo', () => {
  it('Campeón del rival (Kael)', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'debuff', trigger: 'al_atacar', objetivo: campeonRival, stats: { ATQ: -1 }, duracion: 'turno' })
    expect(t).toBe('Al atacar, un Campeón que controla el rival pierde 1 de ATQ, hasta el final del turno.')
  })
  it('Campeón propio (Primer Nudo)', () => {
    const t = generateEffectText({ tipo: 'vinculo', efecto: 'buff', trigger: 'inicio_alba', objetivo: campeonPropio, stats: { ATQ: 2 }, duracion: 'turno' })
    expect(t).toBe('Al inicio de tu Alba, un Campeón que controles gana 2 de ATQ, hasta el final del turno.')
  })
  it('grant_keyword (FB-028)', () => {
    const t = generateEffectText({ tipo: 'vinculo', efecto: 'grant_keyword', keyword: 'Inmortal', trigger: 'inicio_alba', controladorTrigger: 'rival', objetivo: campeonPropio, duracion: '1_por_turno' })
    expect(t).toBe('Al inicio de la Alba del rival, un Campeón que controles gana Inmortal, una vez por turno.')
  })
  it('obligatorio no cambia', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'debuff', trigger: 'al_atacar', objetivo: campeonRival, stats: { ATQ: -1 }, obligatorio: true })
    expect(t).toBe('Al atacar, un Campeón que controla el rival pierde 1 de ATQ.')
  })
  it('los verbos de complemento siguen con «puedes» (exiliar, devolver)', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'exile', trigger: 'al_invocar', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio' }, cantidad: 1 })
    expect(t).toBe('Al ser invocada, puedes exiliar 1 Campeón del Cementerio del rival.')
  })
})

describe('defecto (b): prefijo de Reserva / bloqueo + trigger', () => {
  it('«Mientras esté en tu Reserva, al inicio…» en minúscula (Éter de la Tormenta)', () => {
    const t = generateEffectText({ tipo: 'reserva', efecto: 'grant_keyword', keyword: 'Carga', trigger: 'inicio_choque', objetivo: campeonPropio, duracion: 'turno' })
    expect(t).toBe('Mientras esté en tu Reserva, al inicio de tu Choque, un Campeón que controles gana Carga, hasta el final del turno.')
  })
  it('«Mientras esté bloqueado, al atacar…»', () => {
    const t = generateEffectText({ tipo: 'bloqueo', efecto: 'buff', trigger: 'al_atacar', objetivo: campeonPropio, stats: { ATQ: 1 } })
    expect(t).toBe('Mientras esté bloqueado, al atacar, el Campeón que tenga este Éter gana 1 de ATQ.')
  })
  it('sin trigger el prefijo no cambia', () => {
    const t = generateEffectText({ tipo: 'reserva', efecto: 'debuff', objetivo: campeonRival, stats: { ATQ: 1 } })
    expect(t).toBe('Mientras esté en tu Reserva, un Campeón que controla el rival pierde 1 de ATQ.')
  })
  it('«Cuando pagues esta carta» de un Éter de pago no lleva prefijo', () => {
    const t = generateEffectText({ tipo: 'pago', efecto: 'debuff', trigger: 'al_pagar_eter', objetivo: campeonRival, stats: { RES: 2 }, duracion: 'turno' })
    expect(t).toBe('Cuando pagues esta carta, un Campeón que controla el rival pierde 2 de RES, hasta el final del turno.')
  })
})

describe('defecto (d): plural con todos_campeones_*', () => {
  const todosRivales = { tipo: 'todos_campeones_rivales', controlador: 'rival', zona: 'campo' } as const
  const todosPropios = { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } as const
  it('rivales pierden (Thane)', () => {
    const t = generateEffectText({ tipo: 'continuo', efecto: 'debuff', objetivo: todosRivales, stats: { ATQ: -1 }, duracion: 'mientras_ester_bloqueado' })
    expect(t).toBe('Todos los Campeones que controla el rival pierden 1 de ATQ, mientras ese Éter esté bloqueado.')
  })
  it('con trigger y sin coste sigue en plural y sin «puedes»', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'debuff', trigger: 'al_resolver_cadena', objetivo: todosRivales, stats: { ATQ: -3 }, duracion: 'turno' })
    expect(t).toBe('Al resolver la cadena, todos los Campeones que controla el rival pierden 3 de ATQ, hasta el final del turno.')
  })
  it('propios ganan', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'buff', trigger: 'al_invocar', objetivo: todosPropios, stats: { ATQ: 1 } })
    expect(t).toBe('Al ser invocada, todos tus Campeones ganan 1 de ATQ.')
  })
  it('buff por Éter bloqueado en plural', () => {
    const t = generateEffectText({ tipo: 'continuo', efecto: 'buff', objetivo: todosPropios, stats: { ATQ: 1 }, buffPerBlockedEther: true })
    expect(t).toBe('Todos tus Campeones ganan 1 de ATQ por cada Éter bloqueado.')
  })
  it('grant_keyword en plural', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'grant_keyword', keyword: 'Carga', trigger: 'inicio_choque', objetivo: todosPropios, duracion: 'turno' })
    expect(t).toBe('Al inicio de tu Choque, todos tus Campeones ganan Carga, hasta el final del turno.')
  })
  it('el singular de buffPerBlockedEther no cambia', () => {
    const t = generateEffectText({ tipo: 'continuo', efecto: 'buff', objetivo: campeonPropio, stats: { ATQ: 1 }, buffPerBlockedEther: true })
    expect(t).toBe('Un Campeón que controles gana 1 de ATQ por cada Éter bloqueado.')
  })
})
