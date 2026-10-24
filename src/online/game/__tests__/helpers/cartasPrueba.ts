/**
 * Helper de pruebas del SET DE CARTAS DE PRUEBA (seed/CartasPrueba.json, ids PR-xxx).
 *
 * SOLO PARA TESTS. Nada fuera de `__tests__` debe importar este archivo: el set
 * de prueba no forma parte de FuenteEfectos.json ni del bundle del servidor
 * (supabase/functions/match-engine/engine.js sale de src/online/game/index.ts,
 * que no lo importa).
 *
 * Aislamiento del registro global: `registrarCartas` escribe en un Map a nivel
 * de módulo (cards.ts) sin API para deshacer. Vitest aísla los módulos POR
 * ARCHIVO de test (isolate: true, el valor por defecto), así que registrar el
 * set aquí no contamina a ningún otro archivo — es el mismo patrón que usan
 * openerPila.test.ts, reglas.test.ts y compañía con sus cartas TEST-*. Si algún
 * día se desactiva el aislamiento, los ids PR-xxx no chocan con ninguna carta real.
 */
import cartasPruebaJson from '../../../../../seed/CartasPrueba.json'
import { registrarCartas } from '../../cards'
import { createInitialState } from '../../initialState'
import { createCtx } from '../../rng'
import { limpiarMemoReglas } from '../../reglas'
import { applyAction } from '../../actions'
import type { Action } from '../../actions'
import type { AnyCard } from '../../../../shared/types'
import type { CardInstance, Ctx, GameState, PlayerId } from '../../types'

/** Todas las cartas del set de prueba, tal como las exporta el Card-Maker. */
export const CARTAS_PRUEBA = cartasPruebaJson as unknown as AnyCard[]

let cargado = false

/**
 * Registra el set de prueba en el catálogo del motor (idempotente). Llamar en
 * `beforeAll` del archivo de test. También vacía el memo de reglas de reglas.ts
 * (se memoiza por cardId y el catálogo acaba de cambiar).
 */
export function cargarCartasPrueba(): AnyCard[] {
  if (!cargado) {
    registrarCartas(CARTAS_PRUEBA)
    cargado = true
  }
  limpiarMemoReglas()
  return CARTAS_PRUEBA
}

/** Ids del set, por familia (los usan los tests para no repetir literales). */
export const PR = {
  // Éteres
  ETER: 'PR-001', ETER_BUFF: 'PR-002', ETER_ROBA: 'PR-003', ETER_PASIVO_1A: 'PR-004',
  ETER_AURA: 'PR-005', ETER_CHOQUE: 'PR-006', ETER_BLOQUEO: 'PR-007', ETER_CRUEL: 'PR-008', ETER_RETORNO: 'PR-009',
  // Campeones
  PEON: 'PR-010', TIRADORA: 'PR-011', INTOCABLE: 'PR-012', HERALDO_HOSTIL: 'PR-013', HERALDO_ALIADO: 'PR-014',
  HOSTIGADOR: 'PR-015', COSECHADORA: 'PR-016', ULTIMA_VOLUNTAD: 'PR-017', ROMPECADENAS: 'PR-018',
  VIGIA_ALBA: 'PR-019', VIGIA_CHOQUE: 'PR-020', ESCUDO: 'PR-021', IMITADOR: 'PR-022', DOBLE_FILO: 'PR-023',
  ESCALONADO: 'PR-024', LADRONA: 'PR-025', GUARDIAN: 'PR-026', VERDUGO: 'PR-027', REACTIVO: 'PR-028',
  COMANDANTE: 'PR-029', MURO_DOBLE: 'PR-030',
  // Místicas
  RAYO: 'PR-040', PRESTEZA_ROBA: 'PR-041', PRESTEZA_DEBIL: 'PR-042', FUGAZ: 'PR-043', MARCHA: 'PR-044',
  AVISO: 'PR-045', ECO: 'PR-046', RECLAMO: 'PR-047', RITO: 'PR-048', ESPEJO: 'PR-049', DEVOLUCION: 'PR-050',
  DESTIERRO: 'PR-051', LAMENTO: 'PR-052', DECRETO: 'PR-053', NIEBLA: 'PR-054',
  ARTEFACTO_VELOZ: 'PR-055', VETO_FUGAZ: 'PR-056', FUGAZ_DEMOLEDORA: 'PR-057',
  // Arcanas
  PACTO: 'PR-060', SENTENCIA: 'PR-061', TRAMPA: 'PR-062', FILO_ARCANA: 'PR-063',
  // Vínculos
  VINC_RETORNO: 'PR-070', VINC_PESO: 'PR-071', VINC_CHOQUE: 'PR-072', VINC_VACIO: 'PR-073', VINC_BLOQUEO: 'PR-074', VINC_CRISTAL: 'PR-075',
} as const

/* ───────────────────────── Armado de mazos / partidas ───────────────────────── */

