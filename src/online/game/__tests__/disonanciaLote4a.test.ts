// @vitest-environment node
/**
 * Lote 4A del motor de Disonancia — cartas REALES del seed:
 *  - R1 · Éter arrebatado (DS-007, Ragnar DS-010, Draven DS-012, Cristal del Nudo DS-028): el Éter pasa a TU Reserva pero su dueño
 *    no cambia; vuelve a la Reserva de su dueño en SU Alba, no activa sus efectos para quien lo tiene y no se puede bloquear.
 *  - N1 · Olvido (Maldición del Sur DS-022, Ragnar DS-010, Grito del Primogénito DS-030): lo del rival que caería al Cementerio se exilia.
 *  - Verificación de FB-028 (Estásis): «al inicio de la Alba del rival» solo en el Alba del RIVAL.
 *  - Resto de cartas del rediseño que usan solo motor existente (DS-002/004/013/015/018/023/026/032/033).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AnyCard } from '../../../shared/types'
import { applyAction } from '../actions'
import { aplicarPago, reagruparEter, validarBloqueo } from '../payments'
import { destruirCarta, enviarAlCementerio } from '../replacements'
import { keywordsDe, statsDe, dispararTrigger } from '../efectos'
import { getCardMeta } from '../cards'
import { reglaBool, reglaNumero } from '../reglas'
import { getValidActions } from '../validActions'
import { buildReporte } from '../coverageMap'
import type { Ctx, GameState } from '../types'
import {
  PR, aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, conMistica, conVinculo, crearCtx, enCementerio,
  escenaVacia,
} from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

const elegir = (s: GameState, ctx: Ctx, objetivoId: string) => aplicar(s, { type: 'elegir_objetivo', objetivoId }, ctx)
const pasar = (s: GameState, ctx: Ctx): GameState => aplicar(s, { type: 'pasar_turno' }, ctx)
/** Pasa el turno del jugador activo hasta que empiece el del rival (Forja → Choque → Ocaso → Alba del rival). */
function pasarTurnoCompleto(s: GameState, ctx: Ctx = crearCtx()): GameState {
  const de = s.turno
  let e = s
  for (let i = 0; i < 4 && e.turno === de; i++) e = pasar(e, ctx)
  return e
}
/** Paga `cardIdEter` (en la Reserva de A) por un Peón: dispara «al pagar» del Éter. */
function pagarCon(cardIdEter: string, preparar?: (s: GameState) => void): { s: GameState; ctx: Ctx; eter: string } {
  const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
  const [eter] = conEteres(s, 'A', 1, cardIdEter)
  preparar?.(s)
  const ctx = crearCtx()
  aplicarPago(s, ctx, 'A', [eter], PR.PEON, { tipo: 'jugar' })
  return { s, ctx, eter }
}
/** Vínculos vivos de relleno en ambos lados (sin ellos el Alba termina la partida por derrota de Vínculos). */
function conVinculosVivos(s: GameState): void {
  for (const j of ['A', 'B'] as const) for (let i = 1; i <= 2; i++) conVinculo(s, j, `vv-${j}-${i}`, PR.VINC_VACIO, i, false)
}
/** Simula el arrebato de `ids` (Éter de B) a la Reserva de A SIN cambiar su dueño (lo mismo que hace steal_ether). */
function arrebatar(s: GameState, ids: string[]): void {
  for (const id of ids) {
    s.players.B.eterReserva = s.players.B.eterReserva.filter((x) => x !== id)
    s.players.A.eterReserva.push(id)
  }
}

/* ═══════════════════════════ R1 · Éter arrebatado ═══════════════════════════ */

describe('R1 · Éter arrebatado — DS-007 «Éter del Desgarro»', () => {
  it('al pagarlo, A elige 1 Éter de la Reserva de B y lo arrebata: pasa a la Reserva de A pero su DUEÑO sigue siendo B', () => {
    const { s: s0, ctx } = pagarCon('DS-007', (e) => { conEteres(e, 'B', 3) })
    expect(s0.objetivosPendientes?.[0].opciones).toEqual(['eter-B-0', 'eter-B-1', 'eter-B-2'])
    const s = elegir(s0, ctx, 'eter-B-1')
    expect(s.players.A.eterReserva).toEqual(['eter-B-1'])
    expect(s.players.B.eterReserva).toEqual(['eter-B-0', 'eter-B-2'])
    expect(s.instances['eter-B-1'].owner).toBe('B')
  })
  it('respeta cantidad 1 aunque se le pase más de un objetivo (solo se arrebata 1)', () => {
    const { s: s0, ctx } = pagarCon('DS-007', (e) => { conEteres(e, 'B', 3) })
    const s = elegir(s0, ctx, 'eter-B-0')
    expect(s.players.A.eterReserva).toHaveLength(1)
    expect(s.players.B.eterReserva).toHaveLength(2)
  })
})

