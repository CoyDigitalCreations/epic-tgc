// @vitest-environment node
/**
 * Matriz de casos borde (cierre de F9): interacciones ENTRE las reglas y efectos de las fases F7–F9, que cada archivo
 * por feature no prueba por separado. Cada caso nombra las dos piezas que se cruzan. Cartas SINTÉTICAS («Dummy»)
 * sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { statsDe } from '../efectos'
import { robarCarta } from '../draw'
import { applyAction } from '../actions'
import { reglaBool } from '../reglas'
import { resolveTargets } from '../targetResolver'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { PR, cargarCartasPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, keywords: string[], extra: Record<string, unknown> = {}): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords, facciones: ['Mutación'], esencia: 'Constructo', roles: ['Normal'], stats: { cost: 1, poder: 2, resistencia: 2 }, efectos: [], ...extra }) as never
const mistica = (id: string): AnyCard => ({ ...base, id, name: id, type: 'Mística', keywords: [], facciones: ['Mutación'], stats: { cost: 1 }, efectos: [] }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    campeon('T-ETERNO', ['Inmortal', 'Inexiliable']),
    campeon('T-DIRECTO', [], { efectos: [{ tipo: 'pasivo', efecto: 'direct_attack', objetivo: { tipo: 'self' } }] }),
    campeon('T-DEFENSOR', []),
    mistica('T-HECHIZO'),
  ])
})

const ctxN = () => crearCtx()
const lanzar = (s: GameState, e: EfectoData, objetivoId: string, quien: 'A' | 'B' = 'A') => {
  s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-HECHIZO', owner: quien }
  const ctx = ctxN()
  interpretEffect(s, ctx, s.instances.fuente, e, { jugador: quien, contextoUso: 'objetivo-elegido', objetivoId })
  return ctx
}
const objetivoCampo = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
function base0(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A'); conMazo(s, 'B'); return s
}

describe('Inmortal × Inexiliable (la misma carta con las dos protecciones)', () => {
  it('ni destruirla por efecto ni exiliarla funciona: se queda en el campo y avisa de cada intento', () => {
    const s = base0(); conCampeon(s, 'B', 'e', 'T-ETERNO', 0)
    const d = lanzar(s, { tipo: 'hechizo', efecto: 'destroy', objetivo: objetivoCampo }, 'e')
    const x = lanzar(s, { tipo: 'hechizo', efecto: 'exile', objetivo: objetivoCampo }, 'e')
    expect(s.players.B.campo.campeones[0]).toBe('e')
    expect(s.players.B.cementerio).toEqual([])
    expect(s.players.B.exilio).toEqual([])
    expect(d.events.some((e) => e.type === 'destruccion_prevenida')).toBe(true)
    expect(x.events.some((e) => e.type === 'exilio_prevenido')).toBe(true)
  })
})

describe('direct_attack × modificar_regla', () => {
  it('«permitir bloquear» no anula un ataque directo: lo que prohíbe gana a lo que permite', () => {
    const s = base0(); conCampeon(s, 'A', 'd', 'T-DIRECTO', 0)
    lanzar(s, { tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'puedeSerBloqueado', operacion: 'permitir' }, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, duracion: 'turno' }, 'd')
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'd' })).toBe(false)
  })
})

describe('Comandante × change_type (la facción vigente decide quién recibe el aura)', () => {
  it('un Campeón que cambia de facción deja de recibir el aura del Comandante de la otra', () => {
    const s = base0()
    conCampeon(s, 'A', 'cmd', PR.COMANDANTE, 0) // Mutación: +1/+1 a todos los Campeones de su facción
    conCampeon(s, 'A', 'c1', 'T-DEFENSOR', 1) // Mutación
    expect(statsDe(s, 'c1')).toEqual({ poder: 3, resistencia: 3 })
    lanzar(s, { tipo: 'hechizo', efecto: 'change_type', cambioTipo: { faccion: 'Orden' }, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' } }, 'c1')
    expect(statsDe(s, 'c1')).toEqual({ poder: 2, resistencia: 2 }) // ya no es Mutación: sin aura
  })
})

describe('Protector × filtros de valor actual', () => {
  it('el filtro «RES actual 3 o menos» sí alcanza a un Protector de RES impresa 4 si lo debilitaron; el impreso no', () => {
    const s = base0()
    conCampeon(s, 'B', 'esc', PR.ESCUDO, 0) // Protector, RES impresa 4
    conCampeon(s, 'B', 'b1', 'T-DEFENSOR', 1)
    s.instances.esc.modificadores = [{ stat: 'resistencia', valor: -1, expira: 'ocaso' } as never]
    const con = (filtros: object) => resolveTargets(s, { tipo: 'campeon', controlador: 'rival', zona: 'campo', filtros } as never, 'A')
    expect(con({ resMax: 3 })).toEqual([]) // original 4: no hay objetivo legal (Protector manda)
    expect(con({ resActualMax: 3 })).toEqual(['esc']) // actual 3: el Protector es el único objetivo
  })
})

describe('scry × robar', () => {
  it('lo que se ordena arriba es lo que se roba: la primera de `arriba` sale primero y lo mandado al fondo, al final', () => {
    const s = base0()
    s.players.A.mazo = ['a', 'b', 'c', 'd']
    for (const id of s.players.A.mazo) s.instances[id] = { cardInstanceId: id, cardId: 'T-DEFENSOR', owner: 'A' }
    lanzar(s, { tipo: 'hechizo', efecto: 'scry', cantidad: 3, objetivo: { tipo: 'self' } }, 'a')
    const r = applyAction(s, { type: 'ordenar_mazo', arriba: ['c', 'a'], fondo: ['b'] }, ctxN())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e = r.state
    const ctx = ctxN()
    robarCarta(e, ctx, 'A'); robarCarta(e, ctx, 'A'); robarCarta(e, ctx, 'A')
    expect(e.players.A.mano).toEqual(['c', 'a', 'd'])
    expect(e.players.A.mazo).toEqual(['b'])
  })
  it('con un scry pendiente solo se puede ordenar o rendirse (también el rival no actúa)', () => {
    const s = base0(); s.players.A.mazo = ['a']; s.instances.a = { cardInstanceId: 'a', cardId: 'T-DEFENSOR', owner: 'A' }
    lanzar(s, { tipo: 'hechizo', efecto: 'scry', objetivo: { tipo: 'self' } }, 'a')
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
    expect(getValidActions(s, 'A').map((a) => a.type).sort()).toEqual(['ordenar_mazo', 'rendirse'])
  })
})

describe('límite de mano modificado × descartar en el Ocaso', () => {
  const conLimite8 = (cartasEnMano: number): GameState => {
    const s = escenaVacia('ocaso')
    for (let i = 0; i < cartasEnMano; i++) conMano(s, 'A', `m${i}`, PR.PEON)
    conEteres(s, 'A', 0)
    s.reglasTemporales = [{ regla: 'limiteMano', operacion: 'sumar', valor: 2, orden: 1, sujeto: { tipo: 'jugador', jugador: 'A' }, duenio: 'A', expira: 'permanente' }]
    return s
  }
  it('con límite 8 y 8 cartas: se puede pasar el turno y no se ofrece descartar', () => {
    const tipos = getValidActions(conLimite8(8), 'A').map((a) => a.type)
    expect(tipos).toContain('pasar_turno')
    expect(tipos).not.toContain('descartar_carta')
  })
  it('con límite 8 y 9 cartas: hay que descartar y no se puede pasar', () => {
    const s = conLimite8(9)
    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).toContain('descartar_carta')
    expect(tipos).not.toContain('pasar_turno')
    expect(aplicar(s, { type: 'descartar_carta', cardInstanceIds: ['m0'] }, ctxN()).players.A.mano).toHaveLength(8)
  })
})
