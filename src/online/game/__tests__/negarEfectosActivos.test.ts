// @vitest-environment node
/**
 * negar «efecto activo» (Thane): el Campeón objetivo tiene sus efectos negados hasta el final del turno. No activa
 * Disparos ni Continuos, los Continuos y auras ya vigentes se apagan, sus pasivos/triggers/reglas no hacen nada.
 * NO se niegan sus keywords (identidad de la carta) ni su efecto de Comandante (§10). INEGABLE lo evita.
 * Es la regla `efectosActivos` prohibida sobre la carta; cada punto que lee efectos la consulta (reglas.efectosNegados).
 * Cartas SINTÉTICAS sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import { keywordsDe, statsDe, triggersQueMatchean } from '../efectos'
import { efectosNegados, reglaBool, reglaNumero } from '../reglas'
import { aplicarReglaTemporal, purgarReglasTemporales } from '../reglasTemporales'
import { validarActivarHabilidad } from '../habilidades'
import { validarBloqueo } from '../payments'
import { motivoNoResponde } from '../chain'
import { getValidActions } from '../validActions'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'
import { aplicar, cargarCartasPrueba, conCampeon, conEteres, conMazo, conRespuestaDeMano, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const campeon = (id: string, extra: Record<string, unknown> = {}): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [], ...extra }) as never

const NEGAR: EfectoData = {
  tipo: 'disparo', efecto: 'negar', tipoNegacion: 'efecto_activo', duracion: 'turno',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 },
}
const BUFF_PROPIO = { tipo: 'disparo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 } }
const AURA = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }
const COMANDANTE = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: 1, RES: 1 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    campeon('T-THANE', { efectos: [NEGAR] }),
    campeon('T-VIC', { efectos: [BUFF_PROPIO] }),
    campeon('T-VIC-INEG', { keywords: ['Inegable'], efectos: [BUFF_PROPIO] }),
    campeon('T-PLANO'),
    campeon('T-AURA', { keywords: ['Carga'], efectos: [AURA] }),
    campeon('T-COM', { efectos: [], efectoComandante: COMANDANTE }),
    campeon('T-TRIG', { efectos: [{ tipo: 'pasivo', trigger: 'al_atacar', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self' } }] }),
    campeon('T-REGLA', { efectos: [{ tipo: 'pasivo', efecto: 'modificar_regla', regla: { id: 'ataquesPorTurno', operacion: 'sumar', valor: 1 }, objetivo: { tipo: 'self' } }] }),
  ])
})

function escena(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A'); conMazo(s, 'B'); return s
}
/** Como si un efecto de Thane hubiera negado a `id` hasta el final del turno. */
function negar(s: GameState, id: string, duenio: PlayerId = 'A') {
  aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio, expira: 'ocaso', sujeto: { tipo: 'carta', instId: id } })
}
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)

describe('la regla efectosActivos', () => {
  it('base: los efectos están activos; negar los apaga solo en la carta negada; acaba al final del turno', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-VIC', 0); conCampeon(s, 'A', 'y', 'T-VIC', 1)
    expect(efectosNegados(s, 'x')).toBe(false)
    negar(s, 'x')
    expect(efectosNegados(s, 'x')).toBe(true)
    expect(efectosNegados(s, 'y')).toBe(false)
    purgarReglasTemporales(s, 'ocaso')
    expect(efectosNegados(s, 'x')).toBe(false)
  })
})

describe('Thane — el efecto negar «efecto_activo»', () => {
  function thaneVsVictima(victima = 'T-VIC') {
    const s = escena()
    conCampeon(s, 'A', 'thane', 'T-THANE', 0); conCampeon(s, 'B', 'v', victima, 0)
    return s
  }
  const lanzar = (s: GameState, c: Ctx, objetivoId: string) =>
    interpretEffect(s, c, s.instances.thane, NEGAR, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId })

  it('niega los efectos del Campeón elegido y emite efectos_negados', () => {
    const s = thaneVsVictima(); const c = crearCtx()
    lanzar(s, c, 'v')
    expect(efectosNegados(s, 'v')).toBe(true)
    expect(c.events).toEqual([{ type: 'efectos_negados', jugador: 'A', cardInstanceId: 'v', fuente: 'thane' }])
  })
  it('dura hasta el final del turno (Ocaso)', () => {
    const s = thaneVsVictima(); lanzar(s, crearCtx(), 'v')
    purgarReglasTemporales(s, 'ocaso')
    expect(efectosNegados(s, 'v')).toBe(false)
  })
  it('un Campeón INEGABLE no se puede negar: no cambia nada ni se emite evento', () => {
    const s = thaneVsVictima('T-VIC-INEG'); const c = crearCtx()
    lanzar(s, c, 'v')
    expect(efectosNegados(s, 'v')).toBe(false)
    expect(c.events).toEqual([])
  })
  it('flujo real: A activa a Thane y el único Campeón rival queda negado', () => {
    const s0 = thaneVsVictima(); const eter = conEteres(s0, 'A', 1); const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'thane', eterIds: eter }, ctx)
    if (s.cadena) s = cerrar(s, ctx) // B puede responder con el Disparo de su Campeón: se abre la ventana
    expect(efectosNegados(s, 'v')).toBe(true)
  })
  it('flujo real con varios Campeones rivales: A elige a cuál niega', () => {
    const s0 = thaneVsVictima(); conCampeon(s0, 'B', 'w', 'T-VIC', 1)
    const eter = conEteres(s0, 'A', 1); const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'thane', eterIds: eter }, ctx)
    if (s.cadena) s = cerrar(s, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'w' }, ctx)
    expect(efectosNegados(s, 'w')).toBe(true)
    expect(efectosNegados(s, 'v')).toBe(false)
  })
})

