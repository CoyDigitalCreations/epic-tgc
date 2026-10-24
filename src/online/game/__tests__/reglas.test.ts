// @vitest-environment node
/**
 * Reglas vigentes = manual (Capa 1) + modificadores (Capa 2). Fase F1 del motor de reglas base.
 * Las cartas son SINTÉTICAS y genéricas: el motor no sabe de ninguna carta concreta.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getCardMeta, registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { otorgarKeyword, purgarEfectosTemporales, purgarHastaFase } from '../efectos'
import { limpiarMemoReglas, modificadoresReglaDe, reglaBool, reglaNumero } from '../reglas'
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
const eter = (id: string, efectos: EfectoData[]) => ({ ...base, id, name: id, type: 'Éter' as const, efectos, stats: { cost: 0 } })
const vinculo = (id: string, efectos: EfectoData[]) => ({ ...base, id, name: id, type: 'Vínculo' as const, efectos, stats: { cost: 0 } })
const mistica = (id: string, efectos: EfectoData[]) => ({ ...base, id, name: id, type: 'Mística' as const, keywords: [], efectos, stats: { cost: 1 } })

const sumarMano = (extra: Partial<EfectoData> = {}): EfectoData => ({
  tipo: 'pasivo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 2 }, ...extra,
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
const ctx = (): Ctx => { const events: Ctx['events'] = []; return { next: () => 0, emit: (e) => { events.push(e) }, events } as Ctx }

function poner(s: GameState, instId: string, cardId: string, owner: PlayerId, zona: 'campeon' | 'mistica' | 'reserva' | 'pagado' | 'vinculo', extra = {}) {
  s.instances[instId] = { cardInstanceId: instId, cardId, owner, ...extra }
  const p = s.players[owner]
  if (zona === 'campeon') p.campo.campeones[0] = instId
  if (zona === 'mistica') p.campo.misticasTacticas[0] = instId
  if (zona === 'reserva') p.eterReserva.push(instId)
  if (zona === 'pagado') p.eterPagado.push(instId)
  if (zona === 'vinculo') p.vinculos[0] = instId
}

beforeAll(() => {
  registrarCartas([
    campeon('T-LISO'),
    campeon('T-TIRADOR', [], ['Tirador']),
    campeon('T-CARGA', [], ['Carga']),
    campeon('T-AURA', [sumarMano()]),
    campeon('T-AURA-RIVAL', [sumarMano({ objetivo: { tipo: 'self', controlador: 'rival', zona: 'campo' } })]),
    campeon('T-CONTINUO', [{ tipo: 'continuo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 3 }, costo: { tipo: 'bloqueo_fijo', cantidad: 2 }, duracion: 'mientras_ester_bloqueado' }]),
    eter('T-ETER-RESERVA', [{ tipo: 'reserva', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 } }]),
    eter('T-ETER-PAGO', [{ tipo: 'pago', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 } }]),
    eter('T-ETER-BLOQUEO', [{ tipo: 'bloqueo', efecto: 'modificar_regla', regla: { id: 'agotadoPuedeBloquear', operacion: 'permitir' } }]),
    vinculo('T-VINCULO', [{ tipo: 'vinculo', efecto: 'modificar_regla', regla: { id: 'cartasPorAlba', operacion: 'sumar', valor: 1 }, duracion: 'mientras_en_campo' }]),
    mistica('T-TOPE', [{ tipo: 'continuo', efecto: 'modificar_regla', regla: { id: 'eterBloqueadoExtra', operacion: 'sumar', valor: 1 }, objetivo: { tipo: 'equipped_champion', controlador: 'propio', zona: 'campo' } }]),
    mistica('T-HECHIZO-TURNO', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 4 }, duracion: 'turno' }]),
    mistica('T-HECHIZO-2T', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 }, duracion: 'n_turnos', duracionTurnos: 2 }]),
    mistica('T-HECHIZO-FASE', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 }, duracion: 'hasta_fase', duracionFase: 'alba', duracionControlador: 'propio' }]),
    mistica('T-HECHIZO-PERM', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'sumar', valor: 1 }, duracion: 'permanente' }]),
    mistica('T-HECHIZO-CAMPEON', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'agotadoPuedeBloquear', operacion: 'permitir' }, objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' }, duracion: 'turno' }]),
    mistica('T-FIJAR-A', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'fijar', valor: 3 }, duracion: 'permanente' }]),
    mistica('T-FIJAR-B', [{ tipo: 'hechizo', efecto: 'modificar_regla', regla: { id: 'limiteMano', operacion: 'fijar', valor: 9 }, duracion: 'permanente' }]),
  ])
  limpiarMemoReglas()
})

/** Resuelve el efecto de una Mística de prueba como lo haría el motor. */
function lanzar(s: GameState, cardId: string, owner: PlayerId = 'A') {
  const instId = `lanza-${cardId}-${Object.keys(s.instances).length}`
  s.instances[instId] = { cardInstanceId: instId, cardId, owner }
  interpretEffect(s, ctx(), s.instances[instId], efectoDe(cardId), { jugador: owner })
  return instId
}

