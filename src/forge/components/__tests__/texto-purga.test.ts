/**
 * Purga (borradores → Card-Maker): el generador de textos y la validación conocen los verbos, triggers, coste y filtros nuevos.
 * Todo es ADITIVO: los textos de las cartas existentes (Estásis y Disonancia) no cambian; ver textos-seed.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import { validateCard } from '../../utils/validation'
import type { EfectoData, AnyCard } from '../../../shared/types'

const rival = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
const propio = { tipo: 'campeon', controlador: 'propio', zona: 'campo' } as const

describe('verbos nuevos de Purga', () => {
  it('quitar_buffs: el Campeón es el sujeto', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'quitar_buffs', objetivo: rival, cantidad: 1, duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Un Campeón que controla el rival pierde sus incrementos de ATQ y RES, hasta el final del turno.')
  })
  it('quitar_buffs por cada Éter bloqueado (Idris)', () => {
    const e: EfectoData = {
      tipo: 'continuo', efecto: 'quitar_buffs', objetivo: rival, costo: { tipo: 'eter_bloqueado', cantidad: 5 },
      buffPerBlockedEther: true, duracion: 'mientras_ester_bloqueado',
    }
    expect(generateEffectText(e)).toBe(
      'Puedes bloquear hasta un máximo de 5 Éter (Max. 5), por cada Éter bloqueado, un Campeón que controla el rival pierde sus incrementos de ATQ y RES, mientras ese Éter esté bloqueado.',
    )
  })
  it('igualar_stats_al_menor (La Balanza)', () => {
    const e: EfectoData = { tipo: 'disparo', efecto: 'igualar_stats_al_menor', objetivo: rival, costo: { tipo: 'eter', cantidad: 2 }, activacion: 'una_por_turno', duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Puedes pagar 2 Éter, una vez por turno, el ATQ y la RES de un Campeón que controla el rival se igualan al menor de los dos valores, hasta el final del turno.')
  })
  it('mill y draw_discard', () => {
    const mazo = { tipo: 'carta', controlador: 'propio', zona: 'mazo' } as const
    expect(generateEffectText({ tipo: 'pago', trigger: 'al_pagar_eter', efecto: 'mill', objetivo: mazo, cantidad: 1 })).toBe('Cuando pagues esta carta, envía la carta superior de tu mazo a tu Cementerio.')
    expect(generateEffectText({ tipo: 'pago', trigger: 'al_pagar_eter', efecto: 'draw_discard', objetivo: mazo, cantidad: 1 })).toBe('Cuando pagues esta carta, roba 1 carta de tu mazo y descarta 1 carta de tu mano.')
  })
})

describe('triggers observadores, causa del envío y coste de Cementerio', () => {
  it('«cuando juegues una Mística» con «una vez por turno» antes del trigger', () => {
    const e: EfectoData = {
      tipo: 'hechizo', trigger: 'cuando_juegas_mistica', costo: { tipo: 'bloqueo_fijo', cantidad: 1 }, activacion: 'una_por_turno',
      efecto: 'draw', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' }, cantidad: 1, reagrupar: { fase: 'alba', turno: 'propio' },
    }
    expect(generateEffectText(e)).toBe('Una vez por turno, cuando juegues una Mística, bloquea 1 Éter, roba 1 carta de tu mazo. Al inicio de tu Alba reagrupa el Éter usado por este efecto.')
  })
  it('Comandante con trigger: se dice como un efecto normal', () => {
    const e: EfectoData = {
      tipo: 'comandante', trigger: 'cuando_activas_arcana', efecto: 'buff', stats: { ATQ: 1, RES: 0 },
      objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' }, duracion: 'turno',
    }
    expect(generateEffectText(e)).toBe('Cuando actives una Arcana, todos tus Campeones ganan 1 de ATQ, hasta el final del turno.')
  })
  it('Comandante SIN trigger sigue siendo «Incremento de…»', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2, RES: 2 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }
    expect(generateEffectText(e)).toBe('Incremento de 2 de ATQ y 2 de RES.')
  })
  it('causaEnvio + invocar al Campeón del trigger con rango de coste (Apelación)', () => {
    const e: EfectoData = {
      tipo: 'hechizo', trigger: 'cuando_campeon_propio_al_cementerio', causaEnvio: ['destruccion', 'combate'], costo: { tipo: 'bloqueo_fijo', cantidad: 2 },
      activacion: 'una_por_turno', efecto: 'recuperar_campo', objetivo: { tipo: 'campeon_del_trigger', controlador: 'propio', zona: 'cementerio', filtros: { costeMin: 1, costeMax: 3 } },
    }
    expect(generateEffectText(e)).toBe('Una vez por turno, cuando un Campeón que controles sea enviado al Cementerio por destrucción o combate, bloquea 2 Éter, invócalo de tu Cementerio si su coste es de 1 a 3.')
  })
  it('coste de referencia (Pena Diferida e Idris)', () => {
    const base = { tipo: 'hechizo', efecto: 'destroy', cantidad: 1 } as const
    expect(generateEffectText({ ...base, objetivo: { ...rival, filtros: { costeMaxDeReferencia: 'trigger' } } })).toBe('Destruye 1 Campeón que controla el rival de coste igual o menor al de ese Campeón.')
    expect(generateEffectText({ ...base, objetivo: { ...rival, filtros: { costeMaxDeReferencia: 'sacrificado' } } })).toBe('Destruye 1 Campeón que controla el rival de coste igual o menor al del Campeón sacrificado.')
  })
  it('coste «exilia Campeones de tu Cementerio»', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'destroy', costo: { tipo: 'exilia_cementerio_propio', cantidad: 1 }, objetivo: rival, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Puedes exiliar 1 Campeón de tu Cementerio, destruye 1 Campeón que controla el rival.')
  })
})

describe('pulido de redacción (solo casos nuevos)', () => {
  it('buscar una Mística o Arcana: femenino', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'tutor', zonaOrigen: 'mazo', objetivo: { tipo: 'arcana', zonaDestino: 'mano' } as EfectoData['objetivo'] }
    expect(generateEffectText(e)).toBe('Busca 1 Arcana de tu mazo y agrégala a tu mano.')
  })
  it('buscar un Campeón sigue en masculino', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'tutor', zonaOrigen: 'mazo', objetivo: { tipo: 'campeon', zonaDestino: 'campo', filtros: { costeMin: 1, costeMax: 3 } } as EfectoData['objetivo'] }
    expect(generateEffectText(e)).toBe('Busca 1 Campeón de coste 1 a 3 de tu mazo e invócalo al campo.')
  })
  it('plural con filtros después del sustantivo', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'destroy', objetivo: { ...rival, filtros: { costeMax: 2 } }, cantidad: 2, esHasta: true }
    expect(generateEffectText(e)).toBe('Destruye hasta 2 Campeones coste 2 o menos que controla el rival.')
  })
  it('recuperar_exilio no repite «del Exilio»', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'recuperar_exilio', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'exilio' }, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Devuelve del Exilio 1 Campeón.')
  })
  it('regla enumerada rival_sin_incrementos_res', () => {
    const e: EfectoData = { tipo: 'vinculo', efecto: 'modificar_regla', reglaEnumerada: 'rival_sin_incrementos_res' }
    expect(generateEffectText(e)).toBe('Los Campeones del rival no pueden recibir incrementos de RES.')
  })
})

describe('validación de lo nuevo', () => {
  const mistica = (efecto: EfectoData): Partial<AnyCard> => ({
    id: 'T-1', name: 'T', type: 'Mística', rarity: 'Común', keywords: [], flavorText: 'x', limiteCopias: '1', stats: { cost: 2 }, efectos: [efecto],
  } as unknown as Partial<AnyCard>)
  const errores = (efecto: EfectoData) => validateCard(mistica(efecto)).map((e) => e.message)

  it('la regla enumerada nueva existe', () => {
    expect(errores({ tipo: 'hechizo', efecto: 'modificar_regla', reglaEnumerada: 'rival_sin_incrementos_res' })).toEqual([])
  })
  it('causaEnvio solo con el trigger del Cementerio', () => {
    expect(errores({ tipo: 'hechizo', efecto: 'destroy', objetivo: rival, causaEnvio: ['combate'] }).join()).toMatch(/Solo si llega por/)
  })
  it('costeMaxDeReferencia exige su trigger', () => {
    expect(errores({ tipo: 'hechizo', efecto: 'destroy', objetivo: { ...rival, filtros: { costeMaxDeReferencia: 'trigger' } } }).join()).toMatch(/Coste máx\./)
    expect(errores({ tipo: 'hechizo', efecto: 'destroy', objetivo: { ...rival, filtros: { costeMaxDeReferencia: 'sacrificado' } } }).join()).toMatch(/Al invocar/)
  })
})
