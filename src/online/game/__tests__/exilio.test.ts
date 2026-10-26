// @vitest-environment node
/**
 * F7 — Punto de control único del Exilio (`exilio.ts`). Las cartas son SINTÉTICAS y genéricas:
 * el motor no sabe de ninguna carta concreta, solo de la regla `puedeSerExiliada`.
 * Manual §10: INEXILIABLE = "no puede ser exiliada; sí puede ser destruida".
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { otorgarKeyword, purgarKeywordsTemporales } from '../efectos'
import { esExiliable, permitirExilio } from '../exilio'
import { buscarFuentePreventDestroy, destruirCarta } from '../replacements'
import type { EfectoData } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const,
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '3' as const,
}
const campeon = (id: string, efectos: EfectoData[] = [], keywords: string[] = []) => ({
  ...base, id, name: id, type: 'Campeón' as const, keywords, efectos,
  facciones: ['Orden' as const], stats: { cost: 1, poder: 2, resistencia: 2 },
})
const eter = (id: string) => ({ ...base, id, name: id, type: 'Éter' as const, efectos: [], stats: { cost: 0 } })

const EXILIAR_CAMPO: EfectoData = { tipo: 'disparo', efecto: 'exile', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' } }
const EXILIAR_CEMENTERIO: EfectoData = { tipo: 'disparo', efecto: 'exile', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio' } }
const TUTOR_A_EXILIO: EfectoData = { tipo: 'disparo', efecto: 'tutor', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo', zonaDestino: 'exilio' } }
const ETER_A_EXILIO: EfectoData = { tipo: 'disparo', efecto: 'return_ether', objetivo: { tipo: 'eter', controlador: 'propio', zona: 'reserva', zonaDestino: 'exilio' } }
const PREVENIR: EfectoData = { tipo: 'disparo', efecto: 'prevent_destroy', trigger: 'cuando_vinculo_seria_destruido', costo: { tipo: 'exile_self' } }

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
const estado = (): GameState => ({ version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} })
const ctx = (): Ctx => { const events: Ctx['events'] = []; return { next: () => 0, emit: (e) => { events.push(e) }, events } as Ctx }
const tipos = (c: Ctx) => c.events.map((e) => e.type)

function inst(s: GameState, id: string, cardId: string, owner: PlayerId) {
  s.instances[id] = { cardInstanceId: id, cardId, owner }
}
function enCampo(s: GameState, id: string, cardId: string, owner: PlayerId, slot = 0) {
  inst(s, id, cardId, owner)
  s.players[owner].campo.campeones[slot] = id
}
function enCementerio(s: GameState, id: string, cardId: string, owner: PlayerId) {
  inst(s, id, cardId, owner)
  s.players[owner].cementerio.push(id)
}
/** Lanza `efecto` desde una fuente de A con el objetivo ya elegido (modo resolución). */
function lanzar(s: GameState, c: Ctx, efecto: EfectoData, objetivoId?: string) {
  inst(s, 'fuente', 'T-LISO', 'A')
  interpretEffect(s, c, s.instances.fuente, efecto, { jugador: 'A', ...(objetivoId ? { contextoUso: 'objetivo-elegido' as const, objetivoId } : {}) })
}

beforeAll(() => {
  registrarCartas([
    campeon('T-LISO'),
    campeon('T-INEXILIABLE', [], ['Inexiliable']),
    campeon('T-PREVENTOR', [PREVENIR]),
    campeon('T-PREVENTOR-INEXILIABLE', [PREVENIR], ['Inexiliable']),
    eter('T-ETER'),
  ])
})

describe('F7 — esExiliable / permitirExilio (el punto de control)', () => {
  it('una carta sin Inexiliable es exiliable y no emite nada', () => {
    const s = estado(); enCampo(s, 'x', 'T-LISO', 'B'); const c = ctx()
    expect(esExiliable(s, 'x')).toBe(true)
    expect(permitirExilio(s, c, 'x')).toBe(true)
    expect(c.events).toHaveLength(0)
  })

  it('Inexiliable: no es exiliable y avisa con exilio_prevenido (a nombre del dueño)', () => {
    const s = estado(); enCampo(s, 'x', 'T-INEXILIABLE', 'B'); const c = ctx()
    expect(esExiliable(s, 'x')).toBe(false)
    expect(permitirExilio(s, c, 'x')).toBe(false)
    expect(c.events).toEqual([{ type: 'exilio_prevenido', cardInstanceId: 'x', jugador: 'B' }])
  })

  it('esExiliable NO emite (sirve para elegibilidad de costos y fuentes)', () => {
    const s = estado(); enCampo(s, 'x', 'T-INEXILIABLE', 'B')
    expect(esExiliable(s, 'x')).toBe(false)
  })

  it('una instancia inexistente no se autoriza y no avisa', () => {
    const s = estado(); const c = ctx()
    expect(permitirExilio(s, c, 'fantasma')).toBe(false)
    expect(c.events).toHaveLength(0)
  })

  it('Inexiliable OTORGADA por un efecto también cuenta, y deja de contar cuando expira en el Ocaso', () => {
    const s = estado(); enCampo(s, 'x', 'T-LISO', 'B')
    otorgarKeyword(s, 'x', 'Inexiliable', true)
    expect(esExiliable(s, 'x')).toBe(false)
    purgarKeywordsTemporales(s)
    expect(esExiliable(s, 'x')).toBe(true)
  })
})

