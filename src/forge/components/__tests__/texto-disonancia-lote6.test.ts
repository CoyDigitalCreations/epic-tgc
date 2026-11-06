/**
 * Lote 6 del rediseño de Disonancia (correcciones del dueño tras revisar el Card-Maker):
 *  - «Arrebato» (steal_ether) explica a dónde va el Éter y que es prestado.
 *  - Las CONDICIONES de Arcana (tener_eter_pagado, tener_mano_maximo, ...) se leen en español natural, según lo que evalúa
 *    `condicionCumple` (src/online/game/efectos.ts), y una guarda recorre TODOS los tipos de condición.
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import { condicionArcanaTexto } from '../fields/CondicionArcanaField'
import { CONDICION_TIPOS, type CondicionEfecto, type CondicionItem, type EfectoData } from '../../../shared/types/cards'

const reserva = { tipo: 'eter', controlador: 'rival', zona: 'reserva', zonaDestino: 'reserva', controladorDestino: 'propio' } as const
const SUFIJO_1 = 'y usarlo desde tu Reserva hasta el inicio del Alba del rival'
const SUFIJO_N = 'y usarlos desde tu Reserva hasta el inicio del Alba del rival'

describe('steal_ether: «arrebata» explica el destino y que el Éter es prestado', () => {
  it('DS-010 Ragnar (coste + una vez por turno + hasta 2): «y puedes usarlos…»', () => {
    const e: EfectoData = { tipo: 'disparo', efecto: 'steal_ether', costo: { tipo: 'eter', cantidad: 2 }, activacion: 'una_por_turno', objetivo: reserva, cantidad: 2, esHasta: true }
    expect(generateEffectText(e)).toBe('Puedes pagar 2 Éter, una vez por turno, arrebata hasta 2 Éter de la Reserva del rival y puedes usarlos desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('DS-007 (al pagar): singular, sin «puedes» duplicado en el verbo', () => {
    const e: EfectoData = { tipo: 'pago', trigger: 'al_pagar_eter', efecto: 'steal_ether', objetivo: reserva, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Cuando pagues esta carta, arrebata 1 Éter de la Reserva del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('DS-012 Draven (trigger sin coste): «puedes arrebatar … y usarlo» (un solo «puedes»)', () => {
    const e: EfectoData = { tipo: 'pasivo', trigger: 'al_matar_en_combate', efecto: 'steal_ether', objetivo: reserva, cantidad: 1 }
    const t = generateEffectText(e)
    expect(t).toBe(`Al matar en combate, puedes arrebatar 1 Éter de la Reserva del rival ${SUFIJO_1}.`)
    expect(t.match(/puedes/g)).toHaveLength(1)
  })
  it('DS-028 Cristal del Nudo (una vez por turno por duración)', () => {
    const e: EfectoData = { tipo: 'vinculo', trigger: 'inicio_alba', efecto: 'steal_ether', objetivo: reserva, cantidad: 1, duracion: '1_por_turno' }
    expect(generateEffectText(e)).toBe(`Al inicio de tu Alba, puedes arrebatar 1 Éter de la Reserva del rival ${SUFIJO_1}, una vez por turno.`)
  })
  it('plural con «puedes» opcional: «usarlos»', () => {
    const e: EfectoData = { tipo: 'pasivo', trigger: 'inicio_alba', efecto: 'steal_ether', objetivo: reserva, cantidad: 2 }
    expect(generateEffectText(e)).toBe(`Al inicio de tu Alba, puedes arrebatar 2 Éter de la Reserva del rival ${SUFIJO_N}.`)
  })
  it('singular con coste y «hasta 1»: pronombre singular', () => {
    const e: EfectoData = { tipo: 'disparo', efecto: 'steal_ether', costo: { tipo: 'eter', cantidad: 1 }, objetivo: reserva, cantidad: 1, esHasta: true }
    expect(generateEffectText(e)).toBe('Puedes pagar 1 Éter, arrebata hasta 1 Éter de la Reserva del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
  it('zona de pago del rival se sigue leyendo bien', () => {
    const e: EfectoData = { tipo: 'pago', trigger: 'al_pagar_eter', efecto: 'steal_ether', objetivo: { ...reserva, zona: 'pagado' }, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Cuando pagues esta carta, arrebata 1 Éter de la zona de pago del rival y puedes usarlo desde tu Reserva hasta el inicio del Alba del rival.')
  })
})

describe('Comandante de Ragnar: incremento de 3 de ATQ', () => {
  it('«Incremento de 3 de ATQ.» (no incrementa RES)', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 3 } }
    expect(generateEffectText(e)).toBe('Incremento de 3 de ATQ.')
  })
})

const arc = (item: CondicionItem, extra: Partial<CondicionEfecto> = {}): string =>
  condicionArcanaTexto({ trigger: 'inicio_choque', condiciones: [item], ...extra })
const rivalCampeon = { tipo: 'campeon', controlador: 'rival' } as const

describe('condiciones de Arcana en español natural (según condicionCumple)', () => {
  it('DS-023: tener_eter_pagado cuenta la zona de pago y compara >= (4 o más)', () => {
    expect(arc({ tipo: 'tener_eter_pagado', cantidad: 4, objetivo: rivalCampeon })).toBe('Al inicio de tu Choque, si el rival tiene 4 o más Éter en su zona de pago.')
  })
  it('DS-032: tener_mano_maximo compara <= (3 cartas o menos en la mano)', () => {
    expect(arc({ tipo: 'tener_mano_maximo', cantidad: 3, objetivo: rivalCampeon })).toBe('Al inicio de tu Choque, si el rival tiene 3 cartas o menos en la mano.')
  })
  it('singular: «1 carta o menos»', () => {
    expect(arc({ tipo: 'tener_mano_maximo', cantidad: 1, objetivo: rivalCampeon })).toBe('Al inicio de tu Choque, si el rival tiene 1 carta o menos en la mano.')
  })
  it('propio (sin objetivo): «tienes … en tu zona de pago / mano»', () => {
    expect(arc({ tipo: 'tener_eter_pagado', cantidad: 4 })).toBe('Al inicio de tu Choque, si tienes 4 o más Éter en tu zona de pago.')
    expect(arc({ tipo: 'tener_mano_maximo', cantidad: 3 })).toBe('Al inicio de tu Choque, si tienes 3 cartas o menos en tu mano.')
  })
  it('sin objetivo, manda controladorTrigger (igual que el motor)', () => {
    expect(arc({ tipo: 'tener_mano_maximo', cantidad: 3 }, { controladorTrigger: 'rival' })).toBe('Al inicio del Choque del rival, si el rival tiene 3 cartas o menos en la mano.')
  })
  it('trigger «activacion» usa subjuntivo', () => {
    expect(arc({ tipo: 'tener_eter_pagado', cantidad: 4, objetivo: rivalCampeon }, { trigger: 'activacion' })).toBe('Mientras el rival tenga 4 o más Éter en su zona de pago.')
  })
  it('tener_mano_minimo habla de cartas en la mano, no de Campeones', () => {
    expect(arc({ tipo: 'tener_mano_minimo', cantidad: 3 })).toBe('Al inicio de tu Choque, si tienes 3 o más cartas en tu mano.')
  })
  it('controlar_maximo / rival_controla_maximo', () => {
    expect(arc({ tipo: 'controlar_maximo', cantidad: 2, objetivo: { tipo: 'campeon', controlador: 'propio' } })).toBe('Al inicio de tu Choque, si controlas 2 Campeones o menos.')
    expect(arc({ tipo: 'rival_controla_maximo', cantidad: 1 })).toBe('Al inicio de tu Choque, si el rival controla 1 Campeón o menos.')
  })
  it('los tipos que ya se leían bien no cambian', () => {
    expect(arc({ tipo: 'controlar_minimo', cantidad: 2, objetivo: { tipo: 'campeon', controlador: 'propio' } }, { trigger: 'activacion' })).toBe('Mientras controles 2 o más Campeones.')
  })
})

describe('condiciones sobre el rival: indicativo salvo con «activacion» (caso FB-024)', () => {
  it('FB-024: controlar_minimo del rival con inicio_alba dice «controla», no «controle»', () => {
    expect(arc({ tipo: 'controlar_minimo', cantidad: 2, objetivo: rivalCampeon }, { trigger: 'inicio_alba' })).toBe('Al inicio de tu Alba, si el rival controla 2 o más Campeones.')
  })
  it('controlar_minimo del rival con «activacion» sí usa subjuntivo', () => {
    expect(arc({ tipo: 'controlar_minimo', cantidad: 2, objetivo: rivalCampeon }, { trigger: 'activacion' })).toBe('Mientras el rival controle 2 o más Campeones.')
  })
  it('rival_controla_minimo: indicativo con trigger de evento y subjuntivo con «activacion»', () => {
    expect(arc({ tipo: 'rival_controla_minimo', cantidad: 3, objetivo: rivalCampeon }, { trigger: 'inicio_alba' })).toBe('Al inicio de tu Alba, si el rival controla 3 o más Campeones.')
    expect(arc({ tipo: 'rival_controla_minimo', cantidad: 3, objetivo: rivalCampeon }, { trigger: 'activacion' })).toBe('Mientras el rival controle 3 o más Campeones.')
  })
  it('controlar_minimo propio no cambia', () => {
    expect(arc({ tipo: 'controlar_minimo', cantidad: 2, objetivo: { tipo: 'campeon', controlador: 'propio' } })).toBe('Al inicio de tu Choque, si controlas 2 o más Campeones.')
  })
})

describe('tener_eter_bloqueado: cuenta Campeones con Éter bloqueado (>= N) y dice a quién (según condicionCumple)', () => {
  it('propio: «tienes N o más Campeones con Éter bloqueado»', () => {
    expect(arc({ tipo: 'tener_eter_bloqueado', cantidad: 2 })).toBe('Al inicio de tu Choque, si tienes 2 o más Campeones con Éter bloqueado.')
  })
  it('rival: «el rival tiene N o más Campeones con Éter bloqueado»', () => {
    expect(arc({ tipo: 'tener_eter_bloqueado', cantidad: 2, objetivo: rivalCampeon })).toBe('Al inicio de tu Choque, si el rival tiene 2 o más Campeones con Éter bloqueado.')
  })
  it('sin cantidad el motor exige 1 (min por defecto): el texto también', () => {
    expect(arc({ tipo: 'tener_eter_bloqueado' })).toBe('Al inicio de tu Choque, si tienes 1 o más Campeones con Éter bloqueado.')
  })
  it('con «activacion» usa subjuntivo', () => {
    expect(arc({ tipo: 'tener_eter_bloqueado', cantidad: 1, objetivo: rivalCampeon }, { trigger: 'activacion' })).toBe('Mientras el rival tenga 1 o más Campeones con Éter bloqueado.')
  })
})

describe('GUARDA: ninguna condición emite el identificador crudo ni un valor vacío', () => {
  const triggers: CondicionEfecto['trigger'][] = ['inicio_choque', 'inicio_alba', 'al_atacar', 'al_invocar', 'al_resolver_cadena', 'activacion']
  const objetivos: (CondicionItem['objetivo'] | undefined)[] = [
    undefined,
    { tipo: 'campeon', controlador: 'propio' },
    { tipo: 'campeon', controlador: 'rival' },
    { tipo: 'mistica', controlador: 'rival' },
  ]
  for (const tipo of CONDICION_TIPOS) {
    it(`${tipo}: texto natural en toda combinación de trigger, objetivo, cantidad y quién`, () => {
      for (const trigger of triggers) for (const objetivo of objetivos) for (const cantidad of [1, 3] as const) for (const controladorTrigger of [undefined, 'rival'] as const) {
        const t = condicionArcanaTexto({ trigger, controladorTrigger, condiciones: [{ tipo, cantidad, objetivo }] })
        expect(t, `${tipo}/${trigger}/${cantidad}`).not.toMatch(/tener_|_maximo|_minimo|controlar_|controla_|undefined|NaN|null/)
        expect(t, `${tipo}/${trigger}/${cantidad}`).not.toMatch(/\s{2,}|\s,|\bsi\s*\.$/)
        // El valor siempre aparece (también en «tener_eter_bloqueado», que el motor evalúa como >= cantidad)
        expect(t, `${tipo}/${trigger}/${cantidad}`).toContain(String(cantidad))
      }
    })
  }
  it('la lista cubre los 8 tipos del motor', () => {
    expect([...CONDICION_TIPOS].sort()).toEqual([
      'controlar_maximo', 'controlar_minimo', 'rival_controla_maximo', 'rival_controla_minimo',
      'tener_eter_bloqueado', 'tener_eter_pagado', 'tener_mano_maximo', 'tener_mano_minimo',
    ])
  })
})
