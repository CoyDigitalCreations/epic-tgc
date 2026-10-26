// @vitest-environment node
/**
 * Un Disparo con éter BLOQUEADO no agota al Campeón (manual §5.2, §8.3a): activar_habilidad lo permite con el Campeón
 * agotado y, desde esta fase, también como RESPUESTA a una cadena (motivoNoResponde). Uno con éter PAGADO sí agota,
 * así que un Campeón agotado no puede responder con él. Cartas SINTÉTICAS («Dummy») sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { motivoNoResponde, respondiblesDe } from '../chain'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { GameState } from '../types'
import {
  PR, cargarCartasPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
} from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
/** Campeón con un Disparo que, al resolverse la cadena, roba 1; el costo decide si agota (pagado) o no (bloqueado). */
const campeon = (id: string, costo: Record<string, unknown>): AnyCard =>
  ({
    ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 },
    efectos: [{ tipo: 'disparo', trigger: 'al_resolver_cadena', efecto: 'draw', cantidad: 1, objetivo: { tipo: 'self' }, costo }],
  }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    campeon('T-BLOQ', { tipo: 'eter_bloqueado', cantidad: 1 }),
    campeon('T-BLOQFIJO', { tipo: 'bloqueo_fijo', cantidad: 1 }),
    campeon('T-PAGADO', { tipo: 'eter', cantidad: 1 }),
  ])
})

/** A juega Rayo sobre b0 (cadena abierta); B tiene `cardId` agotado o enderezado. */
function ventana(cardId: string, agotado: boolean): GameState {
  const s0 = escenaVacia('forja'); conMazo(s0, 'A'); conMazo(s0, 'B')
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'v', cardId, 1, { agotado })
  const ctx = crearCtx()
  const s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  return aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
}

describe('Disparo con éter bloqueado como respuesta', () => {
  it.each(['T-BLOQ', 'T-BLOQFIJO'])('%s agotado SÍ puede responder (no agota)', (cardId) => {
    const s = ventana(cardId, true)
    expect(motivoNoResponde(s, 'B', 'v', 'campo')).toBeNull()
    expect(respondiblesDe(s, 'B')).toContain('v')
    expect(getValidActions(s, 'B')).toContainEqual({ type: 'responder_cadena', cardInstanceId: 'v' })
  })
  it('con éter PAGADO el Campeón agotado NO puede responder (ese Disparo agota)', () => {
    const s = ventana('T-BLOQ', false) // enderezado: abre la cadena
    s.instances.v.cardId = 'T-PAGADO'
    s.instances.v.agotado = true
    expect(motivoNoResponde(s, 'B', 'v', 'campo')).toBe('el Campeón está agotado')
    expect(respondiblesDe(s, 'B')).not.toContain('v')
  })
  it('enderezado responde con cualquiera de los dos', () => {
    for (const cardId of ['T-BLOQ', 'T-PAGADO']) {
      const s = ventana(cardId, false)
      expect(motivoNoResponde(s, 'B', 'v', 'campo')).toBeNull()
    }
  })
  it('un Campeón agotado con Disparo bloqueado ABRE la ventana (el gate lo cuenta como respondible)', () => {
    const s = ventana('T-BLOQ', true)
    expect(s.cadena).toBeTruthy()
    expect(s.cadena?.prioridad).toBe('B')
  })
})
