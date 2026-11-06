/**
 * Lote 5A del rediseño de Disonancia: pulido del generador de textos (DS-008, DS-032, DS-033, DS-004, DS-023,
 * DS-026 y DS-013). Los textos ya expresaban el efecto, pero sonaban torpes.
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../../shared/types/cards'

const rivalMano = { tipo: 'rival_hand', controlador: 'rival', zona: 'mano' } as const
const self = { tipo: 'self', controlador: 'propio', zona: 'campo' } as const

describe('direct_attack = «no puede ser bloqueado» (regla puedeSerBloqueado prohibida)', () => {
  it('DS-008: Éter bloqueante', () => {
    const e: EfectoData = { tipo: 'bloqueo', efecto: 'direct_attack', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' } }
    expect(generateEffectText(e)).toBe('Mientras esté bloqueado, el Campeón que tenga este Éter no puede ser bloqueado.')
  })
  it('con trigger no lleva «puedes» (el Campeón es el sujeto)', () => {
    const e: EfectoData = { tipo: 'continuo', trigger: 'inicio_alba', efecto: 'direct_attack', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' } }
    expect(generateEffectText(e)).not.toMatch(/puedes/)
    expect(generateEffectText(e)).toMatch(/no puede ser bloqueado/)
  })
})

describe('pluralizeTarget con zona al final', () => {
  it('DS-032: «hasta 2 cartas del Cementerio del rival»', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'exile', objetivo: { tipo: 'carta', controlador: 'rival', zona: 'cementerio' }, cantidad: 2, esHasta: true }
    expect(generateEffectText(e)).toBe('Exilia hasta 2 cartas del Cementerio del rival.')
  })
  it('singular intacto', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'exile', objetivo: { tipo: 'carta', controlador: 'rival', zona: 'cementerio' }, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Exilia 1 carta del Cementerio del rival.')
  })
  it('zona propia', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'exile', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'cementerio' }, cantidad: 3 }
    expect(generateEffectText(e)).toBe('Exilia 3 cartas de tu Cementerio.')
  })
})

describe('modificar_regla de jugador con frase natural', () => {
  const rupturas: EfectoData = { tipo: 'hechizo', efecto: 'modificar_regla', objetivo: self, regla: { id: 'rupturasPorTurno', operacion: 'sumar', valor: 1 }, duracion: 'turno' }
  const atacar: EfectoData = { tipo: 'hechizo', efecto: 'modificar_regla', objetivo: self, regla: { id: 'atacarTrasRuptura', operacion: 'permitir' }, duracion: 'turno' }
  it('DS-033 (1.º): una Ruptura más', () => {
    expect(generateEffectText(rupturas)).toBe('Este turno puedes romper un Vínculo más con tus Rupturas.')
  })
  it('varias rupturas más', () => {
    expect(generateEffectText({ ...rupturas, regla: { id: 'rupturasPorTurno', operacion: 'sumar', valor: 2 } })).toBe('Este turno puedes romper 2 Vínculos más con tus Rupturas.')
  })
  it('DS-033 (2.º): seguir atacando tras romper', () => {
    expect(generateEffectText(atacar)).toBe('Este turno puedes seguir atacando después de romper un Vínculo.')
  })
  it('sin duración de turno no lleva «este turno»', () => {
    expect(generateEffectText({ ...atacar, duracion: undefined })).toBe('Puedes seguir atacando después de romper un Vínculo.')
  })
  it('otras reglas siguen con la frase de catálogo', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'modificar_regla', objetivo: self, regla: { id: 'limiteMano', operacion: 'sumar', valor: 2 } }
    expect(generateEffectText(e)).toBe('Límite de mano +2.')
  })
})

describe('rival_discard nombra de quién es la mano', () => {
  it('DS-004: Éter de pago', () => {
    const e: EfectoData = { tipo: 'pago', efecto: 'rival_discard', trigger: 'al_pagar_eter', objetivo: rivalMano, cantidad: 1, alAzar: true }
    expect(generateEffectText(e)).toBe('Cuando pagues esta carta, el rival descarta 1 carta de su mano al azar.')
  })
  it('DS-023: Arcana/Hechizo sin trigger', () => {
    const e: EfectoData = { tipo: 'hechizo', efecto: 'rival_discard', objetivo: rivalMano, cantidad: 1, alAzar: true }
    expect(generateEffectText(e)).toBe('El rival descarta 1 carta de su mano al azar.')
  })
  it('DS-026: Vínculo opcional', () => {
    const e: EfectoData = { tipo: 'vinculo', efecto: 'rival_discard', trigger: 'inicio_alba', objetivo: { tipo: 'carta', controlador: 'rival', zona: 'mano' }, cantidad: 1, duracion: '1_por_turno', alAzar: true }
    expect(generateEffectText(e)).toBe('Al inicio de tu Alba, puedes hacer que el rival descarte 1 carta de su mano al azar, una vez por turno.')
  })
  it('obligatorio con trigger y varias cartas', () => {
    const e: EfectoData = { tipo: 'vinculo', efecto: 'rival_discard', trigger: 'inicio_alba', objetivo: rivalMano, cantidad: 2, obligatorio: true }
    expect(generateEffectText(e)).toBe('Al inicio de tu Alba, el rival descarta 2 cartas de su mano.')
  })
})

describe('filtro agotado', () => {
  it('DS-013: sin doble «que»', () => {
    const e: EfectoData = { tipo: 'disparo', costo: { tipo: 'eter', cantidad: 4 }, efecto: 'destroy', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo', filtros: { agotado: true } }, cantidad: 1 }
    expect(generateEffectText(e)).toBe('Puedes pagar 4 Éter, destruye 1 Campeón agotado que controla el rival.')
  })
})
