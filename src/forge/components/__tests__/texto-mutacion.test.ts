/**
 * Mutación (borradores → Card-Maker): el generador de textos y la validación conocen los triggers de cambio de Esencia, el requisito
 * de campo, «todos los Campeones» y la Esencia elegida. Todo es ADITIVO: los textos de Estásis y Disonancia no cambian
 * (ver textos-seed.test.ts).
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import { validateCard } from '../../utils/validation'
import type { EfectoData, AnyCard } from '../../../shared/types'

const propio = { tipo: 'campeon', controlador: 'propio', zona: 'campo' } as const
const rival = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
const todosPropios = { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } as const

describe('cambio de Esencia', () => {
  it('Esencia fija: «se convierte en esencia X» (sin «de»)', () => {
    const e: EfectoData = { tipo: 'pasivo', trigger: 'al_atacar', efecto: 'change_type', objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' }, cambioTipo: { esencia: 'Elemental' }, duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Al atacar, esta carta se convierte en esencia Elemental, hasta el final del turno.')
  })
  it('Esencia elegida, sobre un Campeón del rival', () => {
    const e: EfectoData = { tipo: 'disparo', costo: { tipo: 'eter', cantidad: 1 }, activacion: 'una_por_turno', efecto: 'change_type', objetivo: rival, cambioTipo: { esenciaElegida: true }, duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Puedes pagar 1 Éter, una vez por turno, un Campeón que controla el rival se convierte en la esencia que elijas, hasta el final del turno.')
  })
  it('Esencia elegida sobre todos tus Campeones: el verbo concuerda en plural', () => {
    const e: EfectoData = { tipo: 'disparo', costo: { tipo: 'eter', cantidad: 3 }, activacion: 'una_por_turno', efecto: 'change_type', objetivo: todosPropios, cambioTipo: { esenciaElegida: true }, duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Puedes pagar 3 Éter, una vez por turno, todos tus Campeones se convierten en la esencia que elijas, hasta el final del turno.')
  })
  it('trigger de esta carta', () => {
    const e: EfectoData = { tipo: 'pasivo', trigger: 'al_cambiar_de_esencia', efecto: 'buff', objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' }, stats: { ATQ: 0, RES: 2 }, duracion: 'turno' }
    expect(generateEffectText(e)).toBe('Cuando esta carta cambie de Esencia, esta carta gana 2 de RES, hasta el final del turno.')
  })
  it('trigger de un Campeón propio + «una vez por turno» (duración 1_por_turno, sin coste)', () => {
    const e: EfectoData = { tipo: 'pasivo', trigger: 'cuando_campeon_propio_cambia_esencia', efecto: 'draw', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' }, cantidad: 1, obligatorio: true, duracion: '1_por_turno' }
    expect(generateEffectText(e)).toBe('Cuando un Campeón que controles cambie de Esencia, roba 1 carta de tu mazo, una vez por turno.')
  })
})

describe('requisito de campo y «todos los Campeones»', () => {
  it('el barrido: requisito + destruir todos los de esa Esencia (ambos lados)', () => {
    const e: EfectoData = {
      tipo: 'disparo', costo: { tipo: 'eter', cantidad: 4 }, activacion: 'una_por_turno', requisitoCampo: { tipo: 'misma_esencia', minimo: 3 },
      efecto: 'destroy', objetivo: { tipo: 'todos_campeones', controlador: 'ambos', zona: 'campo', filtros: { esenciaDeLaCondicion: true } },
    }
    expect(generateEffectText(e)).toBe('Puedes pagar 4 Éter, una vez por turno, si controlas 3 o más Campeones de una misma Esencia, destruye todos los Campeones de esa Esencia.')
  })
  it('continuo con requisito: Inmortal a todos tus Campeones', () => {
    const e: EfectoData = {
      tipo: 'continuo', costo: { tipo: 'bloqueo_fijo', cantidad: 2 }, activacion: 'una_mientras_bloqueado', requisitoCampo: { tipo: 'misma_esencia', minimo: 2 },
      efecto: 'grant_keyword', keyword: 'Inmortal', objetivo: todosPropios, duracion: 'mientras_ester_bloqueado',
    }
    expect(generateEffectText(e)).toBe('Bloquea 2 Éter (solo una vez mientras siga bloqueado), si controlas 2 o más Campeones de una misma Esencia, todos tus Campeones ganan Inmortal, mientras ese Éter esté bloqueado.')
  })
  it('aura de campo por Esencia (Pastor)', () => {
    const e: EfectoData = { tipo: 'continuo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { ...todosPropios, filtros: { esencia: 'Bestia' } }, duracion: 'mientras_en_campo' }
    expect(generateEffectText(e)).toBe('Todos tus Campeones de esencia Bestia ganan 1 de ATQ, mientras esta carta esté en el campo.')
  })
  it('Comandante con «comparten Esencia» deja de ser «Incremento de…» y dice el filtro', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 1, RES: 1 }, objetivo: { ...todosPropios, filtros: { comparteEsenciaConOtro: true } } }
    expect(generateEffectText(e)).toBe('Todos tus Campeones que compartan Esencia con otro Campeón que controles ganan 1 de ATQ y 1 de RES.')
  })
  it('el Comandante sin filtros sigue siendo «Incremento de…»', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2, RES: 2 }, objetivo: todosPropios }
    expect(generateEffectText(e)).toBe('Incremento de 2 de ATQ y 2 de RES.')
  })
  it('el reembolso de Yaron', () => {
    const e: EfectoData = {
      tipo: 'pasivo', trigger: 'cuando_campeon_propio_cambia_esencia', efecto: 'return_ether', cantidad: 1,
      objetivo: { tipo: 'eter', controlador: 'propio', zona: 'pagado', zonaDestino: 'reserva', controladorDestino: 'propio' }, obligatorio: true, duracion: '1_por_turno',
    }
    expect(generateEffectText(e)).toBe('Cuando un Campeón que controles cambie de Esencia, devuelve 1 Éter de tu zona de pago a tu Reserva, una vez por turno.')
  })
})

describe('validación de lo nuevo', () => {
  const campeon = (efecto: EfectoData): Partial<AnyCard> => ({
    id: 'T-1', name: 'T', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: 'x', limiteCopias: '1', stats: { cost: 2, poder: 2, resistencia: 2 },
    facciones: ['Mutación'], esencia: 'Humano', roles: ['Normal'], catHabilidad: ['Efecto'], efectos: [efecto],
  } as unknown as Partial<AnyCard>)
  const errores = (efecto: EfectoData) => validateCard(campeon(efecto)).map((e) => e.message)

  it('«la esencia que elijas» cuenta como esencia elegida', () => {
    expect(errores({ tipo: 'pasivo', efecto: 'change_type', objetivo: propio, cambioTipo: { esenciaElegida: true } })).toEqual([])
  })
  it('no se puede fijar Esencia Y elegirla', () => {
    expect(errores({ tipo: 'pasivo', efecto: 'change_type', objetivo: propio, cambioTipo: { esencia: 'Bestia', esenciaElegida: true } }).join()).toMatch(/Esencia fija O/)
  })
  it('el requisito necesita N de al menos 2', () => {
    expect(errores({ tipo: 'pasivo', efecto: 'buff', objetivo: propio, stats: { ATQ: 1 }, requisitoCampo: { tipo: 'misma_esencia', minimo: 1 } }).join()).toMatch(/al menos 2/)
  })
  it('«de esa Esencia» exige el requisito', () => {
    const e: EfectoData = { tipo: 'disparo', costo: { tipo: 'eter', cantidad: 4 }, efecto: 'destroy', objetivo: { tipo: 'todos_campeones', controlador: 'ambos', zona: 'campo', filtros: { esenciaDeLaCondicion: true } } }
    expect(errores(e).join()).toMatch(/de esa Esencia/)
    expect(errores({ ...e, requisitoCampo: { tipo: 'misma_esencia', minimo: 3 } })).toEqual([])
  })
})
