// @vitest-environment node
/**
 * F6 — fin de partida (manual §13 y §5.5 "sexto Vínculo"): la derrota se CONFIRMA después de resolver lo pendiente;
 * si ambos jugadores cumplen una condición de derrota, la partida termina en EMPATE (no es un efecto de carta).
 * Punto de control único: `confirmarFinDePartida` (finPartida.ts), llamado al final de cada acción.
 * Decisiones del usuario (2026-10-26): el mazo vacío también se difiere; solo lo OBLIGATORIO retrasa la
 * confirmación (cadena, elecciones, prevenciones y el elector rival de H4); `derrotaPorVinculos` es por jugador.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { destruirCarta } from '../replacements'
import { confirmarFinDePartida } from '../finPartida'
import { robarCarta } from '../draw'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../../../shared/types'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const VINCULO = 'FB-025' // Vínculo real sin efecto de destrucción
const REVANCHA = 'TEST-VINC-REVANCHA' // al destruirse, destruye 1 Vínculo vivo del rival (manual §13, ejemplo)

beforeAll(() => {
  registrarCartas([
    {
      id: REVANCHA,
      name: 'Vínculo de Revancha de Prueba',
      type: 'Vínculo',
      rarity: 'Común',
      keywords: [],
      paqueteId: 'prueba',
      limiteCopias: '1',
      stats: { cost: 0 },
      efectos: [
        {
          tipo: 'vinculo',
          efecto: 'destroy',
          objetivo: { tipo: 'vinculo', controlador: 'rival', zona: 'campo' },
          stats: { ATQ: 0, RES: 0 },
          texto: 'Al ser destruido, destruye 1 Vínculo del rival.',
          trigger: 'al_ser_destruido_vinculo',
        },
      ],
    },
  ] as unknown as AnyCard[])
})

/* ───────────────────────── Utilidades ───────────────────────── */

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

function jugador(id: PlayerId) {
  return {
    id,
    mano: [] as string[],
    mazo: [] as string[],
    cementerio: [] as string[],
    exilio: [] as string[],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null] as (string | null)[],
    mulliganUsado: true,
  }
}

