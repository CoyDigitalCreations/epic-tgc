// @vitest-environment node
/**
 * Negar los efectos de un Campeón CANCELA el estado que sus efectos continuos ya habían dejado en curso (decisión del
 * usuario, 2026-10-27: «las apaga, las cancela», no se reanudan al terminar el turno):
 *  - un robo continuo (`mientras_ester_bloqueado`) devuelve el Campeón a su dueño;
 *  - el agotamiento fijado por un tramo (`fix_exhaust`) se suelta;
 *  - un robo PERMANENTE (sin duración) es un hecho consumado y no se toca;
 *  - un umbral de Éter alcanzado mientras está negado se PIERDE.
 * Cartas SINTÉTICAS.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { dispararUmbralBloqueo, exhaustFijado, interpretEffect } from '../effectInterpreter'
import { efectosNegados } from '../reglas'
import { aplicarReglaTemporal, purgarReglasTemporales } from '../reglasTemporales'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { cargarCartasPrueba, conCampeon, crearCtx, escenaVacia, inst } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, efectos: unknown[] = []): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos }) as never
const RIVAL = { tipo: 'campeon', controlador: 'rival', zona: 'campo' }
const NEGAR: EfectoData = { tipo: 'disparo', efecto: 'negar', tipoNegacion: 'efecto_activo', duracion: 'turno', objetivo: RIVAL as never }

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    campeon('T-THANE', [NEGAR]),
    campeon('T-PLANO'),
    campeon('T-ROBO-CONT', [{ tipo: 'continuo', efecto: 'steal_champion', duracion: 'mientras_ester_bloqueado', costo: { tipo: 'eter_bloqueado', cantidad: 2 }, objetivo: RIVAL }]),
    campeon('T-ROBO-PERM', [{ tipo: 'disparo', efecto: 'steal_champion', objetivo: RIVAL, costo: { tipo: 'eter', cantidad: 1 } }]),
    campeon('T-FIX', [{ tipo: 'continuo', costo: { tipo: 'eter_bloqueado', cantidad: 4, umbral: 2 }, objetivo: RIVAL, tramos: [{ umbral: 2, efecto: 'fix_exhaust', duracion: 'mientras_ester_bloqueado' }] }]),
    campeon('T-UMBRAL', [{ tipo: 'continuo', costo: { tipo: 'eter_bloqueado', cantidad: 1, umbral: 1 }, objetivo: RIVAL, tramos: [{ umbral: 1, efecto: 'toggle_exhaust' }] }]),
  ])
})

/** B niega los efectos de la carta `objetivoId` de A (el objetivo de Thane, que es de B). */
function negarConThane(s: GameState, objetivoId: string) {
  inst(s, 'thane', 'T-THANE', 'B')
  interpretEffect(s, crearCtx(), s.instances.thane, NEGAR, { jugador: 'B', contextoUso: 'objetivo-elegido', objetivoId })
}
const bloqueado = (s: GameState, id: string, n: number) => {
  const ids = Array.from({ length: n }, (_, i) => `eb-${id}-${i}`)
  for (const e of ids) inst(s, e, 'T-PLANO', 'A')
  s.instances[id].eterBloqueado = ids
}

describe('robo continuo en curso', () => {
  function escena(cardId: string): GameState {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'ladron', cardId, 0)
    // el Campeón de B que A robó: sigue siendo de B, vive en el campo de A y lo marca stolenBy
    conCampeon(s, 'A', 'robado', 'T-PLANO', 1, { owner: 'B', stolenBy: 'ladron' })
    return s
  }
  it('negarlo devuelve el Campeón robado a su dueño', () => {
    const s = escena('T-ROBO-CONT'); bloqueado(s, 'ladron', 2)
    negarConThane(s, 'ladron')
    expect(s.players.B.campo.campeones).toContain('robado')
    expect(s.players.A.campo.campeones).not.toContain('robado')
    expect(s.instances.robado.stolenBy).toBeUndefined()
  })
  it('NO se reanuda al terminar la negación (se canceló, no se suspendió)', () => {
    const s = escena('T-ROBO-CONT'); bloqueado(s, 'ladron', 2)
    negarConThane(s, 'ladron')
    purgarReglasTemporales(s, 'ocaso')
    expect(efectosNegados(s, 'ladron')).toBe(false)
    expect(s.players.B.campo.campeones).toContain('robado')
  })
  it('un robo PERMANENTE (sin duración) ya es un hecho consumado: negar no lo deshace', () => {
    const s = escena('T-ROBO-PERM')
    negarConThane(s, 'ladron')
    expect(s.players.A.campo.campeones).toContain('robado')
  })
})

describe('agotamiento fijado por un tramo (fix_exhaust)', () => {
  function escena(): GameState {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'cass', 'T-FIX', 0); conCampeon(s, 'B', 'x', 'T-PLANO', 0, { agotado: true })
    bloqueado(s, 'cass', 2)
    s.instances.cass.fijadoExhaustTargetId = 'x'
    return s
  }
  it('antes de negarla el agotamiento está fijado', () => {
    expect(exhaustFijado(escena(), 'x')).toBe(true)
  })
  it('negarla suelta el agotamiento, y no vuelve al terminar la negación', () => {
    const s = escena()
    negarConThane(s, 'cass')
    expect(s.instances.cass.fijadoExhaustTargetId).toBeUndefined()
    expect(exhaustFijado(s, 'x')).toBe(false)
    purgarReglasTemporales(s, 'ocaso')
    expect(exhaustFijado(s, 'x')).toBe(false)
  })
})

describe('umbral de Éter alcanzado mientras está negado', () => {
  function escena(): GameState {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'u', 'T-UMBRAL', 0); conCampeon(s, 'B', 'x', 'T-PLANO', 0)
    bloqueado(s, 'u', 1)
    return s
  }
  it('control: sin negación el umbral arma su elección', () => {
    const s = escena()
    dispararUmbralBloqueo(s, crearCtx(), 'u')
    expect(s.objetivosPendientes ?? []).toHaveLength(1)
  })
  it('negado: el umbral se pierde (no arma nada)', () => {
    const s = escena()
    aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio: 'B', expira: 'ocaso', sujeto: { tipo: 'carta', instId: 'u' } })
    dispararUmbralBloqueo(s, crearCtx(), 'u')
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(s.instances.u.tramosDisparados).toBeUndefined() // no quedó marcado como disparado
  })
})
