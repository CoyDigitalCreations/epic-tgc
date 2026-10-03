/**
 * Tipos generados a mano para el schema `eter` de Supabase
 * (Éter TGC — backend MVP salas de amigos).
 *
 * El generador automático de tipos de Supabase solo cubre `public`;
 * este archivo es la fuente de verdad para el cliente del juego.
 * Regenerar/verificar contra las migraciones en `supabase/migrations/`.
 */

export type EterStatus = 'lobby' | 'playing' | 'finished' | 'abandoned'
export type EterWinner = 'A' | 'B'
export type EterFinishReason =
  | 'rendicion'
  | 'mazo_vacio'
  | 'vinculos'
  | 'abandono'
  | 'desconexion'

export interface EterProfile {
  id: string
  username: string | null
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface EterGame {
  id: string
  /** Código corto para compartir con amigos (unirse con código). */
  code: string
  status: EterStatus
  /** Contrato de RNG del motor — misma seed + mismas acciones = misma partida. */
  seed: number
  /** Snapshot de cardIds (array). Validado con validarDeck al iniciar (server). */
  deck_a: string[]
  deck_b: string[]
  /** GameState serializado. Solo service_role escribe (Edge Function). */
  state_json: Record<string, unknown> | null
  player_a_id: string
  player_b_id: string | null
  winner: EterWinner | null
  finish_reason: EterFinishReason | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface EterGameEvent {
  id: number
  game_id: string
  player_id: string | null
  /** Tipo del catálogo events.ts del motor (ADR-10). */
  type: string
  payload: Record<string, unknown> | null
  created_at: string
}

/** Insert de una sala (el cliente solo setea player_a = sí mismo, lobby, decks, seed, code). */
export type EterGameInsert = Pick<
  EterGame,
  'code' | 'seed' | 'deck_a' | 'deck_b' | 'player_a_id'
> & {
  status?: EterStatus
  player_b_id?: null
  state_json?: null
}

/** Update que el cliente autenticado PUEDE hacer: solo player_b_id (join). */
export type EterGameJoinUpdate = Pick<EterGame, 'player_b_id'>
