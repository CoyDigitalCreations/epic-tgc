// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { mulberry32 } from '../../../shared/rng'
import { getCardMeta } from '../cards'
import { createInitialState } from '../initialState'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import type { Action } from '../actions'
import { expandirMazo, fisherYatesReferencia } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS) // 66: 15 Éter + 45 Principal + 6 Vínculos
const deckB = expandirMazo(DISONANCIA_CARDS)

const esPrincipal = (cardId: string | null) => {
  if (!cardId) return false
  const t = getCardMeta(cardId)?.type
  return t !== 'Éter' && t !== 'Vínculo'
}
const vinculosDe = (deck: string[]) => deck.filter((id) => getCardMeta(id)?.type === 'Vínculo')

describe('createInitialState (R3, R4, R6)', () => {
  it('monta el setup completo de zonas: 2A=15 Éter, 4A-4F=6 Vínculos, mano=5, 3G=40 (45 principales en 3G+mano)', () => {
    const { state } = createInitialState(deckA, deckB, 123)
    for (const id of ['A', 'B'] as const) {
      const p = state.players[id]
      expect(p.eterReserva).toHaveLength(15)
      expect(p.vinculos.filter((v): v is string => v !== null)).toHaveLength(6)
      expect(p.mano).toHaveLength(5)
      expect(p.mazo).toHaveLength(40)
      // Las 45 cartas principales del mazo se reparten entre 3G (40) y mano (5)
      expect(p.mazo.length + p.mano.length).toBe(45)
    }
  })

  it('las zonas contienen los tipos correctos (2A=Éter, 4A-4F=Vínculo, mano/3G=Principal)', () => {
    const { state } = createInitialState(deckA, deckB, 123)
    for (const id of ['A', 'B'] as const) {
      const p = state.players[id]
      for (const instId of p.eterReserva) {
        expect(getCardMeta(state.instances[instId].cardId!)?.type).toBe('Éter')
      }
      for (const instId of p.vinculos.filter((v): v is string => v !== null)) {
        expect(getCardMeta(state.instances[instId].cardId!)?.type).toBe('Vínculo')
      }
      for (const instId of [...p.mano, ...p.mazo]) {
        const t = getCardMeta(state.instances[instId].cardId!)?.type
        expect(t).not.toBe('Éter')
        expect(t).not.toBe('Vínculo')
      }
    }
  })

  it('serializa sin pérdida: JSON.stringify/parse es deep-equal al estado original', () => {
    const { state } = createInitialState(deckA, deckB, 123)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it('asigna cardInstanceId c1..c132 estables: c1..c66 de A, c67..c132 de B, sin dependencia del seed', () => {
    const a = createInitialState(deckA, deckB, 123)
    const b = createInitialState(deckA, deckB, 123)
    const c = createInitialState(deckA, deckB, 999)
    expect(Object.keys(a.state.instances)).toHaveLength(132)
    expect(Object.keys(a.state.instances)[0]).toBe('c1')
    expect(Object.keys(a.state.instances)[131]).toBe('c132')
    expect(Object.keys(a.state.instances)).toEqual(Object.keys(b.state.instances))
    expect(Object.keys(a.state.instances)).toEqual(Object.keys(c.state.instances))
    expect(a.state.instances['c1'].owner).toBe('A')
    expect(a.state.instances['c66'].owner).toBe('A')
    expect(a.state.instances['c67'].owner).toBe('B')
    expect(a.state.instances['c132'].owner).toBe('B')
  })

  it('baraja 3G determinísticamente: mismo seed → mismo mazo; seed distinto → mazo distinto', () => {
    const a = createInitialState(deckA, deckB, 123)
    const b = createInitialState(deckA, deckB, 123)
    const c = createInitialState(deckA, deckB, 456)
    expect(a.state.players.A.mazo).toEqual(b.state.players.A.mazo)
    expect(a.state.players.B.mazo).toEqual(b.state.players.B.mazo)
    expect(a.state.players.A.mazo).not.toEqual(c.state.players.A.mazo)
    expect(a.state.players.B.mazo).not.toEqual(c.state.players.B.mazo)
  })

  it('consume el stream en el orden documentado: mazoA 44 → mazoB 44 → vínculosA 5 → vínculosB 5 → moneda 1', () => {
    const seed = 123
    const { state, ctx } = createInitialState(deckA, deckB, seed)
    const rand = mulberry32(seed)

    // Input EXACTO del barajado del motor (ADR-2): las zonas guardan cardInstanceIds;
    // el orden relativo de las instancias principales es el de entrada de cada deck
    const instanciasPrincipal = (owner: 'A' | 'B') =>
      Object.values(state.instances)
        .filter((inst) => inst.owner === owner && esPrincipal(inst.cardId))
        .map((inst) => inst.cardInstanceId)

    // 1-2. Fisher-Yates de los mazos (44 extracciones c/u) → define 3G + mano
    expect([...state.players.A.mano, ...state.players.A.mazo]).toEqual(
      fisherYatesReferencia(instanciasPrincipal('A'), rand),
    )
    expect([...state.players.B.mano, ...state.players.B.mazo]).toEqual(
      fisherYatesReferencia(instanciasPrincipal('B'), rand),
    )

    // 3-4. barajado cosmético de Vínculos (5 extracciones c/u, resultado descartado)
    fisherYatesReferencia(vinculosDe(deckA), rand)
    fisherYatesReferencia(vinculosDe(deckB), rand)

    // 5. moneda: la 99ª extracción decide el primer jugador (A si < 0.5)
    const moneda = rand()
    expect(moneda < 0.5 ? 'A' : 'B').toBe(state.primerJugador)
    expect(state.primerTurno).toBe(true)

    // El ctx continúa el MISMO stream: su siguiente valor es la extracción 100
    expect(ctx.next()).toBe(rand())
  })

  it('determina el primer jugador por moneda: mismo seed → mismo resultado; la moneda varía entre seeds', () => {
    const a = createInitialState(deckA, deckB, 123)
    const b = createInitialState(deckA, deckB, 123)
    expect(a.state.primerJugador).toBe(b.state.primerJugador)
    const primeros = new Set(
      Array.from({ length: 30 }, (_, i) => createInitialState(deckA, deckB, i + 1).state.primerJugador),
    )
    expect(primeros.has('A')).toBe(true)
    expect(primeros.has('B')).toBe(true)
  })

  it('respeta el orden de Vínculos elegido por el jugador (SetupOptions.vinculosA)', () => {
    const ordenElegido = ['FB-030', 'FB-029', 'FB-028', 'FB-027', 'FB-026', 'FB-025']
    const { state } = createInitialState(deckA, deckB, 123, { vinculosA: ordenElegido })
    const idsA = state.players.A.vinculos
      .filter((v): v is string => v !== null)
      .map((instId) => state.instances[instId].cardId)
    expect(idsA).toEqual(ordenElegido)
  })

  it('rechaza mazos con distribución inválida (no 15/45/6)', () => {
    const incompleto = deckA.slice(0, 60)
    expect(() => createInitialState(incompleto, deckB, 1)).toThrow()
  })
})

describe('mulligan y arranque de partida (R5)', () => {
  it('A mulliganea: sus 5 cartas vuelven al mazo, baraja y roba 5 nuevas; turno pasa a B', () => {
    const { state, ctx } = createInitialState(deckA, deckB, 123)
    expect(state.fase).toBe('pre_partida')
    expect(state.turno).toBe('A')
    const manoAntigua = state.players.A.mano

    const r = applyAction(state, { type: 'mulligan' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('mulligan de A falló')

    const s = r.state
    expect(s.players.A.mulliganUsado).toBe(true)
    expect(s.turno).toBe('B')
    expect(s.players.A.mano).toHaveLength(5)
    expect(s.players.A.mazo).toHaveLength(40)
    expect(s.players.A.mano).not.toEqual(manoAntigua)
    expect([...s.players.A.mano, ...s.players.A.mazo]).toHaveLength(45)
    expect(ctx.events.map((e) => e.type)).toContain('mulligan_realizado')
  })

  it('el mulligan consume exactamente 44 extracciones (posiciones 100-143) y el resultado es el barajado de mano+mazo', () => {
    const seed = 123
    const { state, ctx } = createInitialState(deckA, deckB, seed)
    const manoAntigua = state.players.A.mano

    const r = applyAction(state, { type: 'mulligan' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('mulligan falló')

    const rand = mulberry32(seed)
    for (let i = 0; i < 99; i++) rand() // posición del stream tras el setup
    const barajado = fisherYatesReferencia([...manoAntigua, ...state.players.A.mazo], rand)
    expect(r.state.players.A.mano).toEqual(barajado.slice(0, 5))
    expect(r.state.players.A.mazo).toEqual(barajado.slice(5))
  })

  it('pasar_mulligan no consume RNG y cede el turno de mulligan', () => {
    const seed = 123
    const { state, ctx } = createInitialState(deckA, deckB, seed)
    const r = applyAction(state, { type: 'pasar_mulligan' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('pasar_mulligan falló')
    expect(r.state.turno).toBe('B')
    const rand = mulberry32(seed)
    for (let i = 0; i < 99; i++) rand()
    expect(ctx.next()).toBe(rand()) // posición 100: pasar_mulligan no consumió
  })

  it('el mulligan es una vez POR JUGADOR: tras el de A, B aún puede usar el suyo', () => {
    const { state, ctx } = createInitialState(deckA, deckB, 123)
    expect(getValidActions(state, 'A').map((a) => a.type)).toContain('mulligan')

    const r = applyAction(state, { type: 'mulligan' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('primer mulligan falló')

    // A ya no puede mulliganear (usó su única vez)
    expect(getValidActions(r.state, 'A').map((a) => a.type)).not.toContain('mulligan')

    // B SÍ puede: el mulligan es por jugador (manual §2: "Solo una vez por jugador")
    expect(getValidActions(r.state, 'B').map((a) => a.type)).toContain('mulligan')
    const r2 = applyAction(r.state, { type: 'mulligan' }, ctx) // actor implícito = turno = B
    expect(r2.ok).toBe(true)
    if (!r2.ok) throw new Error('mulligan de B falló')
    expect(r2.state.players.B.mulliganUsado).toBe(true)
  })

  it('al decidir ambos jugadores la partida inicia: partida_iniciada, turno_iniciado, alba, robo, forja', () => {
    const { state, ctx } = createInitialState(deckA, deckB, 123)
    let s = state
    const decisiones: Action[] = [{ type: 'pasar_mulligan' }, { type: 'pasar_mulligan' }]
    for (const accion of decisiones) {
      const r = applyAction(s, accion, ctx)
      if (!r.ok) throw new Error('pasar_mulligan falló')
      s = r.state
    }
    expect(s.fase).toBe('forja')
    expect(s.turno).toBe(s.primerJugador)
    expect(s.primerTurno).toBe(true)
    // el primer jugador robó 1 en su Alba → mano 6
    expect(s.players[s.primerJugador].mano).toHaveLength(6)
    expect(s.players[s.primerJugador].mazo).toHaveLength(39)

    const tipos = ctx.events.map((e) => e.type)
    expect(tipos).toEqual([
      'partida_iniciada',
      'turno_iniciado',
      'fase_iniciada', // alba
      'carta_robada',
      'fase_iniciada', // forja
    ])
  })
})