describe('R1 · el Éter arrebatado vuelve a la Reserva de su DUEÑO en el Alba del dueño', () => {
  it('en el Alba del dueño (B) regresa a la Reserva de B, también si A ya lo había gastado (zona de pago de A)', () => {
    const { s: s0, ctx } = pagarCon('DS-007', (e) => { conEteres(e, 'B', 3) })
    let s = elegir(s0, ctx, 'eter-B-1')
    // A gasta el Éter arrebatado para pagar una carta: pasa a SU zona de pago, sigue siendo de B
    s.players.A.eterReserva = []; s.players.A.eterPagado.push('eter-B-1')
    s = pasarTurnoCompleto(s, ctx) // empieza el turno (y el Alba) de B
    expect(s.turno).toBe('B')
    expect(s.players.B.eterReserva).toContain('eter-B-1')
    expect(s.players.A.eterReserva).not.toContain('eter-B-1')
    expect(s.players.A.eterPagado).not.toContain('eter-B-1')
  })
  it('en el Alba del que lo arrebató (A) NO regresa: es prestado hasta el Alba de su dueño', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conEteres(s, 'B', 2); arrebatar(s, ['eter-B-0'])
    reagruparEter(s, crearCtx(), 'A')
    expect(s.players.A.eterReserva).toEqual(['eter-B-0'])
    reagruparEter(s, crearCtx(), 'B')
    expect(s.players.A.eterReserva).toEqual([])
    expect(s.players.B.eterReserva).toContain('eter-B-0')
  })
  it('lo propio de A que estaba en la zona de pago de A sigue reagrupándose a la Reserva de A (sin regresiones)', () => {
    const s = escenaVacia('forja')
    const [a0] = conEteres(s, 'A', 1)
    s.players.A.eterReserva = []; s.players.A.eterPagado = [a0]
    reagruparEter(s, crearCtx(), 'A')
    expect(s.players.A.eterReserva).toEqual([a0])
  })
})

describe('R1 · el Éter arrebatado no activa sus efectos para quien lo tiene', () => {
  it('DS-002 (aura de Reserva): en la Reserva de su dueño debilita al Campeón de mayor ATQ rival; arrebatado, no hace nada', () => {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'mio', PR.PEON, 0)
    const base = statsDe(s, 'mio').poder
    conEteres(s, 'B', 1, 'DS-002')
    expect(statsDe(s, 'mio').poder).toBe(base - 1) // control: el Éter de B en la Reserva de B sí aplica
    arrebatar(s, ['eter-B-0'])
    expect(statsDe(s, 'mio').poder).toBe(base)      // en la Reserva de A (dueño B) no aplica, ni contra A ni a favor de A
  })
  it('DS-004 («al pagar»): pagar con el Éter arrebatado NO hace descartar al rival', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conEteres(s, 'B', 1, 'DS-004'); arrebatar(s, ['eter-B-0'])
    conMano(s, 'B', 'm1', PR.PEON)
    const ctx = crearCtx()
    aplicarPago(s, ctx, 'A', ['eter-B-0'], PR.PEON, { tipo: 'jugar' })
    expect(s.players.A.eterPagado).toEqual(['eter-B-0']) // se puede gastar como cualquiera
    expect(s.players.B.mano).toEqual(['m1'])             // pero su efecto no se activó
  })
  it('DS-004 propio (control): pagar con su propio Éter sí descarta', () => {
    const { s } = pagarCon('DS-004', (e) => { conMano(e, 'B', 'm1', PR.PEON) })
    expect(s.players.B.mano).toEqual([])
  })
  it('un Éter de Choque en la Reserva (DS-003) arrebatado no dispara «al inicio del Choque» para A', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'mio', PR.PEON, 0)
    conEteres(s, 'B', 1, 'DS-003'); arrebatar(s, ['eter-B-0'])
    const ctx = crearCtx()
    const e = pasar(s, ctx) // Forja → Choque de A
    expect(keywordsDe(e, 'mio')).not.toContain('Carga')
  })
})

