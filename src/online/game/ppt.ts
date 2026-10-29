/**
 * Piedra, papel o tijera para decidir quién empieza en PvP (sala de espera, antes de `start`).
 *
 * Lógica PURA: el servidor la ejecuta sobre `games.ppt` (jsonb) y devuelve a cada jugador SOLO su vista (`pptVista`), sin la
 * jugada pendiente del rival. Reglas: una sola ronda, el empate la repite; quien gana ELIGE si empieza o cede el primer turno.
 * `rev` sube con cada cambio: el servidor lo usa como compare-and-set para que dos jugadas simultáneas no se pisen.
 */
import type { PlayerId } from './types'

export type JugadaPpt = 'piedra' | 'papel' | 'tijera'
export const JUGADAS_PPT: readonly JugadaPpt[] = ['piedra', 'papel', 'tijera']

export interface PptEstado {
  rev: number
  /** Ronda en curso (1-based); cada empate la incrementa. */
  ronda: number
  /** Jugadas de la ronda en curso. SECRETAS: nunca salen enteras hacia el cliente. */
  jugadas: Partial<Record<PlayerId, JugadaPpt>>
  /** Última ronda resuelta (empate o victoria): ya es pública. */
  ultima?: { ronda: number; A: JugadaPpt; B: JugadaPpt }
  /** Ganó el minijuego: es quien decide. */
  ganador?: PlayerId
  /** Decisión tomada: quién tiene el primer turno. Habilita `start`. */
  primerJugador?: PlayerId
}

/** Lo que ve un jugador: su jugada, si el rival ya eligió (no cuál), y lo ya revelado. */
export interface PptVista {
  ronda: number
  miJugada?: JugadaPpt
  rivalListo: boolean
  ultima?: PptEstado['ultima']
  ganador?: PlayerId
  primerJugador?: PlayerId
}

export type PptResultado = { ok: true; ppt: PptEstado } | { ok: false; error: string }

const GANA_A: Record<JugadaPpt, JugadaPpt> = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }
const rivalDe = (j: PlayerId): PlayerId => (j === 'A' ? 'B' : 'A')

export function pptInicial(): PptEstado {
  return { rev: 0, ronda: 1, jugadas: {} }
}

export function esJugadaPpt(x: unknown): x is JugadaPpt {
  return typeof x === 'string' && (JUGADAS_PPT as readonly string[]).includes(x)
}

/** Quién gana la ronda: `a` contra `b` (del punto de vista de A y B). */
export function ganadorPpt(a: JugadaPpt, b: JugadaPpt): PlayerId | 'empate' {
  if (a === b) return 'empate'
  return GANA_A[a] === b ? 'A' : 'B'
}

/** Registra la jugada de `jugador`; si ya están las dos, resuelve la ronda (empate → ronda nueva; victoria → hay ganador). */
export function pptJugar(actual: PptEstado | null, jugador: PlayerId, jugada: unknown): PptResultado {
  const ppt = actual ?? pptInicial()
  if (!esJugadaPpt(jugada)) return { ok: false, error: 'jugada inválida (piedra, papel o tijera)' }
  if (ppt.ganador) return { ok: false, error: 'el minijuego ya tiene ganador' }
  if (ppt.jugadas[jugador]) return { ok: false, error: 'ya elegiste en esta ronda' }

  const jugadas = { ...ppt.jugadas, [jugador]: jugada }
  const { A, B } = jugadas
  if (!A || !B) return { ok: true, ppt: { ...ppt, rev: ppt.rev + 1, jugadas } }

  const ultima = { ronda: ppt.ronda, A, B }
  const res = ganadorPpt(A, B)
  if (res === 'empate') return { ok: true, ppt: { rev: ppt.rev + 1, ronda: ppt.ronda + 1, jugadas: {}, ultima } }
  return { ok: true, ppt: { rev: ppt.rev + 1, ronda: ppt.ronda, jugadas: {}, ultima, ganador: res } }
}

/** El ganador decide: `empezar` true = juega primero, false = cede el primer turno al rival. */
export function pptDecidir(actual: PptEstado | null, jugador: PlayerId, empezar: unknown): PptResultado {
  if (!actual?.ganador) return { ok: false, error: 'todavía no hay ganador del minijuego' }
  if (actual.primerJugador) return { ok: false, error: 'el primer turno ya está decidido' }
  if (actual.ganador !== jugador) return { ok: false, error: 'solo decide quien ganó el minijuego' }
  if (typeof empezar !== 'boolean') return { ok: false, error: 'indica si empiezas o cedes el turno' }
  return { ok: true, ppt: { ...actual, rev: actual.rev + 1, primerJugador: empezar ? jugador : rivalDe(jugador) } }
}

/** Proyección para `jugador`: nunca incluye la jugada pendiente del rival. */
export function pptVista(ppt: PptEstado | null, jugador: PlayerId): PptVista {
  const p = ppt ?? pptInicial()
  return {
    ronda: p.ronda,
    ...(p.jugadas[jugador] && { miJugada: p.jugadas[jugador] }),
    rivalListo: Boolean(p.jugadas[rivalDe(jugador)]),
    ...(p.ultima && { ultima: p.ultima }),
    ...(p.ganador && { ganador: p.ganador }),
    ...(p.primerJugador && { primerJugador: p.primerJugador }),
  }
}
