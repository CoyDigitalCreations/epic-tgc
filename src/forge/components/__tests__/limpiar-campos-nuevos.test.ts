/**
 * El limpiador de campos ajenos (se aplica al editar y al exportar) NO debe borrar los campos de los verbos nuevos de Purga y Mutación:
 * si lo hiciera, el texto de la carta cambiaría en silencio (Idris perdía «por cada Éter bloqueado»).
 */
import { describe, it, expect } from 'vitest'
import { limpiarCamposAjenos } from '../../utils/limpiar-efecto'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../shared/types'

const rival = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
const todosPropios = { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } as const

describe('limpiarCamposAjenos conserva lo nuevo', () => {
  it('quitar_buffs conserva «por cada Éter bloqueado»', () => {
    const e: EfectoData = {
      tipo: 'continuo', efecto: 'quitar_buffs', objetivo: rival, costo: { tipo: 'eter_bloqueado', cantidad: 5 },
      buffPerBlockedEther: true, duracion: 'mientras_ester_bloqueado',
    }
    const limpio = limpiarCamposAjenos(e)
    expect(limpio.buffPerBlockedEther).toBe(true)
    expect(generateEffectText(limpio)).toBe(generateEffectText(e))
  })
  it('change_type conserva la esencia elegida; el requisito y los filtros de Esencia no se tocan', () => {
    const cambio: EfectoData = { tipo: 'disparo', costo: { tipo: 'eter', cantidad: 2 }, activacion: 'una_por_turno', efecto: 'change_type', objetivo: todosPropios, cambioTipo: { esenciaElegida: true }, duracion: 'turno' }
    expect(limpiarCamposAjenos(cambio)).toBe(cambio)
    const barrido: EfectoData = {
      tipo: 'disparo', costo: { tipo: 'eter', cantidad: 4 }, activacion: 'una_por_turno', requisitoCampo: { tipo: 'misma_esencia', minimo: 3 },
      efecto: 'destroy', objetivo: { tipo: 'todos_campeones', controlador: 'ambos', zona: 'campo', filtros: { esenciaDeLaCondicion: true } },
    }
    expect(limpiarCamposAjenos(barrido)).toBe(barrido)
  })
})
