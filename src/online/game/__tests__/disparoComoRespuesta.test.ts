// @vitest-environment node
/**
 * El Disparo de un Campeón como RESPUESTA en una cadena (manual §9.6). Antes era un no-op: responder no cobraba,
 * no agotaba, no elegía objetivo y el efecto nunca ocurría. Ahora paga igual que activar_habilidad (Reserva → 1A y agota,
 * o bloquea Éter), elige su objetivo AL RESPONDER y su efecto resuelve en la pila, ANTES que la jugada que abrió la cadena.
 * Cartas SINTÉTICAS sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { disparoDeRespuesta, motivoNoResponde, validarResponderCadena } from '../chain'
import { aplicarReglaTemporal } from '../reglasTemporales'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { Ctx, GameState } from '../types'
import { PR, aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, conMistica, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const OBJ_MISTICA_RIVAL = { tipo: 'mistica', controlador: 'rival', zona: 'campo' }
const campeon = (id: string, keywords: string[], efectos: unknown[]): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords, facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    // Disparo «Paga y Agota»: paga 1 Éter y destruye una Mística rival
    campeon('T-DISP', [], [{ tipo: 'disparo', efecto: 'destroy', objetivo: OBJ_MISTICA_RIVAL, costo: { tipo: 'eter', cantidad: 1 } }]),
    // Igual, pero TIRADOR: su Disparo no agota (regla disparoAgota prohibida)
    campeon('T-DISP-TIR', ['Tirador'], [{ tipo: 'disparo', efecto: 'destroy', objetivo: OBJ_MISTICA_RIVAL, costo: { tipo: 'eter', cantidad: 1 } }]),
    // Disparo «Bloqueado»: bloquea 1 Éter (no agota, 1/turno)
    campeon('T-DISP-BLQ', [], [{ tipo: 'disparo', efecto: 'destroy', objetivo: OBJ_MISTICA_RIVAL, costo: { tipo: 'eter_bloqueado', cantidad: 1 } }]),
  ])
})

const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)

/**
 * A juega Rayo (opener) contra el Peón `b0` de B; B tiene `rc` (el Campeón que responderá, con `reservaB` Éteres) y A una
 * Mística `m` en el campo (el objetivo del Disparo). Devuelve el estado con la cadena abierta y la prioridad de B.
 */
