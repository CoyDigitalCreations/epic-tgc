/**
 * matchApi — cliente HTTP de la Edge Function match-engine.
 *
 * Flujo de sala de amigos:
 *   create → { gameId, code }  (compartir code)
 *   join   → { gameId }        (con el code)
 *   start  → estado inicial visible
 *   act    → aplica acción del motor
 *   state  → reconnect / poll
 *   forfeit→ rendirse
 */
import { getSupabase } from './supabase'
import type { Action, GameEvent, GameState, JugadaPpt, PlayerId, PptVista } from '../game'
import type { EterGame } from '../../shared/types/eter-db'

const FN = 'match-engine'

export interface RoomInfo {
  gameId: string
  code: string
  seed: number
  player: PlayerId
}

export interface MatchStateResponse {
  status: EterGame['status']
  state: GameState | null
  player: PlayerId
  /** Sala de espera: ¿ya entró el rival? (poll sin query directa a games) */
  bothPlayers?: boolean
  winner?: PlayerId | null
  finishReason?: string | null
  code?: string
  /** Sala de espera con los dos jugadores: estado del piedra, papel o tijera (solo lo que este jugador puede ver) */
  ppt?: PptVista
  /** Log: eventos nuevos desde el cursor (solo los del rival; sin cursor, el final del historial completo) */
  eventos?: GameEvent[]
  /** Cursor para pedir el siguiente tramo del log (`desdeEventoId`) */
  ultimoEventoId?: number
}

export interface ActResponse {
  ok: boolean
  error?: string
  state: GameState
  events?: unknown[]
  finished?: boolean
  winner?: PlayerId | null
  finishReason?: string | null
  status?: string
}

/**
 * Un status no-2xx llega como `FunctionsHttpError` con un mensaje genérico; el motivo real (p. ej. el mazo
 * ilegal que rechaza `create`/`join`) viene en el cuerpo `{ error }` de la respuesta, en `error.context`.
 */
async function mensajeDeError(error: { message?: string; context?: unknown }): Promise<string> {
  if (typeof Response !== 'undefined' && error.context instanceof Response) {
    try {
      const body = await error.context.json()
      if (body && typeof body.error === 'string' && body.error) return body.error
    } catch {
      // cuerpo no JSON: se usa el mensaje genérico
    }
  }
  return error.message ?? 'match-engine error'
}

async function callMatchEngine<T>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado (faltan env vars)')
  const { data, error } = await supabase.functions.invoke(FN, { body: payload })
  if (error) throw new Error(await mensajeDeError(error))
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error)
  }
  return data as T
}

export async function crearSala(deck: string[]): Promise<RoomInfo> {
  return callMatchEngine<RoomInfo>({ action: 'create', deck })
}

export async function unirseASala(code: string, deck: string[]): Promise<RoomInfo> {
  return callMatchEngine<RoomInfo>({ action: 'join', code: code.trim().toUpperCase(), deck })
}

export async function iniciarPartida(gameId: string): Promise<MatchStateResponse> {
  return callMatchEngine<MatchStateResponse>({ action: 'start', gameId })
}

export async function enviarAccion(
  gameId: string,
  playerAction: Action,
): Promise<ActResponse> {
  return callMatchEngine<ActResponse>({ action: 'act', gameId, playerAction })
}

/** `desdeEventoId`: cursor del log (`ultimoEventoId` de la respuesta anterior); sin él llega el historial completo. */
export async function obtenerEstado(gameId: string, desdeEventoId?: number): Promise<MatchStateResponse> {
  return callMatchEngine<MatchStateResponse>({ action: 'state', gameId, ...(desdeEventoId !== undefined && { desdeEventoId }) })
}

/** Piedra, papel o tijera de la sala de espera: registra mi jugada (el servidor la mantiene oculta hasta que el rival elija). */
export async function jugarPpt(gameId: string, jugada: JugadaPpt): Promise<{ ok: boolean; ppt: PptVista }> {
  return callMatchEngine({ action: 'ppt', gameId, jugada })
}

/** El ganador del piedra, papel o tijera decide: `empezar` true = juega primero, false = cede el primer turno. */
export async function decidirPrimero(gameId: string, empezar: boolean): Promise<{ ok: boolean; ppt: PptVista }> {
  return callMatchEngine({ action: 'ppt_decidir', gameId, empezar })
}

export async function rendirse(gameId: string): Promise<{ ok: boolean; winner?: PlayerId | null }> {
  return callMatchEngine({ action: 'forfeit', gameId })
}

/** ¿Listo para jugar online? (env vars + sesión) */
export async function asegurarSesion(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  const { data } = await supabase.auth.getSession()
  if (data.session?.user?.id) return data.session.user.id
  // Anónimo: MVP de amigos sin email/SMTP
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) {
    throw new Error(
      error?.message ??
        'No se pudo iniciar sesión. Habilita anonymous sign-ins en Supabase → Authentication → Providers.',
    )
  }
  return anon.user.id
}
