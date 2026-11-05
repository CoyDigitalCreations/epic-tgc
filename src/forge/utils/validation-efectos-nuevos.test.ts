import { describe, it, expect } from 'vitest'
import { validateCard } from './validation'

describe('validateCard — efectos nuevos del Card-Maker (Aurora, Memoria del Reino...)', () => {
  const campeon = (efecto: object) => ({
    id: 'T-4', name: 'Campeón', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '', paqueteId: 'test', limiteCopias: '3',
    createdAt: '', updatedAt: '', facciones: ['Orden'], stats: { cost: 3, poder: 2, resistencia: 2 }, efectos: [efecto],
  }) as never
  const msj = (efecto: object) => validateCard(campeon(efecto)).filter((e) => e.field === 'efectos').map((e) => e.message)
  const OBJ_CAMPEON = { tipo: 'campeon', controlador: 'propio', zona: 'campo' }

  describe('«Una vez por turno» con cualquier coste', () => {
    const MIRA = { tipo: 'disparo', efecto: 'draw', costo: { tipo: 'eter', cantidad: 1 }, activacion: 'una_por_turno' }
    it('con coste de Éter es válido', () => expect(msj(MIRA)).toEqual([]))
    it('sin coste se rechaza', () => {
      expect(msj({ ...MIRA, costo: undefined })).toEqual(['Efecto 1: la «Activación» «una vez por turno» necesita un coste (Éter, Bloqueo fijo, Agotar...)'])
    })
    it('«una vez mientras siga bloqueado» sigue siendo solo del bloqueo fijo', () => {
      expect(msj({ ...MIRA, activacion: 'una_mientras_bloqueado' })).toEqual(['Efecto 1: la «Activación» «una vez mientras siga bloqueado» solo sirve con el coste «Bloqueo fijo»'])
    })
  })

  describe('activar_disparo', () => {
    const AURORA = { tipo: 'disparo', efecto: 'activar_disparo', costo: { tipo: 'eter', cantidad: 2 }, objetivo: { ...OBJ_CAMPEON, excluyeEsta: true } }
    it('es válido con las dos opciones, con una o con ninguna', () => {
      expect(msj({ ...AURORA, sinPagarCosto: true, sinAgotar: true })).toEqual([])
      expect(msj({ ...AURORA, sinAgotar: true })).toEqual([])
      expect(msj({ ...AURORA, sinPagarCosto: true })).toEqual([])
      expect(msj(AURORA)).toEqual([])
    })
    it('necesita un Campeón como objetivo', () => {
      expect(msj({ ...AURORA, objetivo: undefined })).toEqual(['Efecto 1: «Activar Disparo» necesita un Campeón como objetivo'])
    })
  })

  describe('anclar_eter', () => {
    const ANCLA = { tipo: 'hechizo', efecto: 'anclar_eter', cantidad: 2 }
    it('con cantidad ≥ 1 es válido', () => expect(msj(ANCLA)).toEqual([]))
    it('sin cantidad o con 0 se rechaza', () => {
      const error = ['Efecto 1: «Anclar Éter» necesita una cantidad de al menos 1']
      expect(msj({ ...ANCLA, cantidad: undefined })).toEqual(error)
      expect(msj({ ...ANCLA, cantidad: 0 })).toEqual(error)
    })
  })

  describe('modificar_regla con regla enumerada', () => {
    it('disparo_sin_agotar en un Comandante con «una vez por turno» es válido (sin coste)', () => {
      expect(msj({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', activacion: 'una_por_turno' })).toEqual([])
    })
    it('disparo_sin_agotar fuera de un Comandante se rechaza', () => {
      expect(msj({ tipo: 'pasivo', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar' })).toEqual(['Efecto 1: «El efecto Disparo no agota» es una regla de Comandante (aplica a los Campeones de su facción)'])
    })
    it('coste_campeones_rival_mas necesita su valor ≥ 1', () => {
      const TRIBUTO = { tipo: 'continuo', efecto: 'modificar_regla', reglaEnumerada: 'coste_campeones_rival_mas', reglaValor: 1, costo: { tipo: 'bloqueo_fijo', cantidad: 3 }, activacion: 'una_por_turno' }
      expect(msj(TRIBUTO)).toEqual([])
      expect(msj({ ...TRIBUTO, reglaValor: undefined })).toEqual(['Efecto 1: indica cuántos Éter más cuestan (mínimo 1)'])
      expect(msj({ ...TRIBUTO, reglaValor: 0 })).toEqual(['Efecto 1: indica cuántos Éter más cuestan (mínimo 1)'])
    })
    it('no admite una regla del manual y una enumerada a la vez', () => {
      expect(msj({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 } })).toEqual(['Efecto 1: elige una regla del manual O una regla enumerada, no las dos'])
    })
    it('una regla enumerada con otro efecto se rechaza', () => {
      expect(msj({ tipo: 'comandante', efecto: 'buff', reglaEnumerada: 'disparo_sin_agotar' })).toEqual(['Efecto 1: la regla enumerada solo sirve con el efecto «Modificar una regla»'])
    })
    it('la regla del manual de siempre sigue validándose igual', () => {
      expect(msj({ tipo: 'pasivo', efecto: 'modificar_regla' })).toEqual(['Efecto 1: elige qué regla del manual modifica'])
    })
  })

  describe('trigger «Cuando un Campeón va al Cementerio» y objetivo «El Campeón del trigger»', () => {
    const MEMORIA = {
      tipo: 'hechizo', trigger: 'cuando_campeon_propio_al_cementerio', efecto: 'recuperar_mano', costo: { tipo: 'bloqueo_fijo', cantidad: 2 }, activacion: 'una_por_turno',
      objetivo: { tipo: 'campeon_del_trigger', controlador: 'propio', zona: 'cementerio' },
    }
    it('completo es válido', () => expect(msj(MEMORIA)).toEqual([]))
    it('el objetivo sin su trigger se rechaza', () => {
      expect(msj({ ...MEMORIA, trigger: 'al_invocar' })).toEqual(['Efecto 1: el objetivo «El Campeón del trigger» necesita el trigger «Cuando un Campeón va al Cementerio»'])
    })
    it('el trigger sin objetivo se rechaza', () => {
      expect(msj({ ...MEMORIA, objetivo: undefined })).toEqual(['Efecto 1: el trigger «Cuando un Campeón va al Cementerio» necesita un objetivo (p. ej. «El Campeón del trigger»)'])
    })
  })

  describe('varias entradas de Comandante en una carta', () => {
    it('no hay ninguna regla que limite a una', () => {
      const carta = {
        id: 'T-5', name: 'Aurora', type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '', paqueteId: 'test', limiteCopias: '3',
        createdAt: '', updatedAt: '', facciones: ['Orden'], stats: { cost: 3, poder: 2, resistencia: 2 },
        efectos: [
          { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2, RES: 2 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } },
          { tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', activacion: 'una_por_turno' },
        ],
      } as never
      expect(validateCard(carta).filter((e) => e.field === 'efectos')).toEqual([])
    })
  })
})
