// @vitest-environment node
/**
 * Cartas de coste 0 — Idris, El Podador (PU-010), el Soberano de Purga: su precio es el Campeón que sacrifica, no Éter.
 * Antes `validarPago` rechazaba la lista de Éter vacía y, a la vez, cualquier Éter era «sobrepago»: la carta era injugable
 * (solo se podía pagar cuando una regla del rival le sumaba coste).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { getCardMeta } from '../cards'
import { costeDeCampeon, validarPago } from '../payments'
import { getValidActions } from '../validActions'
import type { Action } from '../types'
import { cargarCartasPrueba, conCampeon, conEteres, conMano, crearCtx, escenaVacia, PR } from './helpers/cartasPrueba'

const IDRIS = 'PU-010'
const PASANTE = 'PU-011' // Campeón de Purga (comparte facción con Idris)
const ELENA = 'FB-015' // Campeón de otra facción (no puede ser sacrificado por Idris)
const AURORA = 'FB-010' // su tributo suma coste a los Campeones del rival

type JugarCampeon = Extract<Action, { type: 'jugar_campeon' }>
const jugadas = (s: ReturnType<typeof escenaVacia>, id: string) =>
  getValidActions(s, 'A').filter((a): a is JugarCampeon => a.type === 'jugar_campeon' && a.cardInstanceId === id)

beforeAll(() => {
  cargarCartasPrueba()
})

function escena(conEter = 5) {
  const s = escenaVacia('forja')
  conEteres(s, 'A', conEter)
  conMano(s, 'A', 'idris', IDRIS)
  conCampeon(s, 'A', 'pasante', PASANTE, 0)
  return s
}

describe('validarPago · coste 0', () => {
  it('Idris es la carta de coste 0 y se confirma el dato', () => {
    expect(getCardMeta(IDRIS)?.stats.cost).toBe(0)
    expect(getCardMeta(PASANTE)?.stats.cost).toBeGreaterThan(0)
  })

  it('una carta de coste 0 se paga con la lista vacía (aporte 0)', () => {
    const s = escena()
    expect(validarPago(s, 'A', [], IDRIS, true)).toEqual({ ok: true, aportado: 0 })
  })

  it('con coste mayor que 0 la lista vacía SIGUE siendo un error', () => {
    const s = escena()
    expect(validarPago(s, 'A', [], PASANTE, true)).toEqual({ ok: false, error: 'no indicaste Éteres para pagar' })
  })

  it('pagar Éter de más una carta de coste 0 sigue siendo sobrepago', () => {
    const s = escena()
    const r = validarPago(s, 'A', [s.players.A.eterReserva[0]], IDRIS, true)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/sobrepago/)
  })

  it('una carta desconocida con lista vacía sigue dando el error de siempre', () => {
    const s = escena()
    expect(validarPago(s, 'A', [], 'NO-EXISTE', true).ok).toBe(false)
  })
})

describe('Idris: ahora se puede jugar', () => {
  it('el motor ofrece jugarla, sin Éter y sacrificando a un Campeón de su facción', () => {
    const s = escena()
    const j = jugadas(s, 'idris')
    expect(j).toHaveLength(1)
    expect(j[0].eterIds).toEqual([])
    expect(j[0].sacrificios).toEqual(['pasante'])
  })

  it('al jugarla no gasta Éter, el sacrificado va al Cementerio y entra en su slot', () => {
    const s = escena()
    const reservaAntes = s.players.A.eterReserva.length
    const accion = jugadas(s, 'idris')[0]
    const ctx = crearCtx()
    const r = applyAction(s, accion, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.players.A.campo.campeones[accion.slot]).toBe('idris')
    expect(r.state.players.A.cementerio).toContain('pasante')
    expect(r.state.players.A.eterReserva).toHaveLength(reservaAntes)
    expect(r.state.players.A.eterPagado).toHaveLength(0)
    // El coste del sacrificado queda como referencia de su efecto («de coste igual o menor al del sacrificado»)
    expect(r.state.instances.idris.costeSacrificado).toBe(getCardMeta(PASANTE)?.stats.cost)
  })

  it('no emite eter_pagado (el log y las animaciones esperan al menos un Éter)', () => {
    const s = escena()
    const ctx = crearCtx()
    const r = applyAction(s, jugadas(s, 'idris')[0], ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events.map((e) => e.type)).not.toContain('eter_pagado')
    expect(r.events.map((e) => e.type)).toContain('carta_invocada')
  })

  it('funciona incluso sin una sola carta de Éter en la Reserva (su coste es 0)', () => {
    const s = escena(0)
    expect(jugadas(s, 'idris')).toHaveLength(1)
  })

  it('sin un Campeón que sacrificar NO se ofrece (sigue exigiendo el sacrificio de Soberano)', () => {
    const s = escenaVacia('forja')
    conEteres(s, 'A', 5)
    conMano(s, 'A', 'idris', IDRIS)
    expect(jugadas(s, 'idris')).toHaveLength(0)
  })

  it('un Campeón de OTRA facción no sirve de sacrificio', () => {
    const s = escenaVacia('forja')
    conEteres(s, 'A', 5)
    conMano(s, 'A', 'idris', IDRIS)
    conCampeon(s, 'A', 'elena', ELENA, 0)
    expect(jugadas(s, 'idris')).toHaveLength(0)
  })

  it('forzar la acción con Éter de más la rechaza (sobrepago)', () => {
    const s = escena()
    const base = jugadas(s, 'idris')[0]
    const r = applyAction(s, { ...base, eterIds: [s.players.A.eterReserva[0]] }, crearCtx())
    expect(r.ok).toBe(false)
  })
})

/** El tributo de Aurora («los Campeones del rival cuestan 1 Éter más») solo rige MIENTRAS tenga Éter bloqueado en ella. */
function conTributo(s: ReturnType<typeof escenaVacia>) {
  const bloqueados = conEteres(s, 'B', 3)
  s.players.B.eterReserva = s.players.B.eterReserva.filter((id) => !bloqueados.includes(id))
  // El Continuo del tributo es el efecto [1] de Aurora y vale desde que su bloqueo se pagó (continuosActivados)
  conCampeon(s, 'B', 'aurora', AURORA, 0, { eterBloqueado: bloqueados, continuosActivados: [1] })
}

describe('Idris con recargo: el coste efectivo vuelve a exigir Éter', () => {
  it('con el tributo de Aurora del rival su coste efectivo es 1 y se paga con 1 Éter', () => {
    const s = escena()
    conTributo(s)
    expect(costeDeCampeon(s, 'A', IDRIS)).toBe(1)
    const j = jugadas(s, 'idris')
    expect(j).toHaveLength(1)
    expect(j[0].eterIds).toHaveLength(1)
    expect(validarPago(s, 'A', [], IDRIS, true).ok).toBe(false)
  })

  it('sin Éter en la Reserva y con recargo no se puede jugar', () => {
    const s = escena(0)
    conTributo(s)
    expect(jugadas(s, 'idris')).toHaveLength(0)
  })
})

describe('Las demás cartas no cambian', () => {
  it('una Mística de coste > 0 sigue exigiendo su Éter', () => {
    const s = escenaVacia('forja')
    conEteres(s, 'A', 5)
    expect(PR.RAYO).toBeDefined()
    expect(validarPago(s, 'A', [], PR.RAYO, false).ok).toBe(false)
  })
})
