// @vitest-environment node
/**
 * F9e — `change_type`: un Campeón cambia de Esencia, Rol y/o Facción (`cambioTipo`). Cada atributo SUSTITUYE al impreso
 * y dura lo que la duración del efecto. Todo el motor lee esos atributos por atributos.ts. Cartas SINTÉTICAS («Dummy»).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { campeonesSacrificables } from '../campo'
import { registrarCartas } from '../cards'
import { esenciaDe, faccionesDe, rolesDe } from '../atributos'
import { purgarEfectosTemporales } from '../efectos'
import { interpretEffect } from '../effectInterpreter'
import { resolveTargets } from '../targetResolver'
import type { EfectoData } from '../../../shared/types'
import type { FiltroObjetivo } from '../../../shared/types/cards'
import type { Ctx, GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
/** Campeón Orden / Mago / Soporte. */
const ORDEN = {
  ...base, id: 'T-ORDEN', name: 'T-ORDEN', type: 'Campeón', keywords: [], efectos: [],
  facciones: ['Orden'], esencia: 'Mago', roles: ['Soporte'], stats: { cost: 1, poder: 2, resistencia: 2 },
} as never
const CAOS = { ...(ORDEN as object), id: 'T-CAOS', name: 'T-CAOS', facciones: ['Caos'] } as never
const MIST = { ...base, id: 'T-MIST', name: 'T-MIST', type: 'Mística', keywords: [], efectos: [], stats: { cost: 1 } } as never

beforeAll(() => {
  registrarCartas([ORDEN, CAOS, MIST])
})

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
function estado(): GameState {
  const s: GameState = { version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} }
  s.instances.o1 = { cardInstanceId: 'o1', cardId: 'T-ORDEN', owner: 'A' }
  s.instances.c1 = { cardInstanceId: 'c1', cardId: 'T-CAOS', owner: 'A' }
  s.players.A.campo.campeones[0] = 'o1'
  s.players.A.campo.campeones[1] = 'c1'
  return s
}
const ctx = (): Ctx => { const events: Ctx['events'] = []; return { next: () => 0, emit: (e) => { events.push(e) }, events } }
const CAMBIO = (cambioTipo: EfectoData['cambioTipo'], extra: Partial<EfectoData> = {}): EfectoData => ({
  tipo: 'hechizo', efecto: 'change_type', cambioTipo, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, ...extra,
})
function lanzar(s: GameState, e: EfectoData, objetivoId = 'o1') {
  s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: 'A' }
  interpretEffect(s, ctx(), s.instances.fuente, e, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId })
}
const objetivos = (s: GameState, filtros: FiltroObjetivo) =>
  resolveTargets(s, { tipo: 'campeon', controlador: 'propio', zona: 'campo', filtros }, 'A')

describe('F9e — change_type', () => {
  it('sin cambios, los atributos son los impresos', () => {
    const s = estado()
    expect([esenciaDe(s, 'o1'), rolesDe(s, 'o1'), faccionesDe(s, 'o1')]).toEqual(['Mago', ['Soporte'], ['Orden']])
  })
  it('Facción: SUSTITUYE a la impresa (queda solo la nueva)', () => {
    const s = estado(); lanzar(s, CAMBIO({ faccion: 'Caos' }))
    expect(faccionesDe(s, 'o1')).toEqual(['Caos'])
    expect(esenciaDe(s, 'o1')).toBe('Mago') // lo que no se menciona no se toca
    expect(faccionesDe(s, 'c1')).toEqual(['Caos']) // otro Campeón, intacto
  })
  it('Esencia, Rol y Facción a la vez', () => {
    const s = estado(); lanzar(s, CAMBIO({ esencia: 'Guerrero', rol: 'Soberano', faccion: 'Creación' }))
    expect([esenciaDe(s, 'o1'), rolesDe(s, 'o1'), faccionesDe(s, 'o1')]).toEqual(['Guerrero', ['Soberano'], ['Creación']])
  })
  it('los filtros de objetivo ven el atributo vigente, no el impreso', () => {
    const s = estado(); lanzar(s, CAMBIO({ faccion: 'Caos', esencia: 'Bestia', rol: 'Emperador' }))
    expect(objetivos(s, { faccion: 'Orden' })).toEqual([])
    expect(objetivos(s, { faccion: 'Caos' }).sort()).toEqual(['c1', 'o1'])
    expect(objetivos(s, { esencia: 'Mago' })).toEqual(['c1'])
    expect(objetivos(s, { esencia: 'Bestia' })).toEqual(['o1'])
    expect(objetivos(s, { rol: 'Soporte' })).toEqual(['c1'])
    expect(objetivos(s, { rol: 'Emperador' })).toEqual(['o1'])
  })
  it('el más reciente de cada atributo gana', () => {
    const s = estado(); lanzar(s, CAMBIO({ faccion: 'Caos' })); lanzar(s, CAMBIO({ faccion: 'Creación' }))
    expect(faccionesDe(s, 'o1')).toEqual(['Creación'])
  })
  it('afecta a los sacrificios: la facción vigente decide quién comparte facción', () => {
    const s = estado()
    // invocando un Campeón Caos, solo c1 comparte facción
    expect(campeonesSacrificables(s, 'A', 'T-CAOS')).toEqual(['c1'])
    lanzar(s, CAMBIO({ faccion: 'Caos' }))
    expect(campeonesSacrificables(s, 'A', 'T-CAOS').sort()).toEqual(['c1', 'o1'])
  })
  it('sin cambioTipo no hace nada', () => {
    const s = estado(); lanzar(s, CAMBIO(undefined))
    expect(s.cambiosAtributo).toBeUndefined()
  })
})

describe('F9e — duración', () => {
  it('«turno»: se revierte en el Ocaso', () => {
    const s = estado(); lanzar(s, CAMBIO({ faccion: 'Caos' }, { duracion: 'turno' }))
    expect(faccionesDe(s, 'o1')).toEqual(['Caos'])
    purgarEfectosTemporales(s, 'ocaso')
    expect(faccionesDe(s, 'o1')).toEqual(['Orden'])
    expect(s.cambiosAtributo).toBeUndefined()
  })
  it('«n_turnos»: dura n Ocasos', () => {
    const s = estado(); lanzar(s, CAMBIO({ esencia: 'Bestia' }, { duracion: 'n_turnos', duracionTurnos: 2 }))
    purgarEfectosTemporales(s, 'ocaso')
    expect(esenciaDe(s, 'o1')).toBe('Bestia')
    purgarEfectosTemporales(s, 'ocaso')
    expect(esenciaDe(s, 'o1')).toBe('Mago')
  })
  it('permanente (sin duración): sobrevive a los Ocasos', () => {
    const s = estado(); lanzar(s, CAMBIO({ rol: 'Soberano' }))
    purgarEfectosTemporales(s, 'ocaso'); purgarEfectosTemporales(s, 'ocaso')
    expect(rolesDe(s, 'o1')).toEqual(['Soberano'])
  })
  it('el cambio vencido deja el anterior vigente (el permanente asoma bajo el temporal)', () => {
    const s = estado(); lanzar(s, CAMBIO({ faccion: 'Caos' })); lanzar(s, CAMBIO({ faccion: 'Creación' }, { duracion: 'turno' }))
    expect(faccionesDe(s, 'o1')).toEqual(['Creación'])
    purgarEfectosTemporales(s, 'ocaso')
    expect(faccionesDe(s, 'o1')).toEqual(['Caos'])
  })
})
