/**
 * match-engine — Edge Function server-authoritative para Éter TGC.
 *
 * El motor es el bundle de src/online/game (TS puro, determinista), servido
 * desde el repo público vía raw.githubusercontent. El servidor es la única
 * fuente de verdad: valida actor, aplica applyAction, persiste { state,
 * rngDraws } y devuelve visibleState por jugador.
 *
 * Acciones:
 *   create  — crea sala con código + deck del creador (player A)
 *   join    — une a sala por código + deck del rival (player B)
 *   start   — ambos listos → createInitialState + status=playing
 *   act     — aplica una Action del jugador autenticado
 *   state   — reconnect: devuelve visibleState del solicitante
 *   forfeit — rendirse
 *
 * Auth: JWT de Supabase (verify_jwt=true). Leemos `sub` y lo comparamos
 * con player_a_id/player_b_id.
 */

// Bundle del motor incluido LOCALMENTE en la Edge Function.
// El Edge Runtime de Supabase BLOQUEA imports remotos (GitHub raw, jsDelivr)
// → 503 engine unavailable. La única forma confiable es tener engine.js
// como archivo local e import relativo './engine.js'.
//
// Regenerar el bundle cuando cambie src/online/game:
//   npx esbuild src/online/game/index.ts --bundle --format=esm --platform=neutral \
//     --outfile=supabase/functions/match-engine/engine.js
//
// Deploy: npx supabase functions deploy match-engine --project-ref kznvighndocgebhejvol
// (requiere npx supabase login una vez)
import {
  actorActual,
  applyAction,
  createCtxFromDraws,
  createInitialState,
  registrarCartas,
  visibleState,
} from './engine.js'

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
  registrarCartas: (cartas: unknown[]) => void
}

const engine: EngineModule = {
  createInitialState: createInitialState as EngineModule['createInitialState'],
  createCtxFromDraws: createCtxFromDraws as EngineModule['createCtxFromDraws'],
  applyAction: applyAction as EngineModule['applyAction'],
  visibleState: visibleState as EngineModule['visibleState'],
  actorActual: actorActual as EngineModule['actorActual'],
  registrarCartas: registrarCartas as EngineModule['registrarCartas'],
}

// PostgREST de Supabase NO usa prefijo de schema en la URL para schemas
// custom — se selecciona con headers Accept-Profile / Content-Profile.
// Docs: https://supabase.com/docs/guides/api/using-custom-schemas
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
      // Schema custom `eter`: URL queda /rest/v1/<table>, el schema va en header
      'Accept-Profile': 'eter',
      'Content-Profile': 'eter',
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

/** Código de sala: 6 chars, sin confusibles (0/O/1/I). */
function generarCodigoSala(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  }
  return code
}

function esMazoValido(deck: unknown): deck is string[] {
  return Array.isArray(deck) && deck.length === 66 && deck.every((x) => typeof x === 'string')
}

/**
 * Carga cartas custom de eter.custom_cards y las registra en el motor.
 * Necesario para que createInitialState resuelva cardIds que no están en
 * PrimerColeccionEfectos (cartas creadas en Éter Forge por colaboradores).
 */
async function registrarCartasCustom(): Promise<void> {
  try {
    const res = await sb('custom_cards?select=definition')
    if (!res.ok) return
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      const defs = rows.map((r: { definition: unknown }) => r.definition).filter(Boolean)
      engine.registrarCartas(defs)
    }
  } catch {
    // si falla, el motor solo tendrá las cartas de PrimerColeccion
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return err('POST only', 405)

  const userId = userIdFromJwt(req)
  if (!userId) return err('unauthorized', 401)

  let body: {
    action?: 'create' | 'join' | 'start' | 'act' | 'state' | 'forfeit'
    gameId?: string
    code?: string
    deck?: string[]
    playerAction?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return err('invalid JSON')
  }

  const { action, gameId, code, deck, playerAction } = body
  if (!action) return err('action required')

  // ── create: genera sala lobby con código + deck del creador ──────────────
  if (action === 'create') {
    if (!esMazoValido(deck)) return err('deck must be 66 cardIds')
    const roomCode = generarCodigoSala()
    const seed = Math.floor(Math.random() * 1_000_000)
    const insertRes = await sb('games', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        code: roomCode,
        status: 'lobby',
        seed,
        deck_a: deck,
        deck_b: [],
        player_a_id: userId,
        state_json: null,
      }),
    })
    if (!insertRes.ok) {
      const text = await insertRes.text()
      console.error('create failed', text)
      return err('failed to create room', 500)
    }
    const rows = await insertRes.json()
    const game = rows?.[0]
    if (!game) return err('failed to create room', 500)
    return json({ ok: true, gameId: game.id, code: game.code, seed: game.seed, player: 'A' })
  }

  // ── join: une a sala lobby por código + deck del rival ───────────────────
  if (action === 'join') {
    if (!code) return err('code required')
    if (!esMazoValido(deck)) return err('deck must be 66 cardIds')
    const findRes = await sb(
      `games?code=eq.${encodeURIComponent(code.toUpperCase())}&status=eq.lobby&player_b_id=is.null&select=*`,
    )
    if (!findRes.ok) return err('db error finding room', 500)
    const rooms = await findRes.json()
    const room = rooms?.[0]
    if (!room) return err('room not found or full', 404)
    if (room.player_a_id === userId) return err('cannot join your own room', 400)

    const updRes = await sb(`games?id=eq.${room.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ player_b_id: userId, deck_b: deck }),
    })
    if (!updRes.ok) {
      const text = await updRes.text()
      console.error('join failed', text)
      return err('failed to join room', 500)
    }
    const updated = await updRes.json()
    const game = updated?.[0]
    if (!game) return err('failed to join room', 500)
    return json({ ok: true, gameId: game.id, code: game.code, seed: game.seed, player: 'B' })
  }

  if (!gameId) return err('gameId required')

  // Load game (start/act/state/forfeit)
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
    if ('state' in raw && 'rngDraws' in raw) return raw as MatchPersist
    if ('version' in raw && 'seed' in raw) {
      return { state: raw, rngDraws: 0 }
    }
    return null
  }

  // ── state (reconnect / poll / sala de espera) ────────────────────────────
  if (action === 'state') {
    const persistObj = await loadPersist()
    // bothPlayers: el lobby necesita saber si el rival ya entró (sin leer
    // la tabla directamente — RLS prohíbe SELECT al cliente sobre games).
    const bothPlayers = Boolean(game.player_a_id && game.player_b_id)
    if (!persistObj) {
      return json({
        status: game.status,
        state: null,
        player: playerId,
        validActions: [],
        bothPlayers,
        code: game.code,
      })
    }
    const st = persistObj.state as never
    return json({
      status: game.status,
      state: engine.visibleState(st, playerId),
      player: playerId,
      validActions: [],
      bothPlayers,
      winner: game.winner ?? null,
      finishReason: game.finish_reason ?? null,
      code: game.code,
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

    const deckA = game.deck_a as string[]
    const deckB = game.deck_b as string[]
    if (!esMazoValido(deckA) || !esMazoValido(deckB)) {
      return err('decks not ready (66 cardIds each)', 422)
    }
    // Registrar cartas custom antes de crear el estado inicial
    await registrarCartasCustom()
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
