// @vitest-environment node
/**
 * Fase B — bloqueo_fijo REPETIBLE + «una vez por turno» (opcional).
 *
 * Reglas aprobadas (handoff §2.4–2.7, §4-B):
 *  - Cada acción bloquear_eter sobre un bloqueo_fijo bloquea EXACTAMENTE N Éter propios y es UNA activación.
 *  - Con `unaVezPorTurno: true`: solo una activación de ESE efecto por turno (por carta y por índice).
 *    Se gasta al pagar y se reinicia al terminar el turno.
 *
 * Cartas reales: Aurora FB-010 (sin restricción), Elena FB-015 (sostenido, sin elección).
 * La restricción se prueba con un Dummy sintético: las cartas reales aún NO tienen el flag (Fase C).
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { dispararUmbralBloqueo, reagruparEfectosBloqueoAlba } from '../effectInterpreter'
import { validarBloqueo } from '../payments'
import { getValidActions } from '../validActions'
import { efectoBloqueoAccion, getCardMeta, registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import { destruirCarta, liberarEterBloqueado } from '../replacements'
import { tieneDoubleAttackActivo } from '../efectos'
import { claveEfecto, claveExterno } from '../eter'
import type { Ctx, GameState, PlayerId } from '../types'

const AURORA = 'FB-010'
const ELENA = 'FB-015'
const VAELA = 'FB-011'
const ETER = 'FB-001'
const DUMMY = 'TEST-FIJO-UNA-VEZ'

// Dummy: steal_champion sobre bloqueo_fijo 4 (como Aurora), con la restricción «una vez por turno»
registrarCartas([{
  id: DUMMY,
  name: 'Dummy una vez por turno',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
  stats: { cost: 4, poder: 5, resistencia: 5 },
  efectos: [{
    tipo: 'continuo',
    efecto: 'steal_champion',
    objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
    duracion: 'mientras_ester_bloqueado',
    costo: { tipo: 'bloqueo_fijo', cantidad: 4 },
    unaVezPorTurno: true,
    texto: 'Bloquea 4 Éter, una vez por turno, toma control de 1 Campeón rival, mientras tenga esta carta Éter bloqueado.',
  }],
} as unknown as AnyCard])

// Fase C: las cartas reales ya llevan «una vez por turno». Para probar la mecánica SIN la restricción se usan copias
// exactas de Aurora y Elena (mismo JSON, sin el flag).
function copiaSinRestriccion(id: string, de: string): void {
  const meta = getCardMeta(de) as unknown as { efectos: Record<string, unknown>[] }
  registrarCartas([{ ...meta, id, efectos: meta.efectos.map(({ unaVezPorTurno: _u, ...e }) => e) } as unknown as AnyCard])
}
const AURORA_LIBRE = 'TEST-AURORA-LIBRE'
const ELENA_LIBRE = 'TEST-ELENA-LIBRE'
copiaSinRestriccion(AURORA_LIBRE, AURORA)
copiaSinRestriccion(ELENA_LIBRE, ELENA)

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx = crearCtx()): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

function base(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: {
      campeones: [null, null, null, null, null] as (string | null)[],
      misticasTacticas: [null, null, null],
      arcanasCombate: [null, null, null],
    },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 4,
    seed: 1,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  } as unknown as GameState
}

function poner(s: GameState, id: string, cardId: string, owner: PlayerId = 'A'): GameState {
  return { ...s, instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } as GameState['instances'][string] } }
}

function enCampo(s: GameState, jugador: PlayerId, slot: number, id: string): GameState {
  const p = s.players[jugador]
  const campeones = p.campo.campeones.map((c, i) => (i === slot ? id : c))
  return { ...s, players: { ...s.players, [jugador]: { ...p, campo: { ...p.campo, campeones } } } }
}

function conReserva(s: GameState, ids: string[]): GameState {
  return { ...s, players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } } }
}

/** Aurora (A, slot 0) + Vaela (B, slot 0) + Vaela (B, slot 1) + `n` Éter en Reserva de A. */
function escenarioAurora(n = 8, carta = AURORA): GameState {
  let s = base()
  s = poner(s, 'aur', carta)
  s = enCampo(s, 'A', 0, 'aur')
  s = poner(s, 'rival', VAELA, 'B')
  s = enCampo(s, 'B', 0, 'rival')
  s = poner(s, 'rival2', VAELA, 'B')
  s = enCampo(s, 'B', 1, 'rival2')
  const ids = Array.from({ length: n }, (_, i) => `x${i}`)
  for (const id of ids) s = poner(s, id, ETER)
  return conReserva(s, ids)
}

