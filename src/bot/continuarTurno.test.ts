// @vitest-environment node
/**
 * Config.continuarTurno — la búsqueda del bot completa el turno (pasa a Choque y busca el mejor ataque) en vez de evaluar en frío.
 * Escenario: un Campeón recién invocado (cansado: no puede atacar este turno), Furia de Muda en la mano («un Campeón que controles
 * gana Carga hasta el final del turno») y un rival sin Campeones con sus 6 Vínculos intactos.
 *   - Sin la opción, jugar la Furia solo se ve como gastar Éter y una carta: pierde contra pasar.
 *   - Con la opción, se ve que la Carga le permite atacar y romper un Vínculo: gana a pasar.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getValidActions } from '../online/game'
import type { Action, GameState } from '../online/game'
import { cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, conVinculo, escenaVacia, PR } from '../online/game/__tests__/helpers/cartasPrueba'
import { CONFIG, CONFIG_CONTINUO, valorDe } from './busqueda'
import type { Config } from './busqueda'
import { BOTS, resolverBot } from './registro'

const FURIA = 'MU-025'

beforeAll(() => {
  cargarCartasPrueba()
})

function escena(): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A', 6)
  conMazo(s, 'B', 6)
  conEteres(s, 'A', 4)
  conMano(s, 'A', 'furia', FURIA)
  // Recién invocado: «invocación cansada», no puede atacar este turno
  conCampeon(s, 'A', 'nuevo', PR.PEON, 0, { entradaEsteTurno: true })
  for (let i = 0; i < 6; i++) conVinculo(s, 'B', `vinculo-${i}`, PR.VINC_PESO, i)
  return s
}

function valores(cfg: Config) {
  const s = escena()
  const acciones = getValidActions(s, 'A')
  const furia = acciones.find((a): a is Extract<Action, { type: 'jugar_mistica' }> => a.type === 'jugar_mistica' && a.cardInstanceId === 'furia')
  const pasar = acciones.find((a) => a.type === 'pasar_turno')
  expect(furia, 'la Furia debe poder jugarse en el escenario').toBeDefined()
  expect(pasar).toBeDefined()
  return { furia: valorDe(s, furia!, 'A', cfg, acciones.length), pasar: valorDe(s, pasar!, 'A', cfg, acciones.length) }
}

describe('Config.continuarTurno: el bot ve lo que un truco logra en el combate de este turno', () => {
  it('por defecto está apagada: el Difícil de siempre no cambia', () => {
    expect(CONFIG.continuarTurno).toBeFalsy()
  })

  it('SIN la opción, jugar la Furia pierde contra pasar (el beneficio es invisible)', () => {
    const v = valores({ ...CONFIG })
    expect(v.furia).toBeLessThan(v.pasar)
  })

  it('CON la opción, jugar la Furia gana a pasar: la Carga permite atacar y romper un Vínculo', () => {
    const v = valores(CONFIG_CONTINUO)
    expect(v.furia).toBeGreaterThan(v.pasar)
  })

  it('el valor de pasar no baja por completar el turno (compara alternativas en igualdad)', () => {
    const sin = valores({ ...CONFIG })
    const con = valores(CONFIG_CONTINUO)
    expect(con.pasar).toBeGreaterThanOrEqual(sin.pasar)
  })

  it('con el presupuesto agotado no se cuelga: devuelve un valor finito', () => {
    const v = valores({ ...CONFIG, continuarTurno: true, presupuesto: 1 })
    expect(Number.isFinite(v.furia)).toBe(true)
    expect(Number.isFinite(v.pasar)).toBe(true)
  })

  it('el bot «dificil-continuo» está registrado y cfg:cont=1 activa la opción', () => {
    expect(BOTS['dificil-continuo']).toBeTypeOf('function')
    expect(BOTS['dificil-continuo']).not.toBe(BOTS.dificil)
    expect(resolverBot('cfg:cont=1')).toBeTypeOf('function')
  })
})
