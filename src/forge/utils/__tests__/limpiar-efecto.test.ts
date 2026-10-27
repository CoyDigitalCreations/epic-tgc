import { describe, expect, it } from 'vitest'
import type { AnyCard, EfectoData } from '../../../shared/types'
import { camposAjenosVacios, limpiarCamposAjenos, limpiarEfectosDeCarta } from '../limpiar-efecto'

/** Thane (DS-014) tal como estaba: un `negar` con el resto escondido de cuando era otra cosa. */
const THANE: EfectoData = {
  tipo: 'disparo', trigger: 'ninguno', efecto: 'negar', tipoNegacion: 'efecto_activo', duracion: 'turno',
  copyAttributes: ['atq'], costo: { tipo: 'eter', cantidad: 3 },
}
const carta = (efectos: EfectoData[], extra: Record<string, unknown> = {}) => ({ id: 'X', name: 'X', type: 'Campeón', efectos, ...extra }) as unknown as AnyCard

describe('limpiarCamposAjenos', () => {
  it('quita el copyAttributes escondido de un efecto que ya no es copy (Thane)', () => {
    const limpio = limpiarCamposAjenos(THANE)
    expect(limpio.copyAttributes).toBeUndefined()
    expect('copyAttributes' in limpio).toBe(false)
    expect(limpio.tipoNegacion).toBe('efecto_activo') // lo suyo se queda
    expect(limpio.costo).toEqual({ tipo: 'eter', cantidad: 3 })
  })
  it('no toca un efecto que ya está limpio (mismo objeto)', () => {
    const copy: EfectoData = { tipo: 'pasivo', efecto: 'copy', copyAttributes: ['atq', 'res'] }
    expect(limpiarCamposAjenos(copy)).toBe(copy)
    const negar: EfectoData = { tipo: 'disparo', efecto: 'negar', tipoNegacion: 'activacion' }
    expect(limpiarCamposAjenos(negar)).toBe(negar)
  })
  it('cada campo se queda solo con SU efecto', () => {
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'buff', tipoNegacion: 'activacion' }).tipoNegacion).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'buff', cambioTipo: { rol: 'Normal' } as never }).cambioTipo).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'buff', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 } as never }).regla).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'disparo', efecto: 'change_type', cambioTipo: { rol: 'Normal' } as never }).cambioTipo).toBeDefined()
    expect(limpiarCamposAjenos({ tipo: 'pasivo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 } as never }).regla).toBeDefined()
  })
  it('quita el `stats` escondido de Thane (negar) y de un grant_keyword (Ragnar), pero no el de un buff', () => {
    expect(limpiarCamposAjenos({ ...THANE, stats: { ATQ: 1 } }).stats).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'pasivo', efecto: 'grant_keyword', keyword: 'Indestructible', stats: { ATQ: 3 } }).stats).toBeUndefined()
    const buff: EfectoData = { tipo: 'disparo', efecto: 'buff', stats: { ATQ: 2 }, buffPerBlockedEther: true }
    expect(limpiarCamposAjenos(buff)).toBe(buff)
  })
  it('el buffPerBlockedEther escondido de un copy (Marek) se va; la keyword de un grant_keyword se queda', () => {
    expect(limpiarCamposAjenos({ tipo: 'pasivo', efecto: 'copy', copyAttributes: ['atq'], buffPerBlockedEther: true }).buffPerBlockedEther).toBeUndefined()
    const kw: EfectoData = { tipo: 'pasivo', efecto: 'grant_keyword', keyword: 'Carga' }
    expect(limpiarCamposAjenos(kw)).toBe(kw)
  })
  it('quita la clave obsoleta zonaActivacion (FB-009), aunque el efecto no tenga `efecto` raíz', () => {
    const e = { tipo: 'bloqueo', efecto: 'buff', stats: { ATQ: 1 }, zonaActivacion: 'bloqueo' } as unknown as EfectoData
    expect('zonaActivacion' in limpiarCamposAjenos(e)).toBe(false)
    expect(limpiarCamposAjenos(e).stats).toEqual({ ATQ: 1 })
  })
  it('un costo SIN tipo (vacío o a medias: Aurora, FB-024) se quita; uno con tipo se queda', () => {
    expect(limpiarCamposAjenos({ tipo: 'pasivo', efecto: 'buff', costo: {} as never }).costo).toBeUndefined()
    expect(limpiarCamposAjenos({ tipo: 'hechizo', efecto: 'buff', costo: { cantidad: 1 } as never }).costo).toBeUndefined()
    const bien: EfectoData = { tipo: 'disparo', efecto: 'destroy', costo: { tipo: 'eter', cantidad: 2 } }
    expect(limpiarCamposAjenos(bien)).toBe(bien)
  })
  it('un debuff con magnitudes negativas (DS-002) se normaliza a positivas; uno mixto o ya positivo no', () => {
    expect(limpiarCamposAjenos({ tipo: 'reserva', efecto: 'debuff', stats: { ATQ: -1 } }).stats).toEqual({ ATQ: 1 })
    expect(limpiarCamposAjenos({ tipo: 'reserva', efecto: 'debuff', stats: { ATQ: -2, RES: -1 } }).stats).toEqual({ ATQ: 2, RES: 1 })
    const positivo: EfectoData = { tipo: 'reserva', efecto: 'debuff', stats: { ATQ: 1 } }
    expect(limpiarCamposAjenos(positivo)).toBe(positivo)
    const mixto: EfectoData = { tipo: 'reserva', efecto: 'debuff', stats: { ATQ: -1, RES: 1 } }
    expect(limpiarCamposAjenos(mixto)).toBe(mixto)
    const buff: EfectoData = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: -1 } } // un buff negativo es otra cosa: no se toca
    expect(limpiarCamposAjenos(buff)).toBe(buff)
  })
  it('un efecto sin `efecto` raíz (los tramos definen los suyos) no se toca', () => {
    const tramos: EfectoData = { tipo: 'continuo', copyAttributes: ['atq'], tramos: [{ umbral: 1, efecto: 'toggle_exhaust' }] } as never
    expect(limpiarCamposAjenos(tramos)).toBe(tramos)
  })
})