/** Dummy (A, slot 0) + Vaela rival (B, slot 0) + Vaela (B, slot 1) + `n` Éter en Reserva. */
function escenarioDummy(n = 8): GameState {
  let s = base()
  s = poner(s, 'dum', DUMMY)
  s = enCampo(s, 'A', 0, 'dum')
  s = poner(s, 'rival', VAELA, 'B')
  s = enCampo(s, 'B', 0, 'rival')
  s = poner(s, 'rival2', VAELA, 'B')
  s = enCampo(s, 'B', 1, 'rival2')
  const ids = Array.from({ length: n }, (_, i) => `x${i}`)
  for (const id of ids) s = poner(s, id, ETER)
  return conReserva(s, ids)
}

const ids = (desde: number, hasta: number) => Array.from({ length: hasta - desde }, (_, i) => `x${desde + i}`)

describe('(a) bloqueo_fijo repetible — Aurora (copia exacta) sin restricción', () => {
  it('8 Éter = 2 activaciones de 4 → 2 robos pendientes; ambos campeones se quedan con A', () => {
    let s = escenarioAurora(8, AURORA_LIBRE)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'aur' })
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(4, 8), targetInstanceId: 'aur' })
    expect(s.instances.aur.eterBloqueado).toHaveLength(8)
    expect(s.objetivosPendientes).toHaveLength(2)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rival' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rival2' })
    expect(s.players.A.campo.campeones).toEqual(expect.arrayContaining(['rival', 'rival2']))
    expect(s.instances.rival.stolenBy).toBe('aur')
    expect(s.instances.rival2.stolenBy).toBe('aur')
  })

  it('sin restricción no escribe el contador de «una vez por turno»', () => {
    let s = escenarioAurora(8, AURORA_LIBRE)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'aur' })
    expect(s.instances.aur.efectosUsadosEsteTurno).toBeUndefined()
  })

  it('Aurora REAL (FB-010) ya lleva «una vez por turno»: la segunda activación del mismo turno se rechaza', () => {
    let s = escenarioAurora()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'aur' })
    expect(s.instances.aur.efectosUsadosEsteTurno).toEqual([1])
    expect(validarBloqueo(s, 'A', ids(4, 8), 'aur')).toMatch(/una vez por turno/)
  })

  it('bloquear 5 Éter en una acción se rechaza (exactamente N por activación)', () => {
    const s = escenarioAurora()
    expect(validarBloqueo(s, 'A', ids(0, 5), 'aur')).toMatch(/exactamente 4/)
  })
})

describe('(b) una vez por turno — Dummy sintético', () => {
  it('la segunda activación del mismo efecto se RECHAZA en el mismo turno', () => {
    let s = escenarioDummy()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    const r = applyAction(s, { type: 'bloquear_eter', eterIds: ids(4, 8), targetInstanceId: 'dum' }, crearCtx())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/una vez por turno/)
  })

  it('validActions no ofrece la segunda activación tras usarla', () => {
    let s = escenarioDummy()
    expect(getValidActions(s, 'A').some((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'dum')).toBe(true)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    expect(getValidActions(s, 'A').some((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'dum')).toBe(false)
  })

  it('el contador se GASTA al pagar: liberar el Éter NO lo devuelve (mismo turno)', () => {
    let s = escenarioDummy()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    liberarEterBloqueado(s, crearCtx(), 'dum', '2A')
    expect(s.instances.dum.efectosUsadosEsteTurno).toEqual([0])
    expect(validarBloqueo(s, 'A', ids(4, 8), 'dum')).toMatch(/una vez por turno/)
  })

  it('el contador se borra cuando la carta CAMBIA DE ZONA (ESTADO_DE_CAMPO: una carta que sale es nueva)', () => {
    let s = escenarioDummy()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    destruirCarta(s, crearCtx(), 'dum', 'combate')
    expect(s.instances.dum.efectosUsadosEsteTurno).toBeUndefined()
  })

  it('el contador se reinicia al terminar el turno (pasar_turno en Ocaso)', () => {
    let s = escenarioDummy()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    expect(s.instances.dum.efectosUsadosEsteTurno).toEqual([0])
    s = { ...s, fase: 'ocaso' }
    s = aplicar(s, { type: 'pasar_turno' })
    expect(s.instances.dum.efectosUsadosEsteTurno).toBeUndefined()
  })
})

describe('(d) rechazo si eterIds.length !== N (Elena, bloqueo_fijo 3)', () => {
  it('Elena rechaza 4 Éter (exige exactamente 3 por activación)', () => {
    let s = poner(escenarioAurora(), 'elena', ELENA)
    s = enCampo(s, 'A', 2, 'elena')
    expect(validarBloqueo(s, 'A', ids(0, 4), 'elena')).toMatch(/exactamente 3/)
    expect(validarBloqueo(s, 'A', ids(0, 3), 'elena')).toBeNull()
  })
})

describe('Elena (sostenido sin elección): repetir la activación NO apila el efecto', () => {
  it('2 activaciones de 3 → sigue activo, sin robos ni pendientes extra; solo más Éter bloqueado', () => {
    let s = escenarioAurora()
    s = poner(s, 'elena', ELENA_LIBRE)
    s = enCampo(s, 'A', 2, 'elena')
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 3), targetInstanceId: 'elena' })
    expect(tieneDoubleAttackActivo(s, 'elena')).toBe(true)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(3, 6), targetInstanceId: 'elena' })
    expect(s.instances.elena.eterBloqueado).toHaveLength(6)
    expect(tieneDoubleAttackActivo(s, 'elena')).toBe(true)
    expect(s.objetivosPendientes ?? []).toEqual([])
  })
})