function estadoMinimo(turno: PlayerId = 'A'): GameState {
  return {
    version: 1,
    seed: 7,
    fase: 'choque',
    turno,
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Pone un Vínculo (vivo o destruido) en el slot dado. */
function conVinculo(s: GameState, owner: PlayerId, slot: number, cardId = VINCULO, bocaArriba = false): string {
  const id = `vin-${owner}-${slot}`
  s.instances[id] = { cardInstanceId: id, cardId, owner, bocaArriba }
  s.players[owner].vinculos[slot] = id
  return id
}

const elegir = (objetivoId: string): Action => ({ type: 'elegir_objetivo', objetivoId })
const terminada = (s: GameState) => s.fase === 'terminada'
const finDe = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'partida_terminada')

/* ───────────────────────── EMPATE (manual §13) ───────────────────────── */

describe('empate: ambos cumplen una condición de derrota al terminar de resolver lo pendiente', () => {
  /**
   * Manual §13: a cada jugador le queda 1 Vínculo. B (el turno) realiza la Ruptura y destruye el último de A, que dice
   * "destruye 1 Vínculo del rival". Su efecto se resuelve ANTES de confirmar la derrota de A: destruye el último de B.
   */
  function hastaRevancha(): { s: GameState; ctx: Ctx } {
    const s = estadoMinimo('B')
    conVinculo(s, 'A', 3, REVANCHA)
    conVinculo(s, 'B', 4)
    const ctx = crearCtx()
    destruirCarta(s, ctx, 'vin-A-3', 'ruptura')
    return { s, ctx }
  }

  it('el efecto del último Vínculo de A destruye el último de B → EMPATE (no gana A ni B)', () => {
    const { s: s0, ctx } = hastaRevancha()
    // A (dueño del efecto, sin el turno) elige el objetivo: lo obligatorio retrasa la confirmación de su derrota
    expect(s0.fase).not.toBe('terminada')
    expect(actorActual(s0)).toBe('A')
    const r = applyAction(s0, elegir('vin-B-4'), ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const s = r.state
    expect(terminada(s)).toBe(true)
    expect(s.ganador).toBeUndefined()
    expect(s.motivo).toBe('empate')
    expect(finDe(ctx)).toEqual([{ type: 'partida_terminada', ganador: null, motivo: 'empate' }])
    expect(getValidActions(s, 'A')).toEqual([])
  })

  it('A y B sin Vínculos vivos a la vez (ambos con destruidos) → empate al confirmar', () => {
    const s = estadoMinimo()
    conVinculo(s, 'A', 0, VINCULO, true)
    conVinculo(s, 'B', 0, VINCULO, true)
    const ctx = crearCtx()
    confirmarFinDePartida(s, ctx)
    expect(s).toMatchObject({ fase: 'terminada', motivo: 'empate' })
    expect(s.ganador).toBeUndefined()
    expect(finDe(ctx)).toEqual([{ type: 'partida_terminada', ganador: null, motivo: 'empate' }])
  })

  it('mazo vacío de ambos en la misma resolución (p. ej. "cada jugador roba 1") → empate', () => {
    const s = estadoMinimo()
    const ctx = crearCtx()
    expect(robarCarta(s, ctx, 'A')).toBe(false)
    expect(robarCarta(s, ctx, 'B')).toBe(false)
    expect(terminada(s)).toBe(false) // todavía no: se confirma al terminar de resolver
    confirmarFinDePartida(s, ctx)
    expect(s).toMatchObject({ fase: 'terminada', motivo: 'empate' })
    expect(finDe(ctx)).toEqual([{ type: 'partida_terminada', ganador: null, motivo: 'empate' }])
  })

  it('mazo vacío de uno y sin Vínculos del otro, a la vez → empate (condiciones de derrota distintas)', () => {
    const s = estadoMinimo()
    conVinculo(s, 'B', 0, VINCULO, true)
    const ctx = crearCtx()
    robarCarta(s, ctx, 'A')
    confirmarFinDePartida(s, ctx)
    expect(s).toMatchObject({ fase: 'terminada', motivo: 'empate' })
  })
})

/* ───────────────────────── Derrota diferida ───────────────────────── */

describe('derrota diferida: solo lo OBLIGATORIO retrasa la confirmación; todo lo demás, no', () => {
  function bSinVinculos(): GameState {
    const s = estadoMinimo('A')
    conVinculo(s, 'B', 0, VINCULO, true)
    return s
  }

  it('un efecto que devuelve un Vínculo vivo antes de confirmar EVITA la derrota (manual §5.5)', () => {
    const s = bSinVinculos()
    conVinculo(s, 'B', 1) // llegó un Vínculo vivo mientras se resolvía lo pendiente
    const ctx = crearCtx()
    confirmarFinDePartida(s, ctx)
    expect(terminada(s)).toBe(false)
    expect(ctx.events).toEqual([])
  })

  it('sin pendientes obligatorios se confirma en el punto de control: al final de CUALQUIER acción (applyAction)', () => {
    const s = bSinVinculos()
    s.fase = 'forja'
    const ctx = crearCtx()
    const r = applyAction(s, { type: 'pasar_turno' }, ctx) // una acción cualquiera, ajena a los Vínculos
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'vinculos' })
    expect(finDe(ctx)).toEqual([{ type: 'partida_terminada', ganador: 'A', motivo: 'vinculos' }])
  })

  it('una cadena abierta, una declaración en elección o una prevención la RETRASAN', () => {
    const base = bSinVinculos()
    const cadena = structuredClone(base)
    cadena.cadena = { origen: 'global', pila: [], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' }
    const decl = structuredClone(base)
    decl.declaracionEnEleccion = { tipo: 'opener', jugador: 'A', pendientes: 1 }
    const preven = structuredClone(base)
    preven.preventivosPendientes = [{ jugador: 'B', fuenteId: 'f', victimId: 'v', causa: 'efecto' } as never]
    for (const s of [cadena, decl, preven]) {
      confirmarFinDePartida(s, crearCtx())
      expect(terminada(s)).toBe(false)
    }
    // y se confirma en cuanto ya no queda nada obligatorio
    const libre = structuredClone(cadena)
    delete libre.cadena
    confirmarFinDePartida(libre, crearCtx())
    expect(libre).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'vinculos' })
  })

  it('la elección obligatoria del rival (H4) la retrasa, pero la cola OPCIONAL del jugador del turno NO', () => {
    const s = bSinVinculos()
    s.instances['x'] = { cardInstanceId: 'x', cardId: VINCULO, owner: 'B' }
    s.instances['y'] = { cardInstanceId: 'y', cardId: VINCULO, owner: 'B' }
    // pendiente del DUEÑO ajeno al turno (B, turno de A): obligatorio
    const rival = structuredClone(s)
    rival.objetivosPendientes = [{ jugador: 'B', instId: 'x', trigger: 'al-invocar', opciones: ['y'] }]
    confirmarFinDePartida(rival, crearCtx())
    expect(terminada(rival)).toBe(false)
    // pendiente del jugador del turno (A): opcional, no retrasa
    const propio = structuredClone(s)
    propio.objetivosPendientes = [{ jugador: 'A', instId: 'x', trigger: 'al-invocar', opciones: ['y'] }]
    confirmarFinDePartida(propio, crearCtx())
    expect(propio).toMatchObject({ fase: 'terminada', ganador: 'A' })
  })

  it('la rendición es inmediata aunque haya una derrota esperando: gana quien no se rindió', () => {
    const s = bSinVinculos()
    s.cadena = { origen: 'global', pila: [], prioridad: 'B', pasesConsecutivos: 0, faseAbierta: 'forja' }
    const r = applyAction(s, { type: 'rendirse', jugador: 'A' }, crearCtx())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
  })
})