describe('camposAjenosVacios (el parche del formulario al cambiar de efecto)', () => {
  it('al pasar a negar vacía todo lo ajeno, pero NO tipoNegacion', () => {
    const parche = camposAjenosVacios('negar')
    expect(Object.keys(parche).sort()).toEqual(['buffPerBlockedEther', 'cambioTipo', 'copyAttributes', 'keyword', 'regla', 'stats'])
    expect(Object.values(parche).every((v) => v === undefined)).toBe(true)
  })
  it('al pasar a copy conserva copyAttributes y vacía el resto', () => {
    expect(Object.keys(camposAjenosVacios('copy')).sort()).toEqual(['buffPerBlockedEther', 'cambioTipo', 'keyword', 'regla', 'stats', 'tipoNegacion'])
  })
  it('buff y debuff comparten stats y buffPerBlockedEther: pasar de uno a otro NO los borra', () => {
    for (const efecto of ['buff', 'debuff'] as const) {
      const claves = Object.keys(camposAjenosVacios(efecto))
      expect(claves).not.toContain('stats')
      expect(claves).not.toContain('buffPerBlockedEther')
    }
  })
  it('grant_keyword conserva su keyword pero vacía los stats', () => {
    const claves = Object.keys(camposAjenosVacios('grant_keyword'))
    expect(claves).not.toContain('keyword')
    expect(claves).toContain('stats')
  })
  it('sin efecto vacía todos', () => {
    expect(Object.keys(camposAjenosVacios(undefined)).sort()).toEqual(['buffPerBlockedEther', 'cambioTipo', 'copyAttributes', 'keyword', 'regla', 'stats', 'tipoNegacion'])
  })
})

describe('limpiarEfectosDeCarta', () => {
  it('limpia todos los efectos de la carta, sin tocar el resto', () => {
    const c = carta([THANE], { texto: 'x' })
    const limpia = limpiarEfectosDeCarta(c) as unknown as { efectos: EfectoData[]; texto: string }
    expect(limpia.efectos[0].copyAttributes).toBeUndefined()
    expect(limpia.texto).toBe('x')
  })
  it('también el efecto de Comandante', () => {
    const c = carta([], { efectoComandante: THANE })
    expect((limpiarEfectosDeCarta(c) as unknown as { efectoComandante: EfectoData }).efectoComandante.copyAttributes).toBeUndefined()
  })
  it('una carta limpia vuelve igual (mismo objeto)', () => {
    const c = carta([{ tipo: 'disparo', efecto: 'negar', tipoNegacion: 'activacion' }])
    expect(limpiarEfectosDeCarta(c)).toBe(c)
  })
  it('no modifica la carta original', () => {
    const c = carta([THANE]); limpiarEfectosDeCarta(c)
    expect((c as unknown as { efectos: EfectoData[] }).efectos[0].copyAttributes).toEqual(['atq'])
  })
})
