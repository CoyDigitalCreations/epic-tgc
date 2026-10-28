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
 * Inactividad: quien debe actuar y no mueve en LIMITE_INACTIVIDAD_MS (3 min) pierde por
 * 'abandono'; se evalúa perezosamente en state/act contra games.updated_at.
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
  inactividadExpirada,
  registrarCartas,
  validarDeck,
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
  /** ¿Pasó el límite de inactividad desde la última actividad (`updated_at`)? */
  inactividadExpirada: (ultimaActividad: string | null | undefined, ahora: number) => boolean
  registrarCartas: (cartas: unknown[]) => void
  /** Lanza Error con el motivo si el mazo es ilegal (66 cartas, 15/45/6, cardIds conocidos, límite de copias). */
  validarDeck: (deck: string[], nombre: string) => void
}

const engine: EngineModule = {
  createInitialState: createInitialState as EngineModule['createInitialState'],
  createCtxFromDraws: createCtxFromDraws as EngineModule['createCtxFromDraws'],
  applyAction: applyAction as EngineModule['applyAction'],
  visibleState: visibleState as EngineModule['visibleState'],
  actorActual: actorActual as EngineModule['actorActual'],
  inactividadExpirada: inactividadExpirada as EngineModule['inactividadExpirada'],
  registrarCartas: registrarCartas as EngineModule['registrarCartas'],
  validarDeck: validarDeck as EngineModule['validarDeck'],
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

// CORS: el cliente (Vercel, localhost) llama desde el navegador con supabase-js, que manda un preflight OPTIONS por sus cabeceras
// propias. La autenticación va en el header Authorization (JWT), no en cookies, así que un origen abierto no abre nada nuevo.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(res: unknown, status = 200): Response {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
 * FuenteEfectos (cartas creadas en Éter Forge por colaboradores).
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
    // si falla, el motor solo tendrá las cartas de FuenteEfectos
  }
}

/**
 * Valida el mazo con las reglas del motor (manual §3 y §12) ANTES de aceptarlo en la sala, para que un mazo ilegal
 * se rechace al crear o unirse y no al iniciar, cuando la sala ya está llena. Devuelve la respuesta de error, o null.
 */
async function rechazarMazoIlegal(deck: string[], jugador: 'A' | 'B'): Promise<Response | null> {
  await registrarCartasCustom() // los cardIds de cartas custom deben conocerse para validar
  try {
    engine.validarDeck(deck, jugador)
    return null
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 422)
  }
}

