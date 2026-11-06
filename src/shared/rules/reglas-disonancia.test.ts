/**
 * Lote 1 de Disonancia: las dos reglas de catálogo nuevas y su mapeo desde las reglas enumeradas (solo datos; el
 * comportamiento de juego es del Lote 4).
 */
import { describe, it, expect } from 'vitest'
import { REGLAS, REGLA_IDS } from './reglas'
import { reglaDeEfecto } from '../../online/game/reglas'

describe('catálogo REGLAS: Olvido y Peaje', () => {
  it('cementerioAlExilio: jugador, booleana, base false', () => {
    expect(REGLAS.cementerioAlExilio).toMatchObject({ ambito: 'jugador', base: false })
    expect(REGLA_IDS).toContain('cementerioAlExilio')
  })
  it('costeBloqueo: jugador, número, base 0, mínimo 0', () => {
    expect(REGLAS.costeBloqueo).toMatchObject({ ambito: 'jugador', base: 0, min: 0 })
    expect(REGLA_IDS).toContain('costeBloqueo')
  })
})

describe('reglaDeEfecto: reglas enumeradas nuevas', () => {
  it('olvido_rival permite cementerioAlExilio', () => {
    expect(reglaDeEfecto({ tipo: 'hechizo', efecto: 'modificar_regla', reglaEnumerada: 'olvido_rival' })).toEqual({ id: 'cementerioAlExilio', operacion: 'permitir' })
  })
  it('peaje_bloqueo suma reglaValor a costeBloqueo (1 por defecto)', () => {
    expect(reglaDeEfecto({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'peaje_bloqueo', reglaValor: 2 })).toEqual({ id: 'costeBloqueo', operacion: 'sumar', valor: 2 })
    expect(reglaDeEfecto({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'peaje_bloqueo' })).toEqual({ id: 'costeBloqueo', operacion: 'sumar', valor: 1 })
  })
})