/** Mazo válido de 66 cartas (15 Éter + 45 Principal + 6 Vínculos) hecho solo con cartas PR. */
export function mazoPrueba(): string[] {
  const porTipo = (t: AnyCard['type']) => CARTAS_PRUEBA.filter((c) => c.type === t).map((c) => c.id)
  const llenar = (ids: string[], n: number) => Array.from({ length: n }, (_, i) => ids[i % ids.length])
  const eteres = llenar(porTipo('Éter'), 15)
  const principal = llenar([...porTipo('Campeón'), ...porTipo('Mística'), ...porTipo('Arcana')], 45)
  const vinculos = llenar(porTipo('Vínculo'), 6)
  return [...eteres, ...principal, ...vinculos]
}

/** Partida real (createInitialState) con ambos mazos de prueba. */
export function crearPartidaPrueba(seed = 1): { state: GameState; ctx: Ctx } {
  cargarCartasPrueba()
  return createInitialState(mazoPrueba(), mazoPrueba(), seed)
}

/* ───────────────────────── Armado de escenas a mano ───────────────────────── */

function jugadorVacio(id: PlayerId) {
  return {
    id,
    mano: [] as string[],
    mazo: [] as string[],
    cementerio: [] as string[],
    exilio: [] as string[],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: {
      campeones: [null, null, null, null, null] as (string | null)[],
      misticasTacticas: [null, null, null] as (string | null)[],
      arcanasCombate: [null, null, null] as (string | null)[],
    },
    vinculos: [null, null, null, null, null, null] as (string | null)[],
    mulliganUsado: true,
  }
}

/** Escena vacía: turno de A en Forja, ambos jugadores sin cartas. */
export function escenaVacia(fase: GameState['fase'] = 'forja'): GameState {
  return {
    version: 1,
    seed: 7,
    fase,
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugadorVacio('A'), B: jugadorVacio('B') },
    instances: {},
  }
}

/** Contexto determinista (RNG real con semilla) para las acciones de la escena. */
export function crearCtx(seed = 1): Ctx {
  return createCtx(seed)
}

/** Registra una instancia (sin ubicarla en ninguna zona). */
export function inst(s: GameState, id: string, cardId: string, owner: PlayerId, extra: Partial<CardInstance> = {}): string {
  s.instances[id] = { cardInstanceId: id, cardId, owner, ...extra }
  return id
}

export function conMano(s: GameState, owner: PlayerId, id: string, cardId: string): string {
  inst(s, id, cardId, owner)
  s.players[owner].mano.push(id)
  return id
}

/** n Éteres en la Reserva (por defecto PR-001, sin gatillo ni aura). Ids: `eter-<owner>-<i>`. */
export function conEteres(s: GameState, owner: PlayerId, n: number, cardId: string = PR.ETER): string[] {
  const existentes = s.players[owner].eterReserva.length
  const ids = Array.from({ length: n }, (_, i) => `eter-${owner}-${existentes + i}`)
  for (const id of ids) inst(s, id, cardId, owner)
  s.players[owner].eterReserva.push(...ids)
  return ids
}

/** n cartas de relleno en el mazo (Éteres PR-001, sirven para robar). */
export function conMazo(s: GameState, owner: PlayerId, n = 4): string[] {
  const ids = Array.from({ length: n }, (_, i) => `mz-${owner}-${s.players[owner].mazo.length + i}`)
  for (const id of ids) inst(s, id, PR.ETER, owner)
  s.players[owner].mazo.push(...ids)
  return ids
}

/** Campeón en el campo, SIN invocación cansada (listo para atacar/bloquear). */
export function conCampeon(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number, extra: Partial<CardInstance> = {}): string {
  inst(s, id, cardId, owner, extra)
  s.players[owner].campo.campeones[slot] = id
  return id
}

export function conMistica(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number, extra: Partial<CardInstance> = {}): string {
  inst(s, id, cardId, owner, extra)
  s.players[owner].campo.misticasTacticas[slot] = id
  return id
}

export function conArcana(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number, extra: Partial<CardInstance> = {}): string {
  inst(s, id, cardId, owner, { bocaArriba: false, ...extra })
  s.players[owner].campo.arcanasCombate[slot] = id
  return id
}

/** Vínculo vivo (boca abajo) o destruido (boca arriba, con efectos vigentes) en el slot dado. */
export function conVinculo(s: GameState, owner: PlayerId, id: string, cardId: string, slot: number, bocaArriba = false): string {
  inst(s, id, cardId, owner, { bocaArriba })
  s.players[owner].vinculos[slot] = id
  return id
}

export function enCementerio(s: GameState, owner: PlayerId, id: string, cardId: string): string {
  inst(s, id, cardId, owner)
  s.players[owner].cementerio.push(id)
  return id
}

export function enExilio(s: GameState, owner: PlayerId, id: string, cardId: string): string {
  inst(s, id, cardId, owner)
  s.players[owner].exilio.push(id)
  return id
}

/** Aplica una acción y lanza si el motor la rechaza (los tests narran un camino legal). */
export function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

/** Tipos de evento emitidos por la última acción (en orden). */
export function tiposDeEventos(ctx: Ctx): string[] {
  return ctx.events.map((e) => e.type)
}
