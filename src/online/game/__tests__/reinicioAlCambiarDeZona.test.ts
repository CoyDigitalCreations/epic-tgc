// @vitest-environment node
/**
 * Una carta que cambia de zona es una carta NUEVA (decisión del usuario, 2026-10-27): al llegar al Cementerio y al
 * (re)entrar al campo pierde buffs, keywords concedidas, cambios de Facción/Esencia/Rol, reglas temporales sobre ella
 * (p. ej. efectos negados), el agotamiento y los contadores del turno. El reinicio del Cementerio va DESPUÉS de «al ser
 * enviado al Cementerio», que todavía necesita ver el estado (un Campeón con efectos negados no dispara ese trigger).
 * Cartas SINTÉTICAS.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { faccionesDe } from '../atributos'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { keywordsDe, statsDe } from '../efectos'
import { destruirCarta } from '../replacements'
import { efectosNegados } from '../reglas'
import { aplicarCambioAtributo, aplicarReglaTemporal } from '../reglasTemporales'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { cargarCartasPrueba, conCampeon, conMazo, crearCtx, enCementerio, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, efectos: unknown[] = []): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos }) as never
const ROBA_AL_MORIR = { tipo: 'pasivo', trigger: 'al_ser_enviado_al_cementerio', efecto: 'draw', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' } }

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([campeon('T-CAMP'), campeon('T-MUERE', [ROBA_AL_MORIR])])
})

/** Un Campeón de A marcado con todo lo que se acumula en el campo. */
function marcado(cardId = 'T-CAMP'): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A')
  conCampeon(s, 'A', 'x', cardId, 0, { agotado: true, opcionUsadaEsteTurno: true, bloqueosEsteTurno: 1, keywordsTemporales: ['Carga'], modificadores: [{ stat: 'poder', valor: 3 } as never] })
  aplicarCambioAtributo(s, { instId: 'x', atributo: 'faccion', valor: 'Caos', duenio: 'A', expira: 'permanente' })
  aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio: 'A', expira: 'permanente', sujeto: { tipo: 'carta', instId: 'x' } })
  return s
}

describe('al llegar al Cementerio', () => {
  it('antes de morir está marcado (control)', () => {
    const s = marcado()
    expect(statsDe(s, 'x').poder).toBe(5)
    expect(keywordsDe(s, 'x')).toContain('Carga')
    expect(faccionesDe(s, 'x')).toContain('Caos')
    expect(efectosNegados(s, 'x')).toBe(true)
  })
  it('la carta vuelve limpia: sin buffs, keywords, cambios de atributo, reglas temporales ni agotamiento', () => {
    const s = marcado(); destruirCarta(s, crearCtx(), 'x', 'efecto')
    expect(s.players.A.cementerio).toContain('x')
    expect(statsDe(s, 'x').poder).toBe(2)
    expect(keywordsDe(s, 'x')).not.toContain('Carga')
    expect(faccionesDe(s, 'x')).toEqual(['Orden'])
    expect(efectosNegados(s, 'x')).toBe(false)
    expect(s.instances.x.agotado).toBeUndefined()
    expect(s.instances.x.opcionUsadaEsteTurno).toBeUndefined()
    expect(s.reglasTemporales).toBeUndefined()
    expect(s.cambiosAtributo).toBeUndefined()
  })
  it('lo de OTRAS cartas no se toca', () => {
    const s = marcado(); conCampeon(s, 'A', 'otro', 'T-CAMP', 1, { modificadores: [{ stat: 'poder', valor: 1 } as never] })
    aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio: 'A', expira: 'permanente', sujeto: { tipo: 'carta', instId: 'otro' } })
    destruirCarta(s, crearCtx(), 'x', 'efecto')
    expect(statsDe(s, 'otro').poder).toBe(3)
    expect(efectosNegados(s, 'otro')).toBe(true)
  })
  it('un Campeón con efectos NEGADOS no dispara «al ser enviado al Cementerio» (el reinicio va después del trigger)', () => {
    const s = marcado('T-MUERE')
    destruirCarta(s, crearCtx(), 'x', 'efecto')
    expect(s.players.A.mano).toEqual([]) // negado: no robó
  })
  it('control: sin negación ese mismo trigger sí roba', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A'); conCampeon(s, 'A', 'x', 'T-MUERE', 0)
    destruirCarta(s, crearCtx(), 'x', 'efecto')
    expect(s.players.A.mano).toHaveLength(1)
  })
})

describe('al (re)entrar al campo', () => {
  it('reanimar un Campeón entra limpio y enderezado, no con el +3 ATQ ni el agotamiento con que murió', () => {
    const s = marcado()
    // simula una muerte que dejó la carta sucia en el Cementerio (p. ej. salió por una vía sin reinicio)
    s.players.A.campo.campeones[0] = null; s.players.A.cementerio.push('x')
    const invocar: EfectoData = { tipo: 'disparo', efecto: 'invocar', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'cementerio' } }
    s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-CAMP', owner: 'A' }
    interpretEffect(s, crearCtx(), s.instances.fuente, invocar, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: 'x' })
    expect(s.players.A.campo.campeones).toContain('x')
    expect(statsDe(s, 'x').poder).toBe(2)
    expect(efectosNegados(s, 'x')).toBe(false)
    expect(s.instances.x.agotado).toBeUndefined()
    expect(s.instances.x.entradaEsteTurno).toBe(true) // sigue con invocación cansada
  })
  it('tutor al campo también entra limpio', () => {
    const s = marcado()
    s.players.A.campo.campeones[0] = null; s.players.A.mazo.push('x')
    const tutor: EfectoData = { tipo: 'disparo', efecto: 'tutor', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'mazo', zonaDestino: 'campo' } }
    s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-CAMP', owner: 'A' }
    interpretEffect(s, crearCtx(), s.instances.fuente, tutor, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: 'x' })
    expect(statsDe(s, 'x').poder).toBe(2)
    expect(efectosNegados(s, 'x')).toBe(false)
  })
})
