// @vitest-environment node
/**
 * Indulto (PU-024: «1 Campeón que controles gana Inmortal, hasta el final del turno») tiene PRESTEZA para poder jugarse como
 * RESPUESTA. Sin ella era una carta casi muerta: Inmortal solo evita la destrucción por EFECTO (replacements.ts, destruirCarta; en
 * combate salva Indestructible) y, jugada «a seco» en la propia Forja, expira antes de que el rival destruya nada. Desde la mano solo
 * se juega como respuesta una Mística con PRESTEZA o FUGAZ (chain.ts, motivoNoResponde).
 *
 * Escenario: A juega Rayo (destruye un Campeón RES ≤ 3) contra el Peón de B; B tiene Indulto + Éter y la prioridad de la cadena.
 *   - B puede responder con Indulto (por la Presteza) y eso salva al Peón: la búsqueda debe valorarlo por encima de no responder.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getValidActions } from '../online/game'
import type { Action, GameState } from '../online/game'
import { aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia, PR } from '../online/game/__tests__/helpers/cartasPrueba'
import { CONFIG, CONFIG_CONTINUO, valorDe } from './busqueda'
import type { Config } from './busqueda'

const INDULTO = 'PU-024'

beforeAll(() => {
  cargarCartasPrueba()
})

function cadenaConRayo(): GameState {
  const s0 = escenaVacia('forja')
  conMazo(s0, 'A'); conMazo(s0, 'B')
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conEteres(s0, 'B', 3)
  conMano(s0, 'B', 'indulto', INDULTO)
  conMano(s0, 'A', 'rayo', PR.RAYO)
  conEteres(s0, 'A', 3)
  const ctx = crearCtx()
  const jugar = getValidActions(s0, 'A').find((a) => a.type === 'jugar_mistica')!
  let s = aplicar(s0, jugar, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // el Rayo apunta al Peón de B
  return s
}

function valores(cfg: Config) {
  const s = cadenaConRayo()
  expect(s.cadena?.prioridad, 'B debe tener la prioridad de la cadena').toBe('B')
  const acciones = getValidActions(s, 'B')
  const responder = acciones.find((a): a is Extract<Action, { type: 'jugar_respuesta' }> => a.type === 'jugar_respuesta' && a.cardInstanceId === 'indulto')
  const pasar = acciones.find((a) => a.type === 'pasar_prioridad')
  expect(responder, 'Indulto debe poder jugarse como respuesta al Rayo (tiene Presteza)').toBeDefined()
  expect(pasar).toBeDefined()
  return { responder: valorDe(s, responder!, 'B', cfg, acciones.length), pasar: valorDe(s, pasar!, 'B', cfg, acciones.length) }
}

describe('Indulto como respuesta a una destrucción por efecto', () => {
  it('con la búsqueda de siempre, responder con Indulto vale más que dejar morir al Peón', () => {
    const v = valores({ ...CONFIG })
    expect(v.responder).toBeGreaterThan(v.pasar)
  })

  it('con continuarTurno también', () => {
    const v = valores(CONFIG_CONTINUO)
    expect(v.responder).toBeGreaterThan(v.pasar)
  })
})
