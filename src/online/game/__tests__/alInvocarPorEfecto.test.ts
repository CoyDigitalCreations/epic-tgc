// @vitest-environment node
/**
 * «Al invocar» dispara cuando un Campeón ENTRA al campo por cualquier vía, no solo al jugarlo de la mano:
 * `invocar`, `recuperar_campo`, `invocar_y_equipar` y el tutor con destino campo. El robo (`steal_champion`) NO:
 * cambia el controlador de un Campeón que ya estaba en el campo (su «Al invocar» se resolvió al entrar).
 * Cartas SINTÉTICAS: un Campeón cuyo «Al invocar» roba 1 (observable en la mano de quien lo controla).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'

const base = {
  rarity: 'Común' as const,
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '3' as const,
}
const campeon = (id: string, efectos: unknown[] = []) => ({
  ...base, id, name: id, type: 'Campeón' as const, keywords: [], efectos,
  facciones: ['Orden' as const], stats: { cost: 1, poder: 2, resistencia: 2 },
})
const mistica = (id: string) => ({ ...base, id, name: id, type: 'Mística' as const, keywords: [], efectos: [], stats: { cost: 1 } })
const alInvocarRoba = {
  tipo: 'pasivo', efecto: 'draw', trigger: 'al_invocar', texto: 'roba 1',
  objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' }, stats: { ATQ: 0, RES: 0 },
}

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
const estado = (): GameState => {
  const s: GameState = { version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} }
  for (const j of ['A', 'B'] as const) {
    for (const n of [1, 2]) {
      s.instances[`mz${j}${n}`] = { cardInstanceId: `mz${j}${n}`, cardId: 'T-PLANA', owner: j }
      s.players[j].mazo.push(`mz${j}${n}`)
    }
  }
  return s
}
const ctx = (): Ctx => { let n = 0; const events: Ctx['events'] = []; return { next: () => ((n++ * 0.37) % 1), emit: (e) => { events.push(e) }, events } as Ctx }

type Zona = 'cementerio' | 'exilio' | 'mano' | 'mazo' | 'campo'
function carta(s: GameState, id: string, cardId: string, owner: PlayerId, zona: Zona, slot = 0) {
  s.instances[id] = { cardInstanceId: id, cardId, owner }
  const p = s.players[owner]
  if (zona === 'campo') p.campo.campeones[slot] = id
  else p[zona].push(id)
}
function lanzar(s: GameState, c: Ctx, e: EfectoData, objetivoId: string, jugadorEfecto: PlayerId = 'A') {
  s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: jugadorEfecto }
  interpretEffect(s, c, s.instances.fuente, e, { jugador: jugadorEfecto, contextoUso: 'objetivo-elegido', objetivoId })
}
const efecto = (accion: EfectoData['efecto'], zona: Zona, controlador: 'propio' | 'rival' = 'propio'): EfectoData => ({
  tipo: 'disparo', efecto: accion, objetivo: { tipo: 'campeon', controlador, zona },
})
const apilados = (c: Ctx) => c.events.filter((e) => e.type === 'trigger_apilado')

beforeAll(() => {
  registrarCartas([
    campeon('T-ROBA', [alInvocarRoba]), campeon('T-MUDO'), campeon('T-PLANA'), mistica('T-MIST'),
  ] as unknown as AnyCard[])
})

describe('«Al invocar» por efecto — todo Campeón que entra al campo lo dispara', () => {
  it('invocar desde el Cementerio: su «Al invocar» roba para su controlador', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('invocar', 'cementerio'), 'c1')
    expect(s.players.A.campo.campeones[0]).toBe('c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
    expect(apilados(c)).toHaveLength(1)
  })
  it('invocar desde el Exilio: igual', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'exilio')
    lanzar(s, ctx(), efecto('invocar', 'exilio'), 'c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
  })
  it('recuperar_campo: igual', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'cementerio')
    lanzar(s, ctx(), efecto('recuperar_campo', 'cementerio'), 'c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
  })
  it('un Campeón del Cementerio RIVAL entra a TU campo y su «Al invocar» roba para ti (el controlador actual), no para su dueño', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'B', 'cementerio')
    lanzar(s, ctx(), efecto('invocar', 'cementerio', 'rival'), 'c1')
    expect(s.players.A.campo.campeones[0]).toBe('c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
    expect(s.players.B.mano).toEqual([])
  })
  it('invocar_y_equipar: el Campeón entra, se equipa y dispara', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('invocar_y_equipar', 'cementerio'), 'c1')
    expect(s.instances.fuente.equipadoA).toBe('c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
  })
  it('un Campeón sin «Al invocar» entra sin disparar nada', () => {
    const s = estado(); carta(s, 'c1', 'T-MUDO', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('invocar', 'cementerio'), 'c1')
    expect(s.players.A.campo.campeones[0]).toBe('c1')
    expect(s.players.A.mano).toEqual([])
    expect(apilados(c)).toHaveLength(0)
  })
  it('dentro de una resolución (profundidadTriggers > 0) resuelve de inmediato, igual', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'cementerio'); s.profundidadTriggers = 1
    lanzar(s, ctx(), efecto('invocar', 'cementerio'), 'c1')
    expect(s.players.A.mano).toEqual(['mzA1'])
    expect(s.profundidadTriggers).toBe(1) // el contador vuelve intacto
  })
  it('fuera de una resolución no deja profundidadTriggers en el estado', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'A', 'cementerio')
    lanzar(s, ctx(), efecto('invocar', 'cementerio'), 'c1')
    expect(s.profundidadTriggers).toBeUndefined()
  })
})

describe('«Al invocar» NO dispara al robar un Campeón (no entra al campo, cambia de controlador)', () => {
  it('steal_champion: el Campeón robado no vuelve a robar', () => {
    const s = estado(); carta(s, 'c1', 'T-ROBA', 'B', 'campo'); const c = ctx()
    lanzar(s, c, efecto('steal_champion', 'campo', 'rival'), 'c1')
    expect(s.players.A.campo.campeones).toContain('c1') // sí lo robó
    expect(s.players.B.campo.campeones).not.toContain('c1')
    expect(s.players.A.mano).toEqual([])
    expect(s.players.B.mano).toEqual([])
    expect(apilados(c)).toHaveLength(0)
  })
})