describe('qué se apaga cuando los efectos están negados', () => {
  it('no puede ACTIVAR una habilidad (Disparo)', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-VIC', 0); const eter = conEteres(s, 'A', 1)
    const accion = { type: 'activar_habilidad', cardInstanceId: 'x', eterIds: eter } as const
    expect(validarActivarHabilidad(s, accion)).toBeNull()
    negar(s, 'x')
    expect(validarActivarHabilidad(s, accion)).toMatch(/negados/)
  })
  it('no puede ACTIVAR un Continuo (bloquear Éter)', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-VIC', 0); const eter = conEteres(s, 'A', 1)
    expect(validarBloqueo(s, 'A', eter, 'x') ?? '').not.toMatch(/negados/)
    negar(s, 'x')
    expect(validarBloqueo(s, 'A', eter, 'x')).toMatch(/negados/)
  })
  it('getValidActions no le ofrece activar nada (si no, el bot propondría una acción que el validador rechaza)', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-VIC', 0); conEteres(s, 'A', 2)
    const activa = (st: GameState) => getValidActions(st, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'x')
    expect(activa(s)).toBe(true)
    negar(s, 'x')
    expect(activa(s)).toBe(false)
  })
  it('no puede RESPONDER con su Disparo en una cadena', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-VIC', 0); conEteres(s, 'A', 1) // responder paga el Disparo: hay que poder pagarlo
    expect(motivoNoResponde(s, 'A', 'x', 'campo')).toBeNull()
    negar(s, 'x')
    expect(motivoNoResponde(s, 'A', 'x', 'campo')).toMatch(/negados/)
  })
  it('una habilidad YA declarada que ve negados sus efectos antes de resolver no se resuelve (el pago se mantiene)', () => {
    const s0 = escena(); s0.turno = 'B'
    conCampeon(s0, 'B', 'v', 'T-VIC', 0); const eter = conEteres(s0, 'B', 1)
    conRespuestaDeMano(s0, 'A') // A puede responder: la ventana de la activación se abre
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'v', eterIds: eter }, ctx)
    expect(s.cadena).toBeDefined()
    negar(s, 'v') // lo que haría una respuesta que lo niegue, antes de que resuelva
    s = cerrar(s, ctx)
    expect(statsDe(s, 'v').poder).toBe(2) // sin el +1 ATQ
    expect(s.players.B.eterPagado).toHaveLength(1) // el pago se queda
  })
  it('control: sin negación esa misma habilidad sí resuelve', () => {
    const s0 = escena(); s0.turno = 'B'
    conCampeon(s0, 'B', 'v', 'T-VIC', 0); const eter = conEteres(s0, 'B', 1)
    conRespuestaDeMano(s0, 'A')
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'v', eterIds: eter }, ctx)
    s = cerrar(s, ctx)
    expect(statsDe(s, 'v').poder).toBe(3)
  })
  it('sus auras dejan de aplicar a los demás', () => {
    const s = escena(); conCampeon(s, 'A', 'aura', 'T-AURA', 0); conCampeon(s, 'A', 'amigo', 'T-PLANO', 1)
    expect(statsDe(s, 'amigo').poder).toBe(3)
    negar(s, 'aura')
    expect(statsDe(s, 'amigo').poder).toBe(2)
  })
  it('sus triggers no se disparan', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-TRIG', 0)
    expect(triggersQueMatchean(s, 'al-atacar', 'A', ['x'])).toHaveLength(1)
    negar(s, 'x')
    expect(triggersQueMatchean(s, 'al-atacar', 'A', ['x'])).toEqual([])
  })
  it('las reglas que modifica con sus efectos vuelven a la base', () => {
    const s = escena(); conCampeon(s, 'A', 'x', 'T-REGLA', 0)
    expect(reglaNumero(s, 'ataquesPorTurno', { instId: 'x' })).toBe(2)
    negar(s, 'x')
    expect(reglaNumero(s, 'ataquesPorTurno', { instId: 'x' })).toBe(1)
  })
})

describe('qué NO se niega', () => {
  it('las KEYWORDS son la identidad de la carta: siguen (y siguen valiendo sus reglas)', () => {
    const s = escena(); conCampeon(s, 'A', 'aura', 'T-AURA', 0); conCampeon(s, 'A', 'ineg', 'T-VIC-INEG', 1)
    negar(s, 'aura'); negar(s, 'ineg')
    expect(keywordsDe(s, 'aura')).toContain('Carga')
    expect(reglaBool(s, 'invocacionCansada', { instId: 'aura' })).toBe(false) // Carga: sigue prohibiéndola
    expect(reglaBool(s, 'puedeSerNegada', { instId: 'ineg' })).toBe(false) // Inegable sigue
  })
  it('el efecto de COMANDANTE (§10) no se niega: el aura sigue aplicando', () => {
    const s = escena(); conCampeon(s, 'A', 'com', 'T-COM', 0); conCampeon(s, 'A', 'amigo', 'T-PLANO', 1)
    expect(statsDe(s, 'amigo').poder).toBe(3)
    negar(s, 'com')
    expect(efectosNegados(s, 'com')).toBe(true)
    expect(statsDe(s, 'amigo').poder).toBe(3)
    expect(statsDe(s, 'amigo').resistencia).toBe(3)
  })
})
