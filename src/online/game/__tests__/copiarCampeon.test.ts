// @vitest-environment node
/**
 * Copiar a un CAMPEÓN (`copy` con `copyAttributes`), de un solo uso y con duración (p. ej. «Al ser invocada, copia ...
 * hasta el final del turno»). Además de ATQ/RES/keyword (ya cubiertos), ahora:
 *  - `faccion`: pasa a tener TODAS las Facciones del objetivo (mismo mecanismo que change_type);
 *  - `efecto`: tiene, además de los suyos, los efectos copiables del objetivo (pasivos, continuos y Disparos; NO Comandante,
 *    NO los que bloquean Éter, NO otro `copy`) hasta que acabe la copia. Son efectos de verdad: se activan, disparan, dan
 *    auras y modifican reglas como los impresos.
 * Cartas SINTÉTICAS.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { faccionesDe } from '../atributos'
import { interpretEffect } from '../effectInterpreter'
import { statsDe, triggersQueMatchean } from '../efectos'
import { efectosPrestadosDe, metaDeInstancia } from '../efectosInstancia'
import { reglaNumero } from '../reglas'
import { purgarReglasTemporales, reiniciarCampeon } from '../reglasTemporales'
import { validarActivarHabilidad } from '../habilidades'
import { getValidActions } from '../validActions'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { cargarCartasPrueba, conCampeon, conEteres, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, efectos: unknown[] = [], facciones: string[] = ['Orden'], extra: Record<string, unknown> = {}): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones, stats: { cost: 2, poder: 2, resistencia: 2 }, efectos, ...extra }) as never
const COPIA =(atributos: string[]): EfectoData =>
  ({ tipo: 'pasivo', efecto: 'copy', trigger: 'al_invocar', duracion: 'turno', copyAttributes: atributos as never, objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' } })

const DISPARO = { tipo: 'disparo', efecto: 'destroy', objetivo: { tipo: 'mistica', controlador: 'rival', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 } }
const AURA = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: 2, RES: 0 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }
const TRIG = { tipo: 'pasivo', trigger: 'al_atacar', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self' } }
const REGLA = { tipo: 'pasivo', efecto: 'modificar_regla', regla: { id: 'ataquesPorTurno', operacion: 'sumar', valor: 1 }, objetivo: { tipo: 'self' } }
const COMANDANTE = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: 1, RES: 1 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    campeon('T-COPIADOR', [COPIA(['faccion'])]),
    campeon('T-COPIADOR-EF', [COPIA(['efecto'])]),
    campeon('T-PLANO', []),
    campeon('T-DUAL', [], ['Orden', 'Mutación']),
    campeon('T-FUENTE', [DISPARO, AURA, TRIG, REGLA]),
    campeon('T-CON-COM', [], ['Orden'], { efectoComandante: COMANDANTE }),
    campeon('T-BLOQUEA', [{ tipo: 'continuo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self' }, costo: { tipo: 'eter_bloqueado', cantidad: 1 } }]),
    campeon('T-OTRA-COPIA', [COPIA(['atq'])]),
  ])
})

/** A: `copiador` (carta `cardId`) y B: `objetivo` (carta `objetivoCard`). Ejecuta el copy ya con el objetivo elegido. */
function copiar(cardId: string, objetivoCard: string, atributos: string[]): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A')
  conCampeon(s, 'A', 'copiador', cardId, 0); conCampeon(s, 'B', 'objetivo', objetivoCard, 0)
  interpretEffect(s, crearCtx(), s.instances.copiador, COPIA(atributos), { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: 'objetivo' })
  return s
}

describe('copiar la Facción de un Campeón', () => {
  it('pasa a tener la Facción del objetivo, y vuelve a la suya al terminar la copia', () => {
    const s = copiar('T-COPIADOR', 'T-DUAL', ['faccion'])
    expect(faccionesDe(s, 'copiador')).toEqual(['Orden', 'Mutación']) // TODAS las del objetivo
    purgarReglasTemporales(s, 'ocaso')
    expect(faccionesDe(s, 'copiador')).toEqual(['Orden'])
  })
  it('una sola Facción', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'copiador', 'T-COPIADOR', 0); conCampeon(s, 'B', 'objetivo', 'T-PLANO', 0)
    s.instances.objetivo.cardId = 'T-DUAL' // la fuente tiene dos; el objetivo ahora es T-DUAL
    interpretEffect(s, crearCtx(), s.instances.copiador, COPIA(['faccion']), { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: 'objetivo' })
    expect(faccionesDe(s, 'copiador')).toHaveLength(2)
  })
  it('copia la Facción que el objetivo tiene AHORA (con un change_type vigente), no la impresa', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'copiador', 'T-COPIADOR', 0); conCampeon(s, 'B', 'objetivo', 'T-PLANO', 0)
    s.cambiosAtributo = [{ instId: 'objetivo', atributo: 'faccion', valor: 'Caos', duenio: 'B', expira: 'ocaso' }]
    interpretEffect(s, crearCtx(), s.instances.copiador, COPIA(['faccion']), { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: 'objetivo' })
    expect(faccionesDe(s, 'copiador')).toEqual(['Caos'])
  })
})

