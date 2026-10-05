/**
 * match-engine — Edge Function server-authoritative para Éter TGC.
 *
 * El motor es el bundle de src/online/game (TS puro, determinista), servido
 * desde el repo público vía raw.githubusercontent (commit pineado abajo).
 * El servidor es la única fuente de verdad: valida actor, aplica applyAction,
 * persiste { state, rngDraws } y devuelve visibleState por jugador.
 *
 * Acciones:
 *   start    — ambos jugadores listos → createInitialState + status=playing
 *   act      — aplica una Action del jugador autenticado
 *   state    — reconnect: devuelve visibleState del solicitante
 *   forfeit  — rendirse
 *
 * Auth: JWT de Supabase (verify_jwt=true). Leemos `sub` y lo comparamos
 * con player_a_id/player_b_id. Crear/unirse a salas va por PostgREST+RLS.
 */

// Bundle del motor en el repo (regenerar: npx esbuild src/online/game/index.ts
// --bundle --format=esm --platform=neutral --outfile=supabase/functions/match-engine/engine.js)
const ENGINE_URL =
  'https://raw.githubusercontent.com/CoyDigitalCreations/epic-tgc/master/supabase/functions/match-engine/engine.js'

type EngineModule = {
  createInitialState: (deckA: string[], deckB: string[], seed: number) => {
    state: Record<string, unknown>
    ctx: { draws: number }
  }
  createCtxFromDraws: (seed: number, draws: number) => {
    draws: number
    events: unknown[]
  }
  applyAction: (
    state: never,
    action: unknown,
    ctx: never,
  ) =>
    | { ok: true; state: never; events: unknown[] }
    | { ok: false; state: never; error: string }
  visibleState: (state: never, playerId: 'A' | 'B') => never
  actorActual: (state: never) => 'A' | 'B' | null
}

let enginePromise: Promise<EngineModule> | null = null
function loadEngine(): Promise<EngineModule> {
  if (!enginePromise) enginePromise = import(ENGINE_URL) as Promise<EngineModule>
  return enginePromise
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Snapshot persistido en games.state_json (serverless-safe). */
interface MatchPersist {
  state: Record<string, unknown>
  rngDraws: number
}

function json(res: unknown, status = 200): Response {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status)
}