describe('R1 · el Éter arrebatado no se puede bloquear', () => {
  function conRagnar(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 0)
    conEteres(s, 'A', 3); conEteres(s, 'B', 3)
    return s
  }
  it('validarBloqueo rechaza un Éter ajeno y acepta los propios', () => {
    const s = conRagnar()
    arrebatar(s, ['eter-B-0', 'eter-B-1', 'eter-B-2'])
    expect(validarBloqueo(s, 'A', ['eter-B-0', 'eter-B-1', 'eter-B-2'], 'ragnar', 1)).toMatch(/arrebatado/)
    expect(validarBloqueo(s, 'A', ['eter-A-0', 'eter-A-1', 'eter-A-2'], 'ragnar', 1)).toBeNull()
  })
  it('getValidActions no ofrece bloquear_eter con Éter arrebatado y sí con el propio', () => {
    const s = conRagnar()
    const bloqueos = (st: GameState) => getValidActions(st, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos(s)).not.toHaveLength(0)
    s.players.A.eterReserva = []
    arrebatar(s, ['eter-B-0', 'eter-B-1', 'eter-B-2'])
    expect(bloqueos(s)).toHaveLength(0)
  })
  it('el motor rechaza la acción bloquear_eter con Éter arrebatado', () => {
    const s = conRagnar()
    arrebatar(s, ['eter-B-0', 'eter-B-1', 'eter-B-2'])
    const r = applyAction(s, { type: 'bloquear_eter', eterIds: ['eter-B-0', 'eter-B-1', 'eter-B-2'], targetInstanceId: 'ragnar', efectoIdx: 1 }, crearCtx())
    expect(r.ok).toBe(false)
  })
})

describe('R1 · Ragnar (DS-010) «Arrebato»: paga 2 Éter, una vez por turno, arrebata hasta 2 sin elegir', () => {
  function escena(reservaRival: number): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 0)
    conEteres(s, 'A', 2); conEteres(s, 'B', reservaRival)
    return s
  }
  const activar = (s: GameState, ctx: Ctx) => aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'ragnar', eterIds: ['eter-A-0', 'eter-A-1'] }, ctx)
  /** Resuelve la ventana de respuesta de la activación (nadie responde). */
  function resolver(s: GameState, ctx: Ctx): GameState {
    let e = s
    for (let i = 0; i < 6 && e.cadena; i++) e = aplicar(e, { type: 'pasar_prioridad' }, ctx)
    return e
  }
  it('con 3 Éter en la Reserva rival arrebata los primeros 2 (sin elegir) y paga 2 a su zona de pago', () => {
    const ctx = crearCtx()
    const s = resolver(activar(escena(3), ctx), ctx)
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.players.A.eterReserva).toEqual(['eter-B-0', 'eter-B-1'])
    expect(s.players.B.eterReserva).toEqual(['eter-B-2'])
    expect(s.players.A.eterPagado).toEqual(['eter-A-0', 'eter-A-1'])
    expect(s.instances['eter-B-0'].owner).toBe('B')
  })
  it('«hasta 2»: con solo 1 Éter en la Reserva rival arrebata ese 1', () => {
    const ctx = crearCtx()
    const s = resolver(activar(escena(1), ctx), ctx)
    expect(s.players.A.eterReserva).toEqual(['eter-B-0'])
    expect(s.players.B.eterReserva).toEqual([])
  })
  it('y los 2 arrebatados vuelven a B en su Alba', () => {
    const ctx = crearCtx()
    const s = pasarTurnoCompleto(resolver(activar(escena(3), ctx), ctx), ctx)
    expect(s.turno).toBe('B')
    expect(s.players.B.eterReserva).toEqual(expect.arrayContaining(['eter-B-0', 'eter-B-1', 'eter-B-2']))
    expect(s.players.A.eterReserva).toEqual([])
  })
})

describe('R1 · Draven (DS-012) arrebata 1 Éter al matar en combate', () => {
  it('«al matar en combate»: A elige 1 Éter de la Reserva de B; sigue siendo de B', () => {
    const s = escenaVacia('choque'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'draven', 'DS-012', 0); conEteres(s, 'B', 2)
    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-matar-en-combate', 'A', ['draven'])
    expect(s.objetivosPendientes?.[0].opciones).toEqual(['eter-B-0', 'eter-B-1'])
    const e = elegir(s, ctx, 'eter-B-1')
    expect(e.players.A.eterReserva).toEqual(['eter-B-1'])
    expect(e.instances['eter-B-1'].owner).toBe('B')
  })
})

