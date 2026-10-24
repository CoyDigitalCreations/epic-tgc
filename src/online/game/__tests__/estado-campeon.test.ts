// @vitest-environment node
/**
 * Estado del Campeón (F2 del motor de reglas base): cansado ≠ agotado.
 *
 * - §5.2 / §9.2  invocación CANSADA = entró este turno (`entradaEsteTurno`): no ataca, SÍ bloquea
 *                y SÍ activa habilidades. NO está agotado.
 * - §5.2 / §8.3a "Paga y Agota": el Disparo con Éter pagado AGOTA al Campeón; solo se activa
 *                enderezado. Sin "una vez por turno": el límite lo da el agotamiento.
 * - §10 TIRADOR  el Disparo no lo agota (regla `disparoAgota` prohibida).
 * - Un Campeón que atacó no dispara; uno que disparó no ataca (es el mismo agotamiento).
 *
 * Carta: TEST-DISPARO (Campeón, disparo buff +1 ATQ sobre sí, costo eter:1, duracion 1_por_turno
 * en el dato: el motor la ignora en los Disparos) · FB-001 Éter Orden.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { validarActivarHabilidad } from '../habilidades'
import { atacantesElegibles } from '../combat'
import { statsDe } from '../efectos'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const TIRADOR = 'TEST-DISPARO'
const ETER_ORDEN = 'FB-001'

registrarCartas([{
  id: TIRADOR,
  name: 'Disparador Test',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
  stats: { cost: 2, poder: 2, resistencia: 2 },
  efectos: [{
    tipo: 'disparo',
    efecto: 'buff',
    stats: { ATQ: 1, RES: 0 },
    objetivo: { tipo: 'self', zona: 'campo' },
    costo: { tipo: 'eter', cantidad: 1 },
    duracion: '1_por_turno',
    texto: 'Puedes pagar 1 Éter: gana +1 ATQ.',
  }],
} as unknown as AnyCard])

const ID = 'camp-1'

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return { next: () => n++, emit: (e) => { events.push(e) }, events }
}

/** A tiene un Campeón con Disparo y 6 Éteres en la Reserva. `extra` se funde en la instancia. */
function setup(extra: Record<string, unknown> = {}, fase: GameState['fase'] = 'forja'): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [] as string[],
    eterPagado: [],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  const A = jugador('A')
  A.campo.campeones[0] = ID
  const eteres = Array.from({ length: 6 }, (_, i) => `eter-${i}`)
  A.eterReserva = eteres
  return {
    version: 1,
    seed: 7,
    fase,
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A, B: jugador('B') },
    instances: {
      [ID]: { cardInstanceId: ID, cardId: TIRADOR, owner: 'A', ...extra },
      ...Object.fromEntries(eteres.map((e) => [e, { cardInstanceId: e, cardId: ETER_ORDEN, owner: 'A' }])),
    },
  } as unknown as GameState
}

function disparar(s: GameState, eter: string): { ok: boolean; state: GameState } {
  const accion: Action = { type: 'activar_habilidad', cardInstanceId: ID, eterIds: [eter] }
  const r = applyAction(s, accion, crearCtx())
  return { ok: r.ok, state: r.ok ? r.state : s }
}

describe('Paga y Agota (§5.2, §8.3a)', () => {
  it('el Disparo con Éter pagado AGOTA al Campeón y no marca "una vez por turno"', () => {
    const r = disparar(setup(), 'eter-0')
    expect(r.ok).toBe(true)
    expect(r.state.instances[ID].agotado).toBe(true)
    expect(r.state.instances[ID].opcionUsadaEsteTurno).toBeUndefined()
    expect(statsDe(r.state, ID).poder).toBe(3)
  })

  it('agotado ya no puede disparar de nuevo: el límite lo da el agotamiento', () => {
    const r = disparar(setup(), 'eter-0')
    expect(validarActivarHabilidad(r.state, { type: 'activar_habilidad', cardInstanceId: ID, eterIds: ['eter-1'] })).toMatch(/agotada/)
    expect(disparar(r.state, 'eter-1').ok).toBe(false)
    const acciones = getValidActions(r.state, 'A').filter((a) => a.type === 'activar_habilidad')
    expect(acciones).toHaveLength(0)
  })

  it('sin "una vez por turno": al enderezarse vuelve a disparar el MISMO turno (ignora duracion 1_por_turno)', () => {
    const primero = disparar(setup(), 'eter-0')
    const enderezado: GameState = {
      ...primero.state,
      instances: { ...primero.state.instances, [ID]: { ...primero.state.instances[ID], agotado: false } },
    }
    const segundo = disparar(enderezado, 'eter-1')
    expect(segundo.ok).toBe(true)
    expect(statsDe(segundo.state, ID).poder).toBe(4)
  })

  it('un Campeón enderezado ofrece el Disparo en getValidActions', () => {
    const acciones = getValidActions(setup(), 'A').filter((a) => a.type === 'activar_habilidad')
    expect(acciones).toHaveLength(1)
  })
})

