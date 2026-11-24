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
  /** Segundos que tiene quien debe actuar antes de perder por abandono (lo eligió quien creó la sala). */
  limiteSegundos?: number
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
  /** Segundos que tiene quien debe actuar antes de perder por abandono. */
  limiteSegundos?: number
  /** Instante (ms epoch del SERVIDOR) en que vence el plazo de quien debe actuar; ausente fuera de `playing`. */
  venceEn?: number
  /** Reloj del servidor al responder: con él el cliente calcula su desfase y el contador no depende de su reloj. */
  ahora?: number
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
  /** Segundos que tiene quien debe actuar antes de perder por abandono. */
  limiteSegundos?: number
  /** Instante (ms epoch del SERVIDOR) en que vence el plazo de quien debe actuar; ausente fuera de `playing`. */
  venceEn?: number
  /** Reloj del servidor al responder: con él el cliente calcula su desfase y el contador no depende de su reloj. */
  ahora?: number
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

/** Mazo con el que se entra a una sala: los 66 cardIds (mazos preestablecidos) o el id de uno guardado en la cuenta (lo lee el servidor). */
export type MazoDeSala = string[] | { deckId: string }

const cuerpoMazo = (mazo: MazoDeSala) => (Array.isArray(mazo) ? { deck: mazo } : { deckId: mazo.deckId })

export async function crearSala(mazo: MazoDeSala, limiteSegundos?: number): Promise<RoomInfo> {
  return callMatchEngine<RoomInfo>({ action: 'create', ...cuerpoMazo(mazo), ...(limiteSegundos !== undefined && { limiteSegundos }) })
}

export async function unirseASala(code: string, mazo: MazoDeSala): Promise<RoomInfo> {
  return callMatchEngine<RoomInfo>({ action: 'join', code: code.trim().toUpperCase(), ...cuerpoMazo(mazo) })
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

/** Mensaje cuando una acción de cuenta o de partida contra personas se intenta sin haber iniciado sesión con Google. */
export const MENSAJE_SESION_REQUERIDA = 'Inicia sesión con Google para jugar con otras personas.'

/** Una sola comprobación contra el servidor por carga de página (no una por cada llamada que pida la sesión). */
let sesionVerificada: Promise<string | null> | null = null

/**
 * Id de la cuenta con la que se juega, o null si es invitado. Solo cuenta una sesión de Google (no anónima): el invitado juega contra
 * el bot en local y no tiene cuenta, así que ya no se abre ninguna sesión anónima. Una sesión anónima que quedara de antes en este
 * navegador se ignora (sin cuenta no hay nada que conservar).
 */
async function abrirSesion(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) return null
  // El token guardado en el navegador puede ser de un usuario que ya no existe (p. ej. se borró en la base): getSession solo lee el
  // almacenamiento local, getUser consulta al servidor. Si ya no vale, se descarta y se queda como invitado.
  const { data: servidor, error } = await supabase.auth.getUser()
  if (error) {
    await supabase.auth.signOut({ scope: 'local' })
    return null
  }
  if (servidor?.user?.is_anonymous ?? data.session.user.is_anonymous) return null
  return data.session.user.id
}

/** Olvida la sesión verificada (tras cerrar sesión): la siguiente petición abre una nueva. */
export function olvidarSesionVerificada(): void {
  sesionVerificada = null
}

/** Id de la cuenta de Google con sesión, o null si es invitado (o no hay Supabase). Nunca crea una sesión. */
export function usuarioConSesion(): Promise<string | null> {
  if (!sesionVerificada) {
    sesionVerificada = abrirSesion().then(
      (id) => {
        if (id === null) sesionVerificada = null // sin cuenta no se cachea: tras iniciar sesión la siguiente consulta debe verla
        return id
      },
      (e) => {
        sesionVerificada = null // un fallo (sin red, sin config) no se queda cacheado: el siguiente intento vuelve a probar
        throw e
      },
    )
  }
  return sesionVerificada
}

/** Como `usuarioConSesion`, pero un invitado es un error: para lo que exige cuenta (salas, amigos, mazos y perfil en la nube). */
export async function asegurarSesion(): Promise<string> {
  const id = await usuarioConSesion()
  if (!id) throw new Error(MENSAJE_SESION_REQUERIDA)
  return id
}
