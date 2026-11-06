import { describe, it, expect } from 'vitest'
import { limpiarCamposAjenos } from '../limpiar-efecto'
import type { EfectoData } from '../../../shared/types'

describe('limpiarCamposAjenos — campos de los efectos nuevos', () => {
  it('«una vez por turno» sobrevive con coste de Éter y se quita sin coste', () => {
    const conEter: EfectoData = { tipo: 'disparo', efecto: 'draw', costo: { tipo: 'eter', cantidad: 1 }, activacion: 'una_por_turno' }
    expect(limpiarCamposAjenos(conEter)).toBe(conEter)
    expect(limpiarCamposAjenos({ ...conEter, costo: undefined }).activacion).toBeUndefined()
  })

  it('«una vez mientras siga bloqueado» solo se conserva con bloqueo fijo', () => {
    const eter: EfectoData = { tipo: 'disparo', efecto: 'draw', costo: { tipo: 'eter', cantidad: 1 }, activacion: 'una_mientras_bloqueado' }
    expect(limpiarCamposAjenos(eter).activacion).toBeUndefined()
    const fijo: EfectoData = { ...eter, costo: { tipo: 'bloqueo_fijo', cantidad: 1 } }
    expect(limpiarCamposAjenos(fijo)).toBe(fijo)
  })

  it('disparo_sin_agotar conserva su «una vez por turno» sin coste', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', activacion: 'una_por_turno' }
    expect(limpiarCamposAjenos(e)).toBe(e)
  })

  it('reglaEnumerada, sinAgotar y opcionFondo se quitan si el efecto cambia', () => {
    expect(limpiarCamposAjenos({ tipo: 'pasivo', efecto: 'buff', reglaEnumerada: 'disparo_sin_agotar', reglaValor: 1 }).reglaEnumerada).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'draw', sinAgotar: true, sinPagarCosto: true }).sinAgotar).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'draw', opcionFondo: true }).opcionFondo).toBeUndefined()
  })

  it('los campos nuevos se conservan en su propio efecto', () => {
    const e: EfectoData = { tipo: 'disparo', efecto: 'activar_disparo', sinAgotar: true, sinPagarCosto: true }
    expect(limpiarCamposAjenos(e)).toBe(e)
    const s: EfectoData = { tipo: 'pago', efecto: 'scry', opcionFondo: true }
    expect(limpiarCamposAjenos(s)).toBe(s)
  })
})

describe('limpiarCamposAjenos — alAzar (Lote 1 de Disonancia)', () => {
  it('alAzar se conserva en rival_discard y se quita si el efecto cambia', () => {
    const e: EfectoData = { tipo: 'pago', efecto: 'rival_discard', alAzar: true }
    expect(limpiarCamposAjenos(e)).toBe(e)
    expect(limpiarCamposAjenos({ tipo: 'pago', efecto: 'draw', alAzar: true }).alAzar).toBeUndefined()
  })
  it('peaje_bloqueo conserva su reglaValor', () => {
    const e: EfectoData = { tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'peaje_bloqueo', reglaValor: 1 }
    expect(limpiarCamposAjenos(e)).toBe(e)
  })
})