Deno.serve(async (req) => {
  // El preflight va ANTES de todo (sin JWT ni método): si no responde con las cabeceras CORS el navegador ni envía el POST
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return err('POST only', 405)

  const userId = userIdFromJwt(req)
  if (!userId) return err('unauthorized', 401)

  let body: {
    action?: 'create' | 'join' | 'start' | 'act' | 'state' | 'forfeit'
    gameId?: string
    code?: string
    deck?: string[]
    playerAction?: unknown
    /** state: cursor del log (último id de game_events ya visto). Ausente = historial completo (carga inicial o reconexión). */
    desdeEventoId?: number
  }
  try {
    body = await req.json()
  } catch {
    return err('invalid JSON')
  }

  const { action, gameId, code, deck, playerAction, desdeEventoId } = body
  if (!action) return err('action required')

  // ── create: genera sala lobby con código + deck del creador ──────────────
  if (action === 'create') {
    if (!esMazoValido(deck)) return err('deck must be 66 cardIds')
    const rechazoA = await rechazarMazoIlegal(deck, 'A')
    if (rechazoA) return rechazoA
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
    const rechazoB = await rechazarMazoIlegal(deck, 'B')
    if (rechazoB) return rechazoB
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
    // Filas viejas de un forfeit en sala dejaron { state: null }: sin estado no hay partida que cargar
    if ('state' in raw && 'rngDraws' in raw) return raw.state ? (raw as MatchPersist) : null
    if ('version' in raw && 'seed' in raw) {
      return { state: raw, rngDraws: 0 }
    }
    return null
  }

  /**
   * Abandono por inactividad: si el jugador al que le toca actuar lleva más del límite sin mover (`updated_at` se toca con cada
   * acción persistida), pierde. Se evalúa de forma perezosa en `state` y `act`, así el resultado no depende de quién consulte.
   * Muta `game` y `persistObj` para que el resto del request ya vea la partida terminada. Devuelve el ganador, o null si no expiró.
   */
  async function cerrarPorInactividad(persistObj: MatchPersist | null): Promise<'A' | 'B' | null> {
    if (game.status !== 'playing' || !persistObj?.state) return null
    if (!engine.inactividadExpirada(game.updated_at, Date.now())) return null
    const actor = engine.actorActual(persistObj.state as never)
    if (!actor) return null
    const winner = actor === 'A' ? 'B' : 'A'
    const ctx = engine.createCtxFromDraws(Number(game.seed), persistObj.rngDraws)
    const result = engine.applyAction(persistObj.state as never, { type: 'rendirse', jugador: actor }, ctx as never)
    const nextState = (result.ok ? result.state : persistObj.state) as unknown as Record<string, unknown>
    const finishedAt = new Date().toISOString()
    const res = await sb(`games?id=eq.${encodeURIComponent(gameId)}&status=eq.playing`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        state_json: { state: nextState, rngDraws: ctx.draws },
        status: 'finished',
        winner,
        finish_reason: 'abandono',
        finished_at: finishedAt,
      }),
    })
    if (!res.ok) {
      console.error('inactivity close failed', await res.text())
      return null
    }
    game.status = 'finished'
    game.winner = winner
    game.finish_reason = 'abandono'
    persistObj.state = nextState
    return winner
  }

  /**
   * Eventos del motor para el log del solicitante. Con cursor (`desdeEventoId`) devuelve solo los de los ACTOS DEL RIVAL posteriores
   * a él: los propios ya le llegaron en la respuesta de `act`. Sin cursor devuelve el final del historial completo (reconexión).
   * El cursor avanza por TODOS los eventos leídos (también los propios), de una sola consulta, para no saltarse ni repetir ninguno.
   * Los payloads solo llevan ids de instancia: el cliente los nombra con SU visibleState, así que lo oculto del rival sigue oculto.
   */
  async function eventosParaLog(): Promise<{ eventos: unknown[]; ultimoEventoId: number } | null> {
    const cursor = typeof desdeEventoId === 'number' && Number.isFinite(desdeEventoId) ? desdeEventoId : null
    const consulta =
      cursor === null
        ? `game_events?game_id=eq.${encodeURIComponent(gameId)}&select=id,player_id,payload&order=id.desc&limit=1000`
        : `game_events?game_id=eq.${encodeURIComponent(gameId)}&id=gt.${cursor}&select=id,player_id,payload&order=id.asc&limit=1000`
    const res = await sb(consulta)
    if (!res.ok) {
      console.error('events read failed', await res.text())
      return null
    }
    const rows = (await res.json()) as { id: number; player_id: string | null; payload: unknown }[]
    if (cursor === null) rows.reverse()
    const propios = (r: { player_id: string | null }) => r.player_id === userId
    return {
      eventos: rows.filter((r) => cursor === null || !propios(r)).map((r) => r.payload),
      ultimoEventoId: rows.length > 0 ? rows[rows.length - 1].id : (cursor ?? 0),
    }
  }

  // ── state (reconnect / poll / sala de espera) ────────────────────────────
  if (action === 'state') {
    const persistObj = await loadPersist()
    await cerrarPorInactividad(persistObj)
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
    // Si la lectura falla el log simplemente no avanza (sin eventos ni cursor): el siguiente poll reintenta
    const log = await eventosParaLog()
    return json({
      status: game.status,
      state: engine.visibleState(st, playerId),
      player: playerId,
      validActions: [],
      bothPlayers,
      winner: game.winner ?? null,
      finishReason: game.finish_reason ?? null,
      code: game.code,
      ...(log ?? {}),
    })
  }

  // ── forfeit ───────────────────────────────────────────────────────────────
  if (action === 'forfeit') {
    if (game.status !== 'playing' && game.status !== 'lobby') {
      return err('game already finished', 409)
    }
    const persistObj = await loadPersist()
    // Sala que nunca arrancó (cancelar o rendirse en la espera): no hay estado ni ganador, y state_json no se toca
    if (!persistObj) {
      const res = await sb(`games?id=eq.${encodeURIComponent(gameId)}&status=in.(lobby,playing)`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'finished', winner: null, finish_reason: 'abandono', finished_at: new Date().toISOString() }),
      })
      if (!res.ok) {
        console.error('forfeit (sin estado) failed', await res.text())
        return err('failed to close room', 500)
      }
      return json({ ok: true, winner: null, finishReason: 'abandono' })
    }
    const winner = playerId === 'A' ? 'B' : 'A'
    await persist(persistObj, {
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

    // Si quien actúa llega tarde, la partida ya se perdió: su acción no se aplica
    const ganadorPorTiempo = await cerrarPorInactividad(persistObj)
    if (ganadorPorTiempo) {
      return json({
        ok: false,
        error: 'tiempo agotado: la partida terminó por inactividad',
        state: engine.visibleState(persistObj.state as never, playerId),
        finished: true,
        winner: ganadorPorTiempo,
        finishReason: 'abandono',
        status: 'finished',
      })
    }

    const state = persistObj.state as never
    const actor = engine.actorActual(state)
    if (!actor) return err('game over', 409)
    if (actor !== playerId) return err('not your turn', 403)

    if (!playerAction || typeof playerAction !== 'object' || !('type' in (playerAction as object))) {
      return err('playerAction required')
    }

    // `rendirse` y `elegir_objetivo` traen `jugador` desde el cliente: nunca se confía, se fija al
    // autenticado (si no, en su turno podría rendir al rival o elegir el pendiente del rival).
    const tipoAccion = (playerAction as { type: string }).type
    const accion =
      tipoAccion === 'rendirse' || tipoAccion === 'elegir_objetivo'
        ? { ...(playerAction as object), jugador: playerId }
        : playerAction

    const ctx = engine.createCtxFromDraws(Number(game.seed), persistObj.rngDraws)
    const result = engine.applyAction(state, accion, ctx as never)

    if (!result.ok) {
      return json({ ok: false, error: result.error, state: engine.visibleState(result.state, playerId) })
    }

    const nextState = result.state
    const finished = (nextState as { fase?: string }).fase === 'terminada'
    const ganador = (nextState as { ganador?: 'A' | 'B' }).ganador
    const motivo = (nextState as { motivo?: string }).motivo
    // F6: un EMPATE no tiene ganador (winner null, finish_reason 'empate'); sin esta rama se inventaría uno
    const winner = finished ? (motivo === 'empate' ? null : (ganador ?? (playerId === 'A' ? 'B' : 'A'))) : null
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
        const evRes = await sb('game_events', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(events),
        })
        // sb() no lanza con un status de error: sin esto un insert rechazado dejaba el log del rival vacío en silencio
        if (!evRes.ok) console.error('events append rejected', evRes.status, await evRes.text())
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