async function sb(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

function userIdFromJwt(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return err('POST only', 405)

  const userId = userIdFromJwt(req)
  if (!userId) return err('unauthorized', 401)

  let body: {
    action?: 'start' | 'act' | 'state' | 'forfeit'
    gameId?: string
    playerAction?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return err('invalid JSON')
  }

  const { action, gameId, playerAction } = body
  if (!gameId) return err('gameId required')
  if (!action) return err('action required')

  let engine: EngineModule
  try {
    engine = await loadEngine()
  } catch (e) {
    console.error('engine load failed', e)
    return err('engine unavailable', 503)
  }

  // Load game
  const gameRes = await sb(`games?id=eq.${encodeURIComponent(gameId)}&select=*`)
  if (!gameRes.ok) return err('db error loading game', 500)
  const games = await gameRes.json()
  const game = games?.[0]
  if (!game) return err('game not found', 404)

  const isA = game.player_a_id === userId
  const isB = game.player_b_id === userId
  if (!isA && !isB) return err('not a participant', 403)
  const playerId: 'A' | 'B' = isA ? 'A' : 'B'

  async function persist(persistObj: MatchPersist, extra: Record<string, unknown>) {
    const res = await sb(`games?id=eq.${encodeURIComponent(gameId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ state_json: persistObj, ...extra }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('persist failed', text)
      throw new Error('failed to persist game state')
    }
  }

  async function loadPersist(): Promise<MatchPersist | null> {
    const raw = game.state_json
    if (!raw || typeof raw !== 'object') return null
    // New shape: { state, rngDraws }; legacy: bare GameState with version+seed
    if ('state' in raw && 'rngDraws' in raw) return raw as MatchPersist
    if ('version' in raw && 'seed' in raw) {
      // Migrate legacy bare state: unknown draws — treat as 0 (broken mid-game)
      return { state: raw, rngDraws: 0 }
    }
    return null
  }

  // ── state (reconnect / poll) ──────────────────────────────────────────────
  if (action === 'state') {
    const persistObj = await loadPersist()
    if (!persistObj) {
      return json({ status: game.status, state: null, player: playerId, validActions: [] })
    }
    const st = persistObj.state as never
    return json({
      status: game.status,
      state: engine.visibleState(st, playerId),
      player: playerId,
      validActions: [],
      winner: game.winner ?? null,
      finishReason: game.finish_reason ?? null,
    })
  }

  // ── forfeit ───────────────────────────────────────────────────────────────
  if (action === 'forfeit') {
    if (game.status !== 'playing' && game.status !== 'lobby') {
      return err('game already finished', 409)
    }
    const winner = playerId === 'A' ? 'B' : 'A'
    const persistObj = await loadPersist()
    await persist(persistObj ?? { state: null as never, rngDraws: 0 }, {
      status: 'finished',
      winner,
      finish_reason: 'rendicion',
      finished_at: new Date().toISOString(),
    })
    return json({ ok: true, winner, finishReason: 'rendicion' })
  }

  // ── start ─────────────────────────────────────────────────────────────────
  if (action === 'start') {
    if (game.status !== 'lobby') return err('game not in lobby', 409)
    if (!game.player_a_id || !game.player_b_id) return err('waiting for both players', 409)
    if (!isA && !isB) return err('forbidden', 403)

    const deckA = game.deck_a as string[]
    const deckB = game.deck_b as string[]
    const seed = Number(game.seed)
    try {
      const { state, ctx } = engine.createInitialState(deckA, deckB, seed)
      const persistObj: MatchPersist = {
        state,
        rngDraws: ctx.draws,
      }
      await persist(persistObj, {
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      return json({
        ok: true,
        status: 'playing',
        state: engine.visibleState(state as never, playerId),
        player: playerId,
      })
    } catch (e) {
      return err(`start failed: ${e instanceof Error ? e.message : String(e)}`, 422)
    }
  }

  // ── act ───────────────────────────────────────────────────────────────────
  if (action === 'act') {
    if (game.status !== 'playing') return err('game not in playing state', 409)
    const persistObj = await loadPersist()
    if (!persistObj) return err('no game state', 409)

    const state = persistObj.state as never
    const actor = engine.actorActual(state)
    if (!actor) return err('game over', 409)
    if (actor !== playerId) return err('not your turn', 403)

    if (!playerAction || typeof playerAction !== 'object' || !('type' in (playerAction as object))) {
      return err('playerAction required')
    }

    const ctx = engine.createCtxFromDraws(Number(game.seed), persistObj.rngDraws)
    const result = engine.applyAction(state, playerAction, ctx as never)

    if (!result.ok) {
      return json({ ok: false, error: result.error, state: engine.visibleState(result.state, playerId) })
    }

    const nextState = result.state
    const finished = (nextState as { fase?: string }).fase === 'terminada'
    const ganador = (nextState as { ganador?: 'A' | 'B' }).ganador
    const motivo = (nextState as { motivo?: string }).motivo
    const winner = finished ? (ganador ?? (playerId === 'A' ? 'B' : 'A')) : null
    const finishReason = finished ? (motivo ?? 'rendicion') : null

    const nextPersist: MatchPersist = {
      state: nextState as unknown as Record<string, unknown>,
      rngDraws: ctx.draws,
    }

    const extra: Record<string, unknown> = {}
    if (finished) {
      extra.status = 'finished'
      extra.winner = winner
      extra.finish_reason = finishReason
      extra.finished_at = new Date().toISOString()
    }

    await persist(nextPersist, extra)

    // Append events for audit/replay (best-effort)
    try {
      const events = (result.events ?? []).map((e: Record<string, unknown>) => ({
        game_id: gameId,
        player_id: userId,
        type: String(e.type ?? 'unknown'),
        payload: e,
      }))
      if (events.length > 0) {
        await sb('game_events', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(events),
        })
      }
    } catch (e) {
      console.error('events append failed', e)
    }

    return json({
      ok: true,
      state: engine.visibleState(nextState, playerId),
      events: result.events ?? [],
      finished,
      winner,
      finishReason,
      status: finished ? 'finished' : 'playing',
    })
  }

  return err('unknown action')
})