describe('F7 — efecto exiliar', () => {
  it('exiliar un Campeón normal del campo lo manda al Exilio (regresión)', () => {
    const s = estado(); enCampo(s, 'x', 'T-LISO', 'B'); const c = ctx()
    lanzar(s, c, EXILIAR_CAMPO, 'x')
    expect(s.players.B.campo.campeones[0]).toBeNull()
    expect(s.players.B.exilio).toEqual(['x'])
    expect(tipos(c)).toContain('carta_exiliada')
  })

  it('exiliar un Inexiliable del campo: se queda, sin eventos de movimiento, con exilio_prevenido', () => {
    const s = estado(); enCampo(s, 'x', 'T-INEXILIABLE', 'B'); const c = ctx()
    lanzar(s, c, EXILIAR_CAMPO, 'x')
    expect(s.players.B.campo.campeones[0]).toBe('x')
    expect(s.players.B.exilio).toEqual([])
    expect(tipos(c)).toEqual(['exilio_prevenido'])
  })

  it('exiliar un Inexiliable desde el Cementerio: se queda en el Cementerio', () => {
    const s = estado(); enCementerio(s, 'x', 'T-INEXILIABLE', 'B'); const c = ctx()
    lanzar(s, c, EXILIAR_CEMENTERIO, 'x')
    expect(s.players.B.cementerio).toEqual(['x'])
    expect(s.players.B.exilio).toEqual([])
    expect(tipos(c)).toEqual(['exilio_prevenido'])
  })

  it('el manual §10: Inexiliable SÍ puede ser destruida', () => {
    const s = estado(); enCampo(s, 'x', 'T-INEXILIABLE', 'B'); const c = ctx()
    expect(destruirCarta(s, c, 'x', 'efecto')).toBe(true)
    expect(s.players.B.cementerio).toContain('x')
  })
})

describe('F7 — los otros caminos al Exilio pasan por el mismo control', () => {
  it('tutor con destino Exilio: la carta Inexiliable se queda en el mazo (no se pierde)', () => {
    const s = estado(); inst(s, 'm', 'T-INEXILIABLE', 'A'); s.players.A.mazo.push('m'); const c = ctx()
    lanzar(s, c, { ...TUTOR_A_EXILIO, objetivo: { ...TUTOR_A_EXILIO.objetivo!, zona: 'mazo' } }, 'm')
    expect(s.players.A.mazo).toEqual(['m'])
    expect(s.players.A.exilio).toEqual([])
    expect(tipos(c)).toEqual(['exilio_prevenido'])
  })

  it('tutor con destino Exilio: una carta normal sí se exilia (regresión)', () => {
    const s = estado(); inst(s, 'm', 'T-LISO', 'A'); s.players.A.mazo.push('m'); const c = ctx()
    lanzar(s, c, TUTOR_A_EXILIO, 'm')
    expect(s.players.A.mazo).toEqual([])
    expect(s.players.A.exilio).toEqual(['m'])
  })

  it('Éter hacia el Exilio: sigue funcionando (el Éter no tiene Inexiliable) (regresión)', () => {
    const s = estado(); inst(s, 'e', 'T-ETER', 'A'); s.players.A.eterReserva.push('e'); const c = ctx()
    lanzar(s, c, ETER_A_EXILIO, 'e')
    expect(s.players.A.eterReserva).toEqual([])
    expect(s.players.A.exilio).toEqual(['e'])
  })
})

describe('F7 — costo "exiliar esta carta" (prevención de destrucción de Vínculo)', () => {
  it('una fuente Inexiliable no puede pagar el costo: no es fuente elegible', () => {
    const s = estado(); enCampo(s, 'f', 'T-PREVENTOR-INEXILIABLE', 'A')
    expect(buscarFuentePreventDestroy(s, 'A')).toBeNull()
  })

  it('una fuente normal sigue siendo elegible (regresión)', () => {
    const s = estado(); enCampo(s, 'f', 'T-PREVENTOR', 'A')
    expect(buscarFuentePreventDestroy(s, 'A')).toBe('f')
  })

  it('con dos fuentes, se elige la que sí puede exiliarse', () => {
    const s = estado()
    enCampo(s, 'f1', 'T-PREVENTOR-INEXILIABLE', 'A', 0)
    enCampo(s, 'f2', 'T-PREVENTOR', 'A', 1)
    expect(buscarFuentePreventDestroy(s, 'A')).toBe('f2')
  })
})
