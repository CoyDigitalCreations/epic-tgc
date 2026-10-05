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
import type { Action, GameState, PlayerId } from '../game'
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
  winner?: PlayerId | null
  finishReason?: string | null
  code?: string
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

async function callMatchEngine<T>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado (faltan env vars)')
  const { data, error } = await supabase.functions.invoke(FN, { body: payload })
  if (error) throw new Error(error.message ?? 'match-engine error')
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

export async function obtenerEstado(gameId: string): Promise<MatchStateResponse> {
  return callMatchEngine<MatchStateResponse>({ action: 'state', gameId })
}

export async function rendirse(gameId: string): Promise<{ ok: boolean; winner?: PlayerId }> {
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
        'No se pudo iniciar sesión. Habilitá anonymous sign-ins en Supabase → Authentication → Providers.',
    )
  }
  return anon.user.id
}