describe('R1 · Cristal del Nudo (DS-028) arrebata 1 Éter al inicio de TU Alba (Vínculo roto)', () => {
  it('en el Alba de A arrebata 1 Éter de B; en el Alba de B vuelve', () => {
    const s = escenaVacia('forja'); s.turno = 'B'; conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conVinculosVivos(s)
    conVinculo(s, 'A', 'cristal', 'DS-028', 0, true); conEteres(s, 'B', 2)
    const ctx = crearCtx()
    let e = pasarTurnoCompleto(s, ctx) // Alba de A
    expect(e.turno).toBe('A')
    expect(e.objetivosPendientes?.[0].opciones).toEqual(['eter-B-0', 'eter-B-1'])
    e = elegir(e, ctx, 'eter-B-0')
    expect(e.players.A.eterReserva).toContain('eter-B-0')
    e = pasarTurnoCompleto(e, ctx) // Alba de B
    expect(e.turno).toBe('B')
    expect(e.players.B.eterReserva).toContain('eter-B-0')
    expect(e.players.A.eterReserva).not.toContain('eter-B-0')
  })
})

/* ═══════════════════════════ N1 · Olvido ═══════════════════════════ */

describe('N1 · Olvido — la regla cementerioAlExilio', () => {
  /** B tiene un Campeón, una Mística y una carta en la mano; A tiene un Campeón. */
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'a1', PR.PEON, 0); conCampeon(s, 'B', 'b1', PR.PEON, 0)
    return s
  }
  const olvidoPara = (s: GameState, j: 'A' | 'B') => reglaBool(s, 'cementerioAlExilio', { jugador: j })

  it('DS-030 Grito del Primogénito (Vínculo): roto (boca arriba) de A, el Olvido alcanza al RIVAL (B), no a A', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    expect(olvidoPara(s, 'B')).toBe(true)
    expect(olvidoPara(s, 'A')).toBe(false)
  })
  it('DS-030 boca abajo (vivo) no tiene efectos vigentes: sin Olvido', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, false)
    expect(olvidoPara(s, 'B')).toBe(false)
  })
  it('un Campeón de B destruido por el Olvido va al EXILIO, no al Cementerio', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.exilio).toContain('b1')
    expect(s.players.B.cementerio).not.toContain('b1')
    expect(s.players.B.campo.campeones[0]).toBeNull()
  })
  it('lo propio de A no se exilia: su Campeón destruido va al Cementerio', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    destruirCarta(s, crearCtx(), 'a1', 'efecto')
    expect(s.players.A.cementerio).toContain('a1')
    expect(s.players.A.exilio).not.toContain('a1')
  })
  it('una Mística y una carta descartada del rival también se exilian («todo lo que cae»)', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    conMistica(s, 'B', 'mb', PR.RAYO, 0)
    s.players.B.campo.misticasTacticas[0] = null // ya salió del campo (resolvió)
    enviarAlCementerio(s, crearCtx(), 'mb', 'campo')
    conMano(s, 'B', 'mano1', PR.PEON)
    s.players.B.mano = s.players.B.mano.filter((x) => x !== 'mano1')
    enviarAlCementerio(s, crearCtx(), 'mano1', 'mano')
    expect(s.players.B.exilio).toEqual(expect.arrayContaining(['mb', 'mano1']))
    expect(s.players.B.cementerio).toEqual([])
  })
  it('descartar al Ocaso (límite de mano) con Olvido activo exilia lo descartado', () => {
    const s = escena(); s.fase = 'ocaso'; conVinculo(s, 'B', 'grito', 'DS-030', 0, true) // el Olvido de B alcanza a A (turno de A)
    for (let i = 0; i < 8; i++) conMano(s, 'A', `m${i}`, PR.PEON)
    const e = aplicar(s, { type: 'descartar_carta', cardInstanceIds: ['m0', 'm1'] }, crearCtx())
    expect(e.players.A.exilio).toEqual(['m0', 'm1'])
    expect(e.players.A.cementerio).toEqual([])
  })
  it('un Inexiliable cae al Cementerio normal (el Olvido no lo exilia)', () => {
    const s = escena(); conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    s.instances.b1.keywordsTemporales = ['Inexiliable']
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.cementerio).toContain('b1')
    expect(s.players.B.exilio).not.toContain('b1')
  })
  it('NO se dispara «al ser enviado al Cementerio» (Titania) ni el Reino Perdido (FB-023) con el Olvido activo', () => {
    // Reino Perdido (Arcana de B, boca arriba): cuando un Campeón suyo va al Cementerio, bloquea 2 Éter y lo devuelve a la mano
    const control = escena(); conArcana(control, 'B', 'reino', 'FB-023', 0, { bocaArriba: true }); conEteres(control, 'B', 3)
    destruirCarta(control, crearCtx(), 'b1', 'efecto')
    expect(control.players.B.mano).toContain('b1') // control: sin Olvido, el Reino lo recupera
    const s = escena(); conArcana(s, 'B', 'reino', 'FB-023', 0, { bocaArriba: true }); conEteres(s, 'B', 3)
    conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.exilio).toContain('b1')
    expect(s.players.B.mano).not.toContain('b1')
    expect(s.instances.reino.eterBloqueado).toBeUndefined() // el Reino no cobró nada
  })
  it('«Al ser enviada al Cementerio» (PR-017 Última Voluntad, como Titania): con el Olvido NO se dispara; sin él, sí', () => {
    const armar = (conOlvido: boolean) => {
      const s = escena(); s.players.B.campo.campeones[0] = null
      conCampeon(s, 'B', 'uv', PR.ULTIMA_VOLUNTAD, 0); enCementerio(s, 'B', 'vieja', PR.PEON)
      if (conOlvido) conVinculo(s, 'A', 'grito', 'DS-030', 0, true)
      destruirCarta(s, crearCtx(), 'uv', 'efecto')
      return s
    }
    const control = armar(false)
    expect(control.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', trigger: 'al-ser-enviado-al-cementerio' }) // control: elige a «vieja»
    const s = armar(true)
    expect(s.players.B.exilio).toContain('uv')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.players.B.cementerio).toEqual(['vieja'])
  })
})