describe('cansado ≠ agotado (§5.2)', () => {
  it('el recién invocado (entradaEsteTurno, enderezado) SÍ puede disparar', () => {
    const s = setup({ entradaEsteTurno: true })
    expect(s.instances[ID].agotado).toBeUndefined()
    const r = disparar(s, 'eter-0')
    expect(r.ok).toBe(true)
    expect(r.state.instances[ID].agotado).toBe(true)
  })
})

describe('TIRADOR (§10): el Disparo no agota', () => {
  it('con la keyword Tirador dispara sin agotarse y puede repetir mientras haya Éter', () => {
    const s = setup({ keywords: ['Tirador'] })
    const primero = disparar(s, 'eter-0')
    expect(primero.ok).toBe(true)
    expect(primero.state.instances[ID].agotado).toBeUndefined()
    const segundo = disparar(primero.state, 'eter-1')
    expect(segundo.ok).toBe(true)
    expect(statsDe(segundo.state, ID).poder).toBe(4)
  })

  it('la regla disparoAgota prohibida por un efecto (sin keyword) tiene el mismo resultado', () => {
    const base = setup()
    const s: GameState = {
      ...base,
      reglasTemporales: [
        { regla: 'disparoAgota', operacion: 'prohibir', orden: 1, sujeto: { tipo: 'carta', instId: ID }, duenio: 'A', expira: 'permanente' },
      ],
    }
    const r = disparar(s, 'eter-0')
    expect(r.ok).toBe(true)
    expect(r.state.instances[ID].agotado).toBeUndefined()
  })

  it('Tirador NO se salta el requisito de estar enderezado: agotado por atacar no dispara', () => {
    const s = setup({ keywords: ['Tirador'], agotado: true })
    expect(disparar(s, 'eter-0').ok).toBe(false)
  })
})

describe('atacar y disparar comparten el agotamiento (§9.2, §5.2)', () => {
  it('atacó → agotado → no dispara', () => {
    const s = setup({}, 'choque')
    const ataque = applyAction(s, { type: 'declarar_ataque', atacanteIds: [ID] }, crearCtx())
    expect(ataque.ok).toBe(true)
    if (!ataque.ok) return
    expect(ataque.state.instances[ID].agotado).toBe(true)
    expect(validarActivarHabilidad(ataque.state, { type: 'activar_habilidad', cardInstanceId: ID, eterIds: ['eter-0'] })).toMatch(/agotada/)
  })

  it('disparó → agotado → no ataca', () => {
    const r = disparar(setup({}, 'choque'), 'eter-0')
    expect(r.ok).toBe(true)
    expect(atacantesElegibles(r.state)).not.toContain(ID)
  })

  it('con Vigor el ataque no agota: después de atacar SÍ puede disparar', () => {
    const s = setup({ keywords: ['Vigor'] }, 'choque')
    const ataque = applyAction(s, { type: 'declarar_ataque', atacanteIds: [ID] }, crearCtx())
    expect(ataque.ok).toBe(true)
    if (!ataque.ok) return
    expect(ataque.state.instances[ID].agotado).toBeUndefined()
    expect(validarActivarHabilidad(ataque.state, { type: 'activar_habilidad', cardInstanceId: ID, eterIds: ['eter-0'] })).toBeNull()
  })
})