describe('(e) Aurora real: Éter externo + dos robos en turnos distintos; al salir Aurora regresan todos', () => {
  it('externo (FB-005) + 4 propios → robo 1 → Alba → 4 propios más → robo 2 → Aurora sale → ambos vuelven', () => {
    let s = escenarioAurora(9)
    s = poner(s, 'pasivo', 'FB-005')
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterPagado: ['pasivo'] } } }
    // Externo: el Pasivo 1A bloquea x8 sobre Aurora (no cuenta para el pago exacto)
    s = aplicar(s, { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'aur', eterId: 'x8' })
    expect(s.instances.x8.bloqueadoPorEfecto).toBe(claveExterno('aur'))

    // Turno 1: robo 1
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'aur' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rival' })
    // Alba: libera los 4 propios; el robo SIGUE porque el externo permanece
    reagruparEfectosBloqueoAlba(s, crearCtx(), 'A')
    expect(s.instances.rival.stolenBy).toBe('aur')
    expect(s.instances.aur.eterBloqueado).toEqual(['x8'])

    // Fin del turno 1: «una vez por turno» se reinicia (Aurora es real y ya lo lleva). Vuelve a ser Forja de A.
    s = { ...s, fase: 'ocaso' }
    s = aplicar(s, { type: 'pasar_turno' })
    expect(s.instances.aur.efectosUsadosEsteTurno).toBeUndefined()
    s = { ...s, turno: 'A', fase: 'forja' }

    // Turno 2: robo 2 con 4 Éter más (Reserva ya repuesta por la Alba)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'aur' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'rival2' })
    expect(s.players.A.campo.campeones).toEqual(expect.arrayContaining(['rival', 'rival2']))

    // Aurora sale del campo → los dos robados regresan a B.
    // Aurora es Inmortal: un efecto NO la destruye (destruirCarta → destruccion_prevenida). Sale por combate.
    destruirCarta(s, crearCtx(), 'aur', 'combate')
    expect(s.players.B.campo.campeones).toEqual(expect.arrayContaining(['rival', 'rival2']))
    expect(s.players.A.campo.campeones).not.toContain('rival')
    expect(s.players.A.campo.campeones).not.toContain('rival2')
  })
})

describe('(f) paridad validActions ↔ validarBloqueo', () => {
  it('Aurora sin restricción: cada bloquear_eter ofrecido lo acepta el validador', () => {
    const s = escenarioAurora()
    const ofrecidos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'aur')
    expect(ofrecidos.length).toBeGreaterThan(0)
    for (const a of ofrecidos) {
      if (a.type !== 'bloquear_eter') continue
      expect(validarBloqueo(s, 'A', a.eterIds, 'aur', a.efectoIdx)).toBeNull()
    }
  })

  it('Dummy agotada: validActions y validador rechazan lo mismo', () => {
    let s = escenarioDummy()
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids(0, 4), targetInstanceId: 'dum' })
    expect(getValidActions(s, 'A').some((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'dum')).toBe(false)
    expect(validarBloqueo(s, 'A', ids(4, 8), 'dum')).not.toBeNull()
  })
})

describe('disparo POR ACTIVACIÓN: sin activación no dispara; con activación dispara una vez', () => {
  it('dispararUmbralBloqueo sin índice no arma robo; con el índice del efecto sí', () => {
    const idx = efectoBloqueoAccion(getCardMeta(AURORA)!)!.indice
    let s = escenarioAurora()
    s = { ...s, instances: { ...s.instances, aur: { ...s.instances.aur, eterBloqueado: ids(0, 4) } } }
    for (const id of ids(0, 4)) s.instances[id] = { ...s.instances[id], bloqueadoPorEfecto: claveEfecto('aur', idx), pagadoPor: 'A' }
    dispararUmbralBloqueo(s, crearCtx(), 'aur')
    expect(s.objetivosPendientes ?? []).toEqual([])
    dispararUmbralBloqueo(s, crearCtx(), 'aur', idx)
    expect(s.objetivosPendientes).toHaveLength(1)
  })
})