describe('N1 · DS-022 Maldición del Sur (Mística Presteza, «durante este turno»)', () => {
  function jugarMaldicion(): { s: GameState; ctx: Ctx } {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'a1', PR.PEON, 0); conCampeon(s, 'B', 'b1', PR.PEON, 0); conCampeon(s, 'B', 'b2', PR.PEON, 1)
    conMano(s, 'A', 'maldicion', 'DS-022'); const pago = conEteres(s, 'A', 2)
    const ctx = crearCtx()
    let e = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'maldicion', slot: 0, eterIds: pago }, ctx)
    for (let i = 0; i < 6 && e.cadena; i++) e = aplicar(e, { type: 'pasar_prioridad' }, ctx)
    return { s: e, ctx }
  }
  it('mientras dura el turno, lo que cae del rival (B) se exilia; lo de A no', () => {
    const { s } = jugarMaldicion()
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(true)
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'A' })).toBe(false)
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.exilio).toContain('b1')
  })
  it('la propia Maldición (Mística resuelta de A) va al Cementerio de A, no al Exilio', () => {
    const { s } = jugarMaldicion()
    expect(s.players.A.cementerio).toContain('maldicion')
    expect(s.players.A.exilio).not.toContain('maldicion')
  })
  it('dura solo ESTE turno: tras pasar de turno la regla ya no está y lo que cae va al Cementerio', () => {
    const { s: s0, ctx } = jugarMaldicion()
    const s = pasarTurnoCompleto(s0, ctx)
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(false)
    destruirCarta(s, crearCtx(), 'b2', 'efecto')
    expect(s.players.B.cementerio).toContain('b2')
  })
})

describe('N1 · Ragnar (DS-010): Olvido mientras tenga Éter bloqueado', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 0); conCampeon(s, 'B', 'b1', PR.PEON, 0)
    conEteres(s, 'A', 4)
    return s
  }
  const bloquear = (s: GameState) => aplicar(s, { type: 'bloquear_eter', eterIds: ['eter-A-0', 'eter-A-1', 'eter-A-2'], targetInstanceId: 'ragnar', efectoIdx: 1 }, crearCtx())
  it('sin bloquear su Éter no hay Olvido', () => {
    const s = escena()
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(false)
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.cementerio).toContain('b1')
  })
  it('con 3 Éter bloqueados el Campeón del rival destruido va al Exilio', () => {
    const s = bloquear(escena())
    expect(s.instances.ragnar.eterBloqueado).toHaveLength(3)
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(true)
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'A' })).toBe(false)
    destruirCarta(s, crearCtx(), 'b1', 'efecto')
    expect(s.players.B.exilio).toContain('b1')
  })
  it('al reagrupar su Éter en el Alba propia el Olvido se apaga', () => {
    let s = bloquear(escena())
    const ctx = crearCtx()
    s = pasarTurnoCompleto(s, ctx) // Alba de B
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(true) // el Éter sigue bloqueado durante el turno rival
    s = pasarTurnoCompleto(s, ctx) // Alba de A: reagrupa todo
    expect(s.instances.ragnar.eterBloqueado ?? []).toHaveLength(0)
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(false)
  })
  it('si Ragnar sale del campo, el Olvido se apaga', () => {
    const s = bloquear(escena())
    s.players.A.campo.campeones[0] = null
    expect(reglaBool(s, 'cementerioAlExilio', { jugador: 'B' })).toBe(false)
  })
})

