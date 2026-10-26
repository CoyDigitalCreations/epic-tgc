// @vitest-environment node
/**
 * F9a — `recuperar_*` e `invocar`. Cartas SINTÉTICAS («Dummy»): el motor no sabe de ninguna carta concreta,
 * solo del efecto, su objetivo y su destino (Card-Maker: «devuelve a la mano de su dueño», «pone en la parte
 * superior del mazo», «invoca un Campeón del Cementerio de su dueño»...).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { resolveTargets } from '../targetResolver'
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
const campeon = (id: string) => ({
  ...base, id, name: id, type: 'Campeón' as const, keywords: [], efectos: [],
  facciones: ['Orden' as const], stats: { cost: 1, poder: 2, resistencia: 2 },
})
const mistica = (id: string) => ({ ...base, id, name: id, type: 'Mística' as const, keywords: [], efectos: [], stats: { cost: 1 } })
const eter = (id: string) => ({ ...base, id, name: id, type: 'Éter' as const, efectos: [], stats: { cost: 0 } })

type Zona = 'cementerio' | 'exilio' | 'mano' | 'mazo' | 'campo'
const efecto = (accion: EfectoData['efecto'], tipo: 'campeon' | 'carta' | 'mistica', zona: Zona, extra: Partial<EfectoData> = {}): EfectoData => ({
  tipo: 'disparo', efecto: accion, objetivo: { tipo, controlador: 'propio', zona }, ...extra,
})

function jugador(id: PlayerId) {
  return {
    id, mano: [] as string[], mazo: [] as string[], cementerio: [] as string[], exilio: [] as string[],
    eterReserva: [] as string[], eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[], mulliganUsado: true,
  }
}
const estado = (): GameState => ({ version: 1, seed: 1, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false, players: { A: jugador('A'), B: jugador('B') }, instances: {} })
const ctx = (): Ctx => { let n = 0; const events: Ctx['events'] = []; return { next: () => ((n++ * 0.37) % 1), emit: (e) => { events.push(e) }, events } as Ctx }

function carta(s: GameState, id: string, cardId: string, owner: PlayerId, zona: Zona, slot = 0) {
  s.instances[id] = { cardInstanceId: id, cardId, owner }
  const p = s.players[owner]
  if (zona === 'campo') p.campo.campeones[slot] = id
  else p[zona].push(id)
}
/** Lanza `e` desde una fuente de A con la carta `objetivoId` ya elegida (modo resolución). */
function lanzar(s: GameState, c: Ctx, e: EfectoData, objetivoId: string, jugadorEfecto: PlayerId = 'A') {
  s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: jugadorEfecto }
  interpretEffect(s, c, s.instances.fuente, e, { jugador: jugadorEfecto, contextoUso: 'objetivo-elegido', objetivoId })
}
const tipos = (c: Ctx) => c.events.map((e) => e.type)

beforeAll(() => {
  registrarCartas([campeon('T-CAMP'), mistica('T-MIST'), eter('T-ETER')])
})

describe('F9a — filtro de tipo en zonas fuera del campo', () => {
  it('«un Campeón del Cementerio» no ofrece Místicas ni Éter', () => {
    const s = estado()
    carta(s, 'c1', 'T-CAMP', 'A', 'cementerio'); carta(s, 'm1', 'T-MIST', 'A', 'cementerio'); carta(s, 'e1', 'T-ETER', 'A', 'cementerio')
    expect(resolveTargets(s, { tipo: 'campeon', controlador: 'propio', zona: 'cementerio' }, 'A')).toEqual(['c1'])
    expect(resolveTargets(s, { tipo: 'mistica', controlador: 'propio', zona: 'cementerio' }, 'A')).toEqual(['m1'])
    expect(resolveTargets(s, { tipo: 'carta', controlador: 'propio', zona: 'cementerio' }, 'A')).toEqual(['c1', 'm1', 'e1'])
  })
  it('lo mismo en el Exilio y en la mano', () => {
    const s = estado()
    carta(s, 'c1', 'T-CAMP', 'A', 'exilio'); carta(s, 'm1', 'T-MIST', 'A', 'exilio')
    carta(s, 'c2', 'T-CAMP', 'A', 'mano'); carta(s, 'm2', 'T-MIST', 'A', 'mano')
    expect(resolveTargets(s, { tipo: 'campeon', controlador: 'propio', zona: 'exilio' }, 'A')).toEqual(['c1'])
    expect(resolveTargets(s, { tipo: 'campeon', controlador: 'propio', zona: 'mano' }, 'A')).toEqual(['c2'])
  })
})