describe('copiar los efectos de un Campeón', () => {
  it('antes de copiar el Campeón no tiene nada de eso', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'copiador', 'T-COPIADOR-EF', 0)
    expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
    expect(metaDeInstancia(s, 'copiador')).toBe(metaDeInstancia(s, 'copiador')) // sin prestados: la misma carta del catálogo
  })
  it('guarda los efectos copiables del objetivo, añadidos DESPUÉS de los suyos', () => {
    const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
    expect(efectosPrestadosDe(s, 'copiador')).toHaveLength(4) // Disparo, aura, trigger, regla
    const meta = metaDeInstancia(s, 'copiador') as unknown as { efectos: EfectoData[] }
    expect(meta.efectos).toHaveLength(1 + 4)
    expect(meta.efectos[0].efecto).toBe('copy') // el suyo sigue primero: los índices impresos no cambian
  })
  it('es una INSTANTÁNEA: no cambia si luego se toca al objetivo', () => {
    const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
    s.instances.objetivo.cardId = 'T-PLANO'
    expect(efectosPrestadosDe(s, 'copiador')).toHaveLength(4)
  })
  it('termina con la duración de la copia (fin del turno)', () => {
    const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
    purgarReglasTemporales(s, 'ocaso')
    expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
    expect(s.efectosPrestados).toBeUndefined()
  })
  it('una carta que cambia de zona es nueva: pierde lo copiado', () => {
    const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
    reiniciarCampeon(s, 'copiador')
    expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
  })

  describe('los efectos copiados SON efectos de verdad', () => {
    it('el Disparo copiado se puede ACTIVAR (y desaparece al terminar la copia)', () => {
      const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto']); const eter = conEteres(s, 'A', 1)
      const accion = { type: 'activar_habilidad', cardInstanceId: 'copiador', eterIds: eter } as const
      expect(validarActivarHabilidad(s, accion)).toBeNull()
      expect(getValidActions(s, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'copiador')).toBe(true)
      purgarReglasTemporales(s, 'ocaso')
      expect(validarActivarHabilidad(s, accion)).toMatch(/Éter|activa|habilidad|bloque/i)
    })
    it('el aura copiada beneficia a los Campeones propios', () => {
      const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto']); conCampeon(s, 'A', 'amigo', 'T-PLANO', 1)
      expect(statsDe(s, 'amigo').poder).toBe(4) // 2 + el aura de +2
      purgarReglasTemporales(s, 'ocaso')
      expect(statsDe(s, 'amigo').poder).toBe(2)
    })
    it('el trigger copiado se dispara', () => {
      const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
      expect(triggersQueMatchean(s, 'al-atacar', 'A', ['copiador'])).toHaveLength(1)
      purgarReglasTemporales(s, 'ocaso')
      expect(triggersQueMatchean(s, 'al-atacar', 'A', ['copiador'])).toEqual([])
    })
    it('la regla que modifica el efecto copiado se aplica', () => {
      const s = copiar('T-COPIADOR-EF', 'T-FUENTE', ['efecto'])
      expect(reglaNumero(s, 'ataquesPorTurno', { instId: 'copiador' })).toBe(2)
      purgarReglasTemporales(s, 'ocaso')
      expect(reglaNumero(s, 'ataquesPorTurno', { instId: 'copiador' })).toBe(1)
    })
  })

  describe('qué NO se copia', () => {
    it('el efecto de COMANDANTE (inmutable, §10)', () => {
      const s = copiar('T-COPIADOR-EF', 'T-CON-COM', ['efecto'])
      expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
      conCampeon(s, 'A', 'amigo', 'T-PLANO', 1)
      expect(statsDe(s, 'amigo').poder).toBe(2) // sin el aura de Comandante
    })
    it('los efectos que bloquean Éter (el Éter bloqueado dura más que la copia)', () => {
      const s = copiar('T-COPIADOR-EF', 'T-BLOQUEA', ['efecto'])
      expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
    })
    it('otro `copy`', () => {
      const s = copiar('T-COPIADOR-EF', 'T-OTRA-COPIA', ['efecto'])
      expect(efectosPrestadosDe(s, 'copiador')).toEqual([])
    })
  })

  it('se pueden copiar a la vez Facción, ATQ y efectos', () => {
    const s = copiar('T-COPIADOR-EF', 'T-DUAL', ['faccion', 'atq', 'efecto'])
    expect(faccionesDe(s, 'copiador')).toEqual(['Orden', 'Mutación'])
    expect(statsDe(s, 'copiador').poder).toBe(2)
  })
})