/* ═══════════════════════════ FB-028 (Estásis): Alba del rival ═══════════════════════════ */

describe('FB-028 «Cristal de la Última Casa» — «Al inicio de la Alba del RIVAL»', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conVinculosVivos(s)
    conVinculo(s, 'A', 'cristal', 'FB-028', 0, true)
    conCampeon(s, 'A', 'a1', PR.PEON, 0)
    return s
  }
  it('dispara en el Alba del RIVAL: A elige a su Campeón y gana Inmortal', () => {
    const ctx = crearCtx()
    let s = pasarTurnoCompleto(escena(), ctx) // Alba de B
    expect(s.turno).toBe('B')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'cristal' })
    s = elegir(s, ctx, 'a1')
    expect(keywordsDe(s, 'a1')).toContain('Inmortal')
  })
  it('NO dispara en el Alba PROPIA (la de A)', () => {
    const ctx = crearCtx()
    const s0 = escena(); s0.turno = 'B'
    const s = pasarTurnoCompleto(s0, ctx) // Alba de A
    expect(s.turno).toBe('A')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(keywordsDe(s, 'a1')).not.toContain('Inmortal')
  })
})

/* ═══════════════════════════ Resto de cartas de Disonancia (motor existente) ═══════════════════════════ */

/** Pasa prioridad hasta cerrar la ventana de respuesta (nadie responde). */
function cerrarVentana(s: GameState, ctx: Ctx): GameState {
  let e = s
  for (let i = 0; i < 8 && e.cadena; i++) e = aplicar(e, { type: 'pasar_prioridad' }, ctx)
  return e
}

describe('DS-004 / DS-026: el rival descarta 1 carta AL AZAR', () => {
  it('DS-004: según la semilla se descarta una u otra carta de la mano (no siempre la primera)', () => {
    const descartadas = new Set<string>()
    for (let seed = 1; seed <= 24; seed++) {
      const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
      const [eter] = conEteres(s, 'A', 1, 'DS-004'); conMano(s, 'B', 'm1', PR.PEON); conMano(s, 'B', 'm2', PR.PEON)
      aplicarPago(s, crearCtx(seed), 'A', [eter], PR.PEON, { tipo: 'jugar' })
      expect(s.players.B.mano).toHaveLength(1)
      descartadas.add(s.players.B.cementerio[0])
    }
    expect([...descartadas].sort()).toEqual(['m1', 'm2'])
  })
  it('DS-026 Deuda de Caos (Vínculo roto): en el Alba de A el rival descarta 1 carta al azar', () => {
    const s = escenaVacia('forja'); s.turno = 'B'; conMazo(s, 'A', 4); conMazo(s, 'B', 4); conVinculosVivos(s)
    conVinculo(s, 'A', 'deuda', 'DS-026', 0, true); conMano(s, 'B', 'm1', PR.PEON); conMano(s, 'B', 'm2', PR.PEON)
    const e = pasarTurnoCompleto(s) // Alba de A
    expect(e.turno).toBe('A')
    expect(e.players.B.mano).toHaveLength(1)
    expect(e.players.B.cementerio).toHaveLength(1)
  })
})

describe('DS-013 Varek: destruye solo a un Campeón rival AGOTADO', () => {
  const activarVarek = (s: GameState) => {
    const ctx = crearCtx()
    return cerrarVentana(aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'varek', eterIds: ['eter-A-0', 'eter-A-1', 'eter-A-2', 'eter-A-3'] }, ctx), ctx)
  }
  it('con un agotado y un enderezado, mata al agotado; el enderezado vive', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'varek', 'DS-013', 0); conEteres(s, 'A', 4)
    conCampeon(s, 'B', 'cansado', PR.PEON, 0, { agotado: true }); conCampeon(s, 'B', 'fresco', PR.PEON, 1)
    const e = activarVarek(s)
    expect(e.players.B.cementerio).toContain('cansado')
    expect(e.players.B.campo.campeones).toContain('fresco')
  })
  it('sin ningún agotado no hay a quién destruir: nadie muere', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'varek', 'DS-013', 0); conEteres(s, 'A', 4); conCampeon(s, 'B', 'fresco', PR.PEON, 1)
    const e = activarVarek(s)
    expect(e.players.B.campo.campeones).toContain('fresco')
    expect(e.players.B.cementerio).toEqual([])
  })
})