/** El primer efecto de una carta de prueba. */
function efectoDe(cardId: string): EfectoData {
  return (getCardMeta(cardId) as { efectos: EfectoData[] }).efectos[0]
}

describe('sin modificadores: el manual manda', () => {
  it('devuelve los valores base', () => {
    const s = estado()
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
    expect(reglaNumero(s, 'rupturasPorTurno', { jugador: 'B' })).toBe(1)
    expect(reglaBool(s, 'primerTurnoSinAtaques')).toBe(true)
    poner(s, 'c', 'T-LISO', 'A', 'campeon')
    expect(reglaBool(s, 'agotadoPuedeBloquear', { instId: 'c' })).toBe(false)
    expect(reglaBool(s, 'puedeSerExiliada', { instId: 'c' })).toBe(true)
  })
})

describe('keywords: una keyword es una regla modificada', () => {
  it('Tirador apaga "el Disparo agota"; un Campeón sin la keyword sigue agotándose', () => {
    const s = estado()
    poner(s, 'tirador', 'T-TIRADOR', 'A', 'campeon')
    poner(s, 'liso', 'T-LISO', 'B', 'campeon')
    expect(reglaBool(s, 'disparoAgota', { instId: 'tirador' })).toBe(false)
    expect(reglaBool(s, 'disparoAgota', { instId: 'liso' })).toBe(true)
  })

  it('Carga apaga la invocación cansada', () => {
    const s = estado()
    poner(s, 'carga', 'T-CARGA', 'A', 'campeon')
    expect(reglaBool(s, 'invocacionCansada', { instId: 'carga' })).toBe(false)
  })

  it('una keyword OTORGADA por un efecto también cuenta (Inexiliable temporal)', () => {
    const s = estado()
    poner(s, 'liso', 'T-LISO', 'A', 'campeon')
    expect(reglaBool(s, 'puedeSerExiliada', { instId: 'liso' })).toBe(true)
    otorgarKeyword(s, 'liso', 'Inexiliable', true)
    expect(reglaBool(s, 'puedeSerExiliada', { instId: 'liso' })).toBe(false)
  })
})

describe('efectos en juego que modifican reglas (derivados del estado)', () => {
  it('un pasivo en el campo modifica una regla de su controlador, no la del rival', () => {
    const s = estado()
    poner(s, 'aura', 'T-AURA', 'A', 'campeon')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(8)
    expect(reglaNumero(s, 'limiteMano', { jugador: 'B' })).toBe(6)
  })

  it('con objetivo "rival" la regla cambia en el rival', () => {
    const s = estado()
    poner(s, 'aura', 'T-AURA-RIVAL', 'A', 'campeon')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
    expect(reglaNumero(s, 'limiteMano', { jugador: 'B' })).toBe(8)
  })

  it('al salir la carta del campo el efecto desaparece solo (sin estado que limpiar)', () => {
    const s = estado()
    poner(s, 'aura', 'T-AURA', 'A', 'campeon')
    s.players.A.campo.campeones[0] = null
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
  })

  it('un continuo con Éter bloqueado solo rige mientras el Éter siga bloqueado', () => {
    const s = estado()
    poner(s, 'cont', 'T-CONTINUO', 'A', 'campeon')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
    s.instances.cont.eterBloqueado = ['e1']
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6) // bloqueo_fijo 2: con 1 no alcanza
    s.instances.cont.eterBloqueado = ['e1', 'e2']
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(9)
    delete s.instances.cont.eterBloqueado
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
  })

  it('un Éter rige en la zona que su efecto declara: reserva, pagado o bloqueado', () => {
    const s = estado()
    poner(s, 'er', 'T-ETER-RESERVA', 'A', 'reserva')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
    s.players.A.eterReserva = []
    s.players.A.eterPagado = ['er'] // en 1A el efecto de RESERVA ya no rige
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)

    poner(s, 'ep', 'T-ETER-PAGO', 'A', 'pagado')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
    s.players.A.eterPagado = []
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)

    poner(s, 'host', 'T-LISO', 'A', 'campeon')
    s.instances.host.eterBloqueado = ['eb']
    s.instances.eb = { cardInstanceId: 'eb', cardId: 'T-ETER-BLOQUEO', owner: 'A' }
    expect(reglaBool(s, 'agotadoPuedeBloquear', { instId: 'host' })).toBe(true)
  })

  it('un Vínculo solo modifica reglas cuando está DESTRUIDO (boca arriba, §5.5)', () => {
    const s = estado()
    poner(s, 'v', 'T-VINCULO', 'A', 'vinculo')
    expect(reglaNumero(s, 'cartasPorAlba', { jugador: 'A' })).toBe(1)
    s.instances.v.bocaArriba = true
    expect(reglaNumero(s, 'cartasPorAlba', { jugador: 'A' })).toBe(2)
    expect(reglaNumero(s, 'cartasPorAlba', { jugador: 'B' })).toBe(1)
  })

  it('ejemplo guía: un efecto externo sube el tope de Éter bloqueado de otra carta', () => {
    const s = estado()
    poner(s, 'host', 'T-LISO', 'A', 'campeon')
    poner(s, 'art', 'T-TOPE', 'A', 'mistica', { equipadoA: 'host' })
    expect(reglaNumero(s, 'eterBloqueadoExtra', { instId: 'host' })).toBe(1)
    expect(reglaNumero(s, 'eterBloqueadoExtra', { instId: 'art' })).toBe(0)
    s.instances.art.equipadoA = undefined // si el Artefacto se desequipa, el tope vuelve al del manual
    expect(reglaNumero(s, 'eterBloqueadoExtra', { instId: 'host' })).toBe(0)
  })

  it('modificadoresReglaDe expone qué modifica la regla (diagnóstico)', () => {
    const s = estado()
    poner(s, 'aura', 'T-AURA', 'A', 'campeon')
    expect(modificadoresReglaDe(s, 'limiteMano', { jugador: 'A' })).toEqual([{ regla: 'limiteMano', operacion: 'sumar', valor: 2, orden: 0 }])
  })
})