describe('F9a — recuperar_mano («devuelve a la mano de su dueño»)', () => {
  it('desde el Cementerio: la carta va a la mano de su dueño', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('recuperar_mano', 'campeon', 'cementerio'), 'c1')
    expect(s.players.A.cementerio).toEqual([])
    expect(s.players.A.mano).toEqual(['c1'])
    expect(tipos(c)).toEqual(['carta_devuelta_a_mano'])
  })
  it('una carta del RIVAL va a la mano del rival (su dueño), no a la tuya', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'B', 'cementerio'); const c = ctx()
    lanzar(s, c, { ...efecto('recuperar_mano', 'campeon', 'cementerio'), objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio' } }, 'c1')
    expect(s.players.B.mano).toEqual(['c1'])
    expect(s.players.A.mano).toEqual([])
  })
  it('controladorDestino «propio» la entrega a TU mano', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'B', 'cementerio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'recuperar_mano', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio', controladorDestino: 'propio' } }, 'c1')
    expect(s.players.A.mano).toEqual(['c1'])
  })
  it('desde el campo: libera el slot', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'A', 'campo'); const c = ctx()
    lanzar(s, c, efecto('recuperar_mano', 'campeon', 'campo'), 'c1')
    expect(s.players.A.campo.campeones[0]).toBeNull()
    expect(s.players.A.mano).toEqual(['c1'])
  })
  it('un Campeón robado (en el campo del ladrón) también se encuentra y vuelve a la mano de su dueño', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'B', 'campo')
    s.players.B.campo.campeones[0] = null; s.players.A.campo.campeones[0] = 'c1' // A lo controla
    lanzar(s, ctx(), efecto('recuperar_mano', 'campeon', 'campo'), 'c1')
    expect(s.players.A.campo.campeones[0]).toBeNull()
    expect(s.players.B.mano).toEqual(['c1'])
  })
  it('una carta que ya no está en ninguna zona no hace nada', () => {
    const s = estado(); s.instances.c1 = { cardInstanceId: 'c1', cardId: 'T-CAMP', owner: 'A' }; const c = ctx()
    lanzar(s, c, efecto('recuperar_mano', 'campeon', 'cementerio'), 'c1')
    expect(s.players.A.mano).toEqual([])
    expect(c.events).toHaveLength(0)
  })
})

describe('F9a — recuperar al mazo', () => {
  const mazo = (s: GameState) => { for (const n of [1, 2, 3]) carta(s, `m${n}`, 'T-CAMP', 'A', 'mazo') }

  it('recuperar_mazo: al fondo (como el tutor); el tope no cambia', () => {
    const s = estado(); mazo(s); carta(s, 'x', 'T-CAMP', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('recuperar_mazo', 'campeon', 'cementerio'), 'x')
    expect(s.players.A.mazo).toEqual(['m1', 'm2', 'm3', 'x'])
    expect(tipos(c)).toEqual(['carta_entrada_a_zona'])
  })
  it('recuperar_mazo_bottom: al fondo', () => {
    const s = estado(); mazo(s); carta(s, 'x', 'T-CAMP', 'A', 'exilio')
    lanzar(s, ctx(), efecto('recuperar_mazo_bottom', 'campeon', 'exilio'), 'x')
    expect(s.players.A.mazo.at(-1)).toBe('x')
  })
  it('recuperar_mazo_top: en el tope (índice 0, la próxima carta que se roba)', () => {
    const s = estado(); mazo(s); carta(s, 'x', 'T-CAMP', 'A', 'cementerio')
    lanzar(s, ctx(), efecto('recuperar_mazo_top', 'campeon', 'cementerio'), 'x')
    expect(s.players.A.mazo).toEqual(['x', 'm1', 'm2', 'm3'])
  })
  it('recuperar_mazo_barajar: la carta queda en el mazo, que se baraja de forma determinista (mismo ctx, mismo orden)', () => {
    const armar = () => { const s = estado(); mazo(s); carta(s, 'x', 'T-CAMP', 'A', 'cementerio'); lanzar(s, ctx(), efecto('recuperar_mazo_barajar', 'campeon', 'cementerio'), 'x'); return s.players.A.mazo }
    const a = armar()
    expect([...a].sort()).toEqual(['m1', 'm2', 'm3', 'x'])
    expect(armar()).toEqual(a)
  })
  it('va al mazo de su DUEÑO', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'B', 'cementerio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'recuperar_mazo_top', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio' } }, 'x')
    expect(s.players.B.mazo).toEqual(['x'])
    expect(s.players.A.mazo).toEqual([])
  })
})