describe('DS-015 Marek: al invocarlo, exilia 1 Campeón del Cementerio del rival', () => {
  it('el Campeón del Cementerio rival que elige A va al Exilio de B', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conMano(s, 'A', 'marek', 'DS-015'); const pago = conEteres(s, 'A', 3)
    enCementerio(s, 'B', 'muerto1', PR.PEON); enCementerio(s, 'B', 'muerto2', PR.PEON)
    const ctx = crearCtx()
    let e = aplicar(s, { type: 'jugar_campeon', cardInstanceId: 'marek', slot: 0, eterIds: pago, sacrificios: [] }, ctx)
    e = cerrarVentana(e, ctx)
    expect(e.objetivosPendientes?.[0].opciones).toEqual(expect.arrayContaining(['muerto1', 'muerto2']))
    e = elegir(e, ctx, 'muerto2')
    expect(e.players.B.exilio).toContain('muerto2')
    expect(e.players.B.cementerio).toEqual(['muerto1'])
  })
})

describe('DS-018 Skarn: destruye una Mística o Arcana del rival (incluida una Arcana BOCA ABAJO)', () => {
  it('las opciones incluyen la Mística y la Arcana boca abajo; destruir la Arcana boca abajo la manda al Cementerio', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'skarn', 'DS-018', 0); conEteres(s, 'A', 2)
    conMistica(s, 'B', 'mist', PR.RAYO, 0); conArcana(s, 'B', 'arc', PR.PACTO, 0) // boca abajo por defecto
    expect(s.instances.arc.bocaArriba).toBe(false)
    const ctx = crearCtx()
    let e = cerrarVentana(aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'skarn', eterIds: ['eter-A-0', 'eter-A-1'] }, ctx), ctx)
    expect(e.objetivosPendientes?.[0].opciones).toEqual(expect.arrayContaining(['mist', 'arc']))
    e = elegir(e, ctx, 'arc')
    expect(e.players.B.cementerio).toContain('arc')
    expect(e.players.B.campo.arcanasCombate).not.toContain('arc')
  })
})

describe('DS-002 Éter del Nudo: el Campeón de MAYOR ATQ del rival pierde 1 (seleccionar poder mayor)', () => {
  it('solo el de mayor ATQ; si cambia quién es el mayor, cambia el afectado', () => {
    const s = escenaVacia('forja')
    conEteres(s, 'A', 1, 'DS-002')
    conCampeon(s, 'B', 'grande', PR.COSECHADORA, 0); conCampeon(s, 'B', 'chico', PR.PEON, 1)
    const g = getCardMeta(PR.COSECHADORA)!.stats.poder!, c = getCardMeta(PR.PEON)!.stats.poder!
    expect(g).toBeGreaterThan(c)
    expect(statsDe(s, 'grande').poder).toBe(g - 1)
    expect(statsDe(s, 'chico').poder).toBe(c)
    s.players.B.campo.campeones[0] = null // el grande se va: ahora el mayor es el chico
    expect(statsDe(s, 'chico').poder).toBe(c - 1)
  })
})

describe('DS-033 Embestida del Sur: este turno puedes romper un 2.º Vínculo y seguir atacando tras la 1.ª Ruptura', () => {
  it('rupturasPorTurno +1 y atacarTrasRuptura permitida durante el turno; se van al Ocaso', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4); conVinculosVivos(s)
    conMano(s, 'A', 'emb', 'DS-033'); const pago = conEteres(s, 'A', 3)
    const antes = reglaNumero(s, 'rupturasPorTurno', { jugador: 'A' })
    expect(reglaBool(s, 'atacarTrasRuptura', { jugador: 'A' })).toBe(false)
    const ctx = crearCtx()
    const e = cerrarVentana(aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'emb', slot: 0, eterIds: pago }, ctx), ctx)
    expect(reglaNumero(e, 'rupturasPorTurno', { jugador: 'A' })).toBe(antes + 1)
    expect(reglaBool(e, 'atacarTrasRuptura', { jugador: 'A' })).toBe(true)
    expect(reglaNumero(e, 'rupturasPorTurno', { jugador: 'B' })).toBe(antes) // solo el lanzador
    const sig = pasarTurnoCompleto(e, ctx)
    expect(reglaNumero(sig, 'rupturasPorTurno', { jugador: 'A' })).toBe(antes)
    expect(reglaBool(sig, 'atacarTrasRuptura', { jugador: 'A' })).toBe(false)
  })
})