describe('reglas temporales: efectos de resolución con duración', () => {
  it('"este turno": rige hasta el Ocaso y desaparece', () => {
    const s = estado()
    lanzar(s, 'T-HECHIZO-TURNO')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(10)
    expect(reglaNumero(s, 'limiteMano', { jugador: 'B' })).toBe(6)
    purgarEfectosTemporales(s, 'ocaso')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
    expect(s.reglasTemporales).toBeUndefined()
  })

  it('"N turnos": sobrevive hasta que el contador llega a 0', () => {
    const s = estado()
    lanzar(s, 'T-HECHIZO-2T')
    purgarEfectosTemporales(s, 'ocaso')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
    purgarEfectosTemporales(s, 'ocaso')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
  })

  it('"hasta la fase": expira al ENTRAR esa fase del jugador indicado', () => {
    const s = estado()
    lanzar(s, 'T-HECHIZO-FASE')
    purgarHastaFase(s, 'alba', 'B') // el Alba del otro no la toca
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
    purgarHastaFase(s, 'forja', 'A') // otra fase tampoco
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
    purgarHastaFase(s, 'alba', 'A')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(6)
  })

  it('"permanente": ni el Ocaso ni el Alba la quitan', () => {
    const s = estado()
    lanzar(s, 'T-HECHIZO-PERM')
    purgarEfectosTemporales(s, 'ocaso')
    purgarEfectosTemporales(s, 'alba-dueño', 'A')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(7)
  })

  it('sobre un Campeón: la regla acompaña a ESA carta', () => {
    const s = estado()
    poner(s, 'c1', 'T-LISO', 'A', 'campeon')
    s.instances.c2 = { cardInstanceId: 'c2', cardId: 'T-LISO', owner: 'A' }
    const instId = `lanza-x`
    s.instances[instId] = { cardInstanceId: instId, cardId: 'T-HECHIZO-CAMPEON', owner: 'A' }
    interpretEffect(s, ctx(), s.instances[instId], efectoDe('T-HECHIZO-CAMPEON'), { jugador: 'A' })
    // objetivo "self" = la propia Mística lanzadora, no el Campeón
    expect(reglaBool(s, 'agotadoPuedeBloquear', { instId })).toBe(true)
    expect(reglaBool(s, 'agotadoPuedeBloquear', { instId: 'c1' })).toBe(false)
  })

  it('entre dos "fijar" gana el más reciente', () => {
    const s = estado()
    lanzar(s, 'T-FIJAR-A')
    lanzar(s, 'T-FIJAR-B')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(9)
  })

  it('una regla temporal y un efecto en juego se combinan', () => {
    const s = estado()
    poner(s, 'aura', 'T-AURA', 'A', 'campeon')
    lanzar(s, 'T-HECHIZO-TURNO')
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(12) // 6 + 2 + 4
  })
})