function cadenaAbierta(cardIdRc: string, reservaB = 2): { s: GameState; ctx: Ctx } {
  const s0 = escenaVacia('forja'); conMazo(s0, 'A'); conMazo(s0, 'B')
  conCampeon(s0, 'B', 'rc', cardIdRc, 0); conCampeon(s0, 'B', 'b0', PR.PEON, 1)
  if (reservaB > 0) conEteres(s0, 'B', reservaB)
  conMistica(s0, 'A', 'm', PR.AVISO, 0, { entradaEsteTurno: true })
  conMano(s0, 'A', 'op', PR.RAYO); conEteres(s0, 'A', 3)
  const ctx = crearCtx()
  const jugar = getValidActions(s0, 'A').find((a) => a.type === 'jugar_mistica')!
  let s = aplicar(s0, jugar, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // el Rayo apunta al Peón
  if (reservaB > 0) expect(s.cadena?.prioridad).toBe('B') // sin Éter B no puede responder: la ventana ni se abre
  return { s, ctx }
}
const respuestaDe = (s: GameState) => getValidActions(s, 'B').find((a) => a.type === 'responder_cadena' && a.cardInstanceId === 'rc')

describe('el Disparo de un Campeón como respuesta', () => {
  it('responder PAGA el coste (Reserva → 1A) y AGOTA al Campeón', () => {
    const { s: s0, ctx } = cadenaAbierta('T-DISP')
    const antes = s0.players.B.eterReserva.length
    const s = aplicar(s0, respuestaDe(s0)!, ctx)
    expect(s.players.B.eterPagado).toHaveLength(1)
    expect(s.players.B.eterReserva).toHaveLength(antes - 1)
    expect(s.instances.rc.agotado).toBe(true)
  })
  it('elige su objetivo AL RESPONDER, y el efecto resuelve en la pila ANTES que el opener', () => {
    const { s: s0, ctx } = cadenaAbierta('T-DISP')
    let s = aplicar(s0, respuestaDe(s0)!, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'rc', opciones: expect.arrayContaining(['m']) })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'm' }, ctx)
    expect(s.cadena?.pila).toEqual(['rc'])
    s = cerrar(s, ctx)
    expect(s.players.A.cementerio).toContain('m') // el Disparo destruyó la Mística de A...
    expect(s.players.B.cementerio).toContain('b0') // ...y después resolvió el Rayo de A contra el Peón
  })
  it('un Campeón con TIRADOR no se agota al responder (regla disparoAgota)', () => {
    const { s: s0, ctx } = cadenaAbierta('T-DISP-TIR')
    const s = aplicar(s0, respuestaDe(s0)!, ctx)
    expect(s.players.B.eterPagado).toHaveLength(1)
    expect(s.instances.rc.agotado).toBeUndefined()
  })
  it('Disparo «Bloqueado»: bloquea el Éter, no agota y solo se usa 1 vez por turno', () => {
    const { s: s0, ctx } = cadenaAbierta('T-DISP-BLQ')
    const s = aplicar(s0, respuestaDe(s0)!, ctx)
    expect(s.instances.rc.eterBloqueado).toHaveLength(1)
    expect(s.instances.rc.agotado).toBeUndefined()
    expect(motivoNoResponde(s, 'B', 'rc', 'campo')).toMatch(/ya usaste/)
  })
  it('sin Éter para pagar NO es una respuesta: no se ofrece', () => {
    const { s } = cadenaAbierta('T-DISP', 0)
    expect(s.cadena).toBeUndefined() // nadie puede responder: el Rayo resolvió sin abrir ventana
    expect(motivoNoResponde(s, 'B', 'rc', 'campo')).toMatch(/pagar/)
  })
  it('getValidActions ofrece la respuesta ya con los Éteres que la pagan', () => {
    const { s } = cadenaAbierta('T-DISP')
    expect(respuestaDe(s)).toMatchObject({ type: 'responder_cadena', cardInstanceId: 'rc', eterIds: expect.any(Array) })
    expect((respuestaDe(s) as { eterIds: string[] }).eterIds).toHaveLength(1)
  })
  it('validarResponderCadena rechaza un pago que no es el justo', () => {
    const { s } = cadenaAbierta('T-DISP')
    expect(validarResponderCadena(s, 'rc', [])).toMatch(/exactamente 1/)
    expect(validarResponderCadena(s, 'rc', ['nope'])).toMatch(/zona de pago/)
    expect(validarResponderCadena(s, 'rc', [s.players.B.eterReserva[0]])).toBeNull()
  })
  it('si sus efectos quedan negados antes de resolver, el efecto se pierde (el coste ya está pagado)', () => {
    const { s: s0, ctx } = cadenaAbierta('T-DISP')
    let s = aplicar(s0, respuestaDe(s0)!, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'm' }, ctx)
    aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio: 'A', expira: 'ocaso', sujeto: { tipo: 'carta', instId: 'rc' } })
    s = cerrar(s, ctx)
    expect(s.players.A.cementerio).not.toContain('m')
    expect(s.players.B.eterPagado).toHaveLength(1)
  })
  it('disparoDeRespuesta elige el Disparo sin trigger y deja fuera al de al_resolver_cadena', () => {
    const conTrigger = campeon('x1', [], [{ tipo: 'disparo', efecto: 'destroy', trigger: 'al_resolver_cadena', objetivo: OBJ_MISTICA_RIVAL }])
    const ninguno = campeon('x2', [], [{ tipo: 'disparo', efecto: 'destroy', trigger: 'ninguno', objetivo: OBJ_MISTICA_RIVAL }])
    expect(disparoDeRespuesta(conTrigger)).toBeNull()
    expect(disparoDeRespuesta(ninguno)?.efectoIdx).toBe(0)
  })
})
