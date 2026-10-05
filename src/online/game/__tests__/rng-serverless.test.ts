// @vitest-environment node
/**
 * RNG serverless: createCtxFromDraws restaura el stream en la misma posición.
 * Edge Functions son stateless — sin esto, cada invocación reiniciaría el RNG
 * y la partida se desincronizaría (contrato §6).
 */
import { describe, it, expect } from 'vitest'
import { createCtx, createCtxFromDraws } from '../rng'
import { createInitialState } from '../initialState'
import { applyAction } from '../actions'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('createCtxFromDraws (persistencia RNG serverless)', () => {
  it('misma seed + misma posición → misma continuación del stream', () => {
    const a = createCtx(42)
    const b = createCtxFromDraws(42, a.draws)
    // Consumir igual en ambos
    const seqA = [a.next(), a.next(), a.next()]
    const seqB = [b.next(), b.next(), b.next()]
    expect(seqB).toEqual(seqA)
  })

  it('restaurar en draws=N equivale a consumir N antes', () => {
    const full = createCtx(7)
    for (let i = 0; i < 50; i++) full.next()
    const mid = full.draws
    const expected = [full.next(), full.next()]

    const restored = createCtxFromDraws(7, mid)
    expect([restored.next(), restored.next()]).toEqual(expected)
  })

  it('partida completa: applyAction con ctx restaurado = ctx continuo', () => {
    const { state: s0, ctx: ctx0 } = createInitialState(deckA, deckB, 99)
    // Mulligans + algunas acciones con ctx original
    let s = applyAction(s0, { type: 'pasar_mulligan' }, ctx0).state
    s = applyAction(s, { type: 'pasar_mulligan' }, ctx0).state
    const drawsTrasSetup = ctx0.draws
    expect(drawsTrasSetup).toBeGreaterThan(0)

    // Snapshot serverless
    const snapshot = { state: JSON.parse(JSON.stringify(s)), rngDraws: drawsTrasSetup }

    // Camino A: ctx original continúa
    const rA = applyAction(s, { type: 'pasar_turno' }, ctx0)

    // Camino B: ctx restaurado desde snapshot (simula Edge Function nueva)
    const ctxRestaurado = createCtxFromDraws(99, snapshot.rngDraws)
    const sB = JSON.parse(JSON.stringify(snapshot.state))
    const rB = applyAction(sB, { type: 'pasar_turno' }, ctxRestaurado)

    expect(rB.ok).toBe(true)
    expect(rA.ok).toBe(true)
    expect(JSON.stringify(rB.state)).toBe(JSON.stringify(rA.state))
    expect(rB.ctx?.draws ?? ctxRestaurado.draws).toBe(ctx0.draws)
  })
})