describe('DS-023 El Nudo / DS-032 El Nudo Olvida: condiciones sobre el RIVAL', () => {
  /** A coloca la Arcana boca abajo; al empezar su Choque (pasar de Forja a Choque) se fija el candado de la condición. */
  function conArcanaEnChoque(cardId: string, preparar: (s: GameState) => void): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4); conVinculosVivos(s)
    conArcana(s, 'A', 'arc', cardId, 0); conEteres(s, 'A', 3)
    preparar(s)
    return pasar(s, crearCtx()) // Forja → Choque de A
  }
  const activable = (s: GameState) => getValidActions(s, 'A').some((a) => a.type === 'activar_arcana' && a.cardInstanceId === 'arc')
  const pagadosRival = (s: GameState, n: number) => { const ids = conEteres(s, 'B', n); s.players.B.eterReserva = []; s.players.B.eterPagado.push(...ids) }

  it('DS-023: con 4+ Éter PAGADOS del rival (su deuda) se puede activar; con 3 no', () => {
    expect(activable(conArcanaEnChoque('DS-023', (s) => pagadosRival(s, 4)))).toBe(true)
    expect(activable(conArcanaEnChoque('DS-023', (s) => pagadosRival(s, 3)))).toBe(false)
  })
  it('DS-023 activada: −3 RES permanente al Campeón rival y el rival descarta 1 carta al azar', () => {
    const s0 = conArcanaEnChoque('DS-023', (s) => { pagadosRival(s, 4); conCampeon(s, 'B', 'b1', PR.GUARDIAN, 0); conMano(s, 'B', 'm1', PR.PEON); conMano(s, 'B', 'm2', PR.PEON) })
    const ctx = crearCtx()
    const accion = getValidActions(s0, 'A').find((a) => a.type === 'activar_arcana')!
    let e = cerrarVentana(aplicar(s0, accion, ctx), ctx)
    for (let i = 0; i < 3 && e.objetivosPendientes?.length; i++) e = cerrarVentana(elegir(e, ctx, e.objetivosPendientes[0].opciones[0]), ctx)
    expect(statsDe(e, 'b1').resistencia).toBe(getCardMeta(PR.GUARDIAN)!.stats.resistencia! - 3)
    expect(e.players.B.mano).toHaveLength(1)
  })
  it('DS-032: con la mano del rival en 3 o menos se puede activar; con 4 no', () => {
    const mano = (n: number) => (s: GameState) => { for (let i = 0; i < n; i++) conMano(s, 'B', `h${i}`, PR.PEON) }
    expect(activable(conArcanaEnChoque('DS-032', mano(3)))).toBe(true)
    expect(activable(conArcanaEnChoque('DS-032', mano(4)))).toBe(false)
  })
  it('DS-032 activada: exilia cartas del Cementerio del rival (hasta 2)', () => {
    const s0 = conArcanaEnChoque('DS-032', (s) => { enCementerio(s, 'B', 'x1', PR.PEON); enCementerio(s, 'B', 'x2', PR.PEON); enCementerio(s, 'B', 'x3', PR.PEON) })
    const ctx = crearCtx()
    const accion = getValidActions(s0, 'A').find((a) => a.type === 'activar_arcana')!
    let e = cerrarVentana(aplicar(s0, accion, ctx), ctx)
    for (let i = 0; i < 3 && e.objetivosPendientes?.length; i++) e = cerrarVentana(elegir(e, ctx, e.objetivosPendientes[0].opciones[0]), ctx)
    expect(e.players.B.exilio.length).toBeGreaterThanOrEqual(1)
    expect(e.players.B.exilio.length).toBeLessThanOrEqual(2)
  })
})

describe('coverageMap — sin huecos con las cartas de Disonancia', () => {
  it('todos los efectos del seed tienen ejecutor', () => {
    const cartas = JSON.parse(readFileSync(resolve(__dirname, '../../../../seed/FuenteEfectos.json'), 'utf8')) as AnyCard[]
    const reporte = buildReporte(cartas.filter((c) => c.paqueteId === 'disonancia'))
    expect(reporte.totalEfectos).toBeGreaterThan(30)
    expect(reporte.items.filter((i) => i.estado.startsWith('HUECO')).map((i) => `${i.cardId} ${i.tipo}/${i.trigger}/${i.efecto}: ${i.estado}`)).toEqual([])
  })
})