describe('F9a — recuperar_exilio («devuelve del Exilio»)', () => {
  it('sin destino: a la mano de su dueño', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'exilio')
    lanzar(s, ctx(), efecto('recuperar_exilio', 'campeon', 'exilio'), 'x')
    expect(s.players.A.exilio).toEqual([])
    expect(s.players.A.mano).toEqual(['x'])
  })
  it('con zonaDestino «campo»: se invoca', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'exilio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'recuperar_exilio', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'exilio', zonaDestino: 'campo' } }, 'x')
    expect(s.players.A.campo.campeones[0]).toBe('x')
  })
  it('con zonaDestino «cementerio»: va al Cementerio', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'exilio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'recuperar_exilio', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'exilio', zonaDestino: 'cementerio' } }, 'x')
    expect(s.players.A.cementerio).toEqual(['x'])
    expect(s.players.A.exilio).toEqual([])
  })
  it('con zonaDestino «mazo»: al fondo', () => {
    const s = estado(); carta(s, 'm1', 'T-CAMP', 'A', 'mazo'); carta(s, 'x', 'T-CAMP', 'A', 'exilio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'recuperar_exilio', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'exilio', zonaDestino: 'mazo' } }, 'x')
    expect(s.players.A.mazo).toEqual(['m1', 'x'])
  })
})

describe('F9a — invocar / recuperar_campo («invoca un Campeón ... de su dueño»)', () => {
  it('invoca desde el Cementerio: ocupa el primer slot libre, cansado y enderezado', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'cementerio'); const c = ctx()
    lanzar(s, c, efecto('invocar', 'campeon', 'cementerio'), 'x')
    expect(s.players.A.campo.campeones[0]).toBe('x')
    expect(s.players.A.cementerio).toEqual([])
    expect(s.instances.x.entradaEsteTurno).toBe(true)
    expect(s.instances.x.agotado).not.toBe(true)
    expect(tipos(c)).toEqual(['carta_invocada'])
  })
  it.each(['exilio', 'mano', 'mazo'] as const)('invoca desde %s', (zona) => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', zona)
    lanzar(s, ctx(), efecto('invocar', 'campeon', zona), 'x')
    expect(s.players.A.campo.campeones[0]).toBe('x')
    expect(s.players.A[zona]).toEqual([])
  })
  it('zonaOrigen a nivel carta (como lo exporta el Card-Maker) también funciona', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'cementerio')
    interpretEffect(s, ctx(), (s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: 'A' }),
      { tipo: 'disparo', efecto: 'invocar', zonaOrigen: 'cementerio', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'cementerio' } },
      { jugador: 'A' })
    expect(s.players.A.campo.campeones[0]).toBe('x')
  })
  it('sin slot libre NO se pierde la carta: se queda en su zona', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'cementerio')
    for (let i = 0; i < 5; i++) carta(s, `o${i}`, 'T-CAMP', 'A', 'campo', i)
    lanzar(s, ctx(), efecto('invocar', 'campeon', 'cementerio'), 'x')
    expect(s.players.A.cementerio).toEqual(['x'])
  })
  it('solo invoca Campeones: una Mística elegida se ignora', () => {
    const s = estado(); carta(s, 'm', 'T-MIST', 'A', 'cementerio')
    lanzar(s, ctx(), efecto('invocar', 'carta', 'cementerio'), 'm')
    expect(s.players.A.cementerio).toEqual(['m'])
    expect(s.players.A.campo.campeones.every((x) => x === null)).toBe(true)
  })
  it('del Cementerio del RIVAL: entra a TU campo y sigue siendo del rival (cuando muera, va a su Cementerio)', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'B', 'cementerio')
    lanzar(s, ctx(), { tipo: 'disparo', efecto: 'invocar', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'cementerio' } }, 'x')
    expect(s.players.A.campo.campeones[0]).toBe('x')
    expect(s.players.B.cementerio).toEqual([])
    expect(s.instances.x.owner).toBe('B')
  })
  it('recuperar_campo («invoca del Cementerio») se comporta como invocar', () => {
    const s = estado(); carta(s, 'x', 'T-CAMP', 'A', 'cementerio')
    lanzar(s, ctx(), efecto('recuperar_campo', 'campeon', 'cementerio'), 'x')
    expect(s.players.A.campo.campeones[0]).toBe('x')
  })
})

describe('F9a — flujo completo con elección', () => {
  it('con varias opciones, el efecto arma la elección del jugador y no mueve nada todavía', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'A', 'cementerio'); carta(s, 'c2', 'T-CAMP', 'A', 'cementerio')
    s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: 'A' }
    interpretEffect(s, ctx(), s.instances.fuente, efecto('recuperar_mano', 'campeon', 'cementerio'), { jugador: 'A' })
    expect(s.objetivosPendientes).toHaveLength(1)
    expect(s.objetivosPendientes![0].opciones.sort()).toEqual(['c1', 'c2'])
    expect(s.players.A.mano).toEqual([])
  })
  it('con una sola opción resuelve directo', () => {
    const s = estado(); carta(s, 'c1', 'T-CAMP', 'A', 'cementerio')
    s.instances.fuente = { cardInstanceId: 'fuente', cardId: 'T-MIST', owner: 'A' }
    interpretEffect(s, ctx(), s.instances.fuente, efecto('recuperar_mano', 'campeon', 'cementerio'), { jugador: 'A' })
    expect(s.players.A.mano).toEqual(['c1'])
  })
})