/* ───────────────────────── Regla derrotaPorVinculos ───────────────────────── */

describe('regla derrotaPorVinculos (§13): por jugador, un efecto puede prohibirla', () => {
  const prohibirA = (s: GameState) => {
    s.reglasTemporales = [
      { regla: 'derrotaPorVinculos', operacion: 'prohibir', orden: 1, sujeto: { tipo: 'jugador', jugador: 'A' }, duenio: 'A', expira: 'permanente' },
    ]
  }

  it('base: sin Vínculos pierde; con la regla prohibida para SU jugador no pierde, pero el rival sigue perdiendo', () => {
    const s = estadoMinimo()
    conVinculo(s, 'A', 0, VINCULO, true)
    prohibirA(s)
    const ctx = crearCtx()
    confirmarFinDePartida(s, ctx)
    expect(terminada(s)).toBe(false) // A está protegido
    conVinculo(s, 'B', 0, VINCULO, true)
    confirmarFinDePartida(s, ctx)
    expect(s).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'vinculos' }) // solo B pierde
  })

  it('si la protección termina con 0 Vínculos, pierde en el siguiente punto de control', () => {
    const s = estadoMinimo()
    conVinculo(s, 'A', 0, VINCULO, true)
    prohibirA(s)
    confirmarFinDePartida(s, crearCtx())
    expect(terminada(s)).toBe(false)
    delete s.reglasTemporales // la regla deja de modificarse
    confirmarFinDePartida(s, crearCtx())
    expect(s).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'vinculos' })
  })
})

/* ───────────────────────── Alba: mazo vacío ───────────────────────── */

describe('mazo vacío en el Alba (flujo real por applyAction)', () => {
  it('el rival pasa al Alba con el mazo vacío: pierde al intentar robar, sin llegar a su Forja', () => {
    const s = estadoMinimo('A')
    s.fase = 'ocaso'
    const ctx = crearCtx()
    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state).toMatchObject({ fase: 'terminada', motivo: 'mazo_vacio', ganador: 'A' }) // pierde B (su mazo está vacío)
    const tipos = ctx.events.map((e) => e.type)
    expect(tipos.slice(-2)).toEqual(['mazo_agotado', 'partida_terminada'])
    expect(tipos.filter((t) => t === 'fase_iniciada').length).toBe(1) // solo el Alba de B; no hay Forja
  })
})
