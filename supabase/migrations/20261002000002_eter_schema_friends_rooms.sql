-- =============================================================================
-- eter schema v1 — Backend MVP "salas de amigos" para Éter TGC
--
-- Diseño (ADR pendiente de escribir en .atl/ cuando se integre el cliente):
--   - Auth: Supabase Auth (amigos). Perfil auto-creado al registrarse.
--   - Salas: games con code corto (unirse con código). Sin matchmaking aún.
--   - Autoridad: el ESTADO de la partida (state_json) solo lo escribe el
--     servidor (Edge Function con service_role). Los clientes JAMÁS pueden
--     tocar state_json, seed, decks ni winner.
--   - Cliente autenticado solo puede: crear sala (insert), buscar lobby por
--     código (select), y UNirse (update de player_b_id).
--   - game_events: bitácora append-only escrita por el servidor; los
--     participantes solo leen.
--   - Mazos: snapshot jsonb (array de cardIds) en games.deck_a/deck_b al
--     crear/unirse. validarDeck del motor corre server-side al iniciar.
-- =============================================================================

create schema if not exists eter;

-- ── profiles ────────────────────────────────────────────────────────────────
create table eter.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$')
);

-- ── games (salas) ───────────────────────────────────────────────────────────
create table eter.games (
  id uuid primary key default gen_random_uuid(),
  -- Código corto para compartir con amigos (sin caracteres confusos 0/O/1/I)
  code text not null unique,
  status text not null default 'lobby'
    constraint games_status_check
      check (status in ('lobby', 'playing', 'finished', 'abandoned')),
  -- Contrato de RNG del motor (initialState.ts): misma seed + mismas acciones
  -- → misma partida. Sagrado — no reordenar el consumo en el motor.
  seed bigint not null,
  -- Snapshot de cardIds (JSON array). El servidor valida con validarDeck
  -- (15 Éter / 45 Principal / 6 Vínculos = 66) al iniciar la partida.
  deck_a jsonb not null
    constraint games_deck_a_is_array check (jsonb_typeof(deck_a) = 'array'),
  deck_b jsonb not null
    constraint games_deck_b_is_array check (jsonb_typeof(deck_b) = 'array'),
  -- GameState serializado del motor. SOLO service_role escribe.
  state_json jsonb,
  player_a_id uuid not null references eter.profiles (id) on delete cascade,
  player_b_id uuid references eter.profiles (id) on delete set null,
  -- 'A' | 'B' según el slot, no el auth uid — alineado con PlayerId del motor.
  winner text
    constraint games_winner_check check (winner in ('A', 'B')),
  finish_reason text
    constraint games_finish_reason_check check (
      finish_reason in ('rendicion', 'mazo_vacio', 'vinculos', 'abandono', 'desconexion')
    ),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  -- Toda partida finished debe registrar quién ganó o por qué terminó.
  constraint games_finished_has_outcome
    check (status <> 'finished' or winner is not null or finish_reason is not null)
);

-- Nota: `code text not null unique` ya crea el índice único games_code_key
-- automáticamente (Postgres nombra la constraint {tabla}_{columna}_key).
create index games_player_a_idx on eter.games (player_a_id);
create index games_player_b_idx on eter.games (player_b_id);
-- Lobby abierto: el join por código escanea solo salas jugables.
create index games_open_lobby_idx on eter.games (status, code)
  where status = 'lobby';

-- ── game_events (bitácora del motor) ────────────────────────────────────────
create table eter.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references eter.games (id) on delete cascade,
  player_id uuid references eter.profiles (id) on delete set null,
  -- Tipo del catálogo de events.ts del motor (ADR-10).
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index game_events_game_id_id_idx on eter.game_events (game_id, id);

-- ── triggers: updated_at ────────────────────────────────────────────────────
create or replace function eter.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on eter.profiles
  for each row execute function eter.set_updated_at();

create trigger games_touch_updated_at
  before update on eter.games
  for each row execute function eter.set_updated_at();

-- ── trigger: perfil auto al registrarse ─────────────────────────────────────
create or replace function eter.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into eter.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'username',
      'Jugador'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function eter.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table eter.profiles enable row level security;
alter table eter.games enable row level security;
alter table eter.game_events enable row level security;

-- profiles: lectura para usuarios autenticados (nombres en lobby);
-- escritura solo del propio perfil.
create policy profiles_select_authenticated
  on eter.profiles for select
  to authenticated
  using (true);

create policy profiles_update_self
  on eter.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_delete_self
  on eter.profiles for delete
  to authenticated
  using (id = auth.uid());

-- games: crear sala propia (lobby, sin player_b aún).
create policy games_insert_own
  on eter.games for insert
  to authenticated
  with check (
    player_a_id = auth.uid()
    and player_b_id is null
    and status = 'lobby'
  );

-- games: SELECT — participantes ven su partida; cualquier autenticado puede
-- ver lobbies abiertos para buscar por código (flujo "unirse con código").
create policy games_select_visible
  on eter.games for select
  to authenticated
  using (
    player_a_id = auth.uid()
    or player_b_id = auth.uid()
    or status = 'lobby'
  );

-- games: UPDATE — SOLO el join. Nada de state/winner/status desde el cliente.
create policy games_join_open_lobby
  on eter.games for update
  to authenticated
  using (
    status = 'lobby'
    and player_b_id is null
    and player_a_id <> auth.uid()
  )
  with check (
    status = 'lobby'
    and player_b_id = auth.uid()
    and player_a_id <> auth.uid()
  );

-- game_events: bitácora del servidor. Clientes solo leen si son participantes.
create policy game_events_select_participant
  on eter.game_events for select
  to authenticated
  using (
    exists (
      select 1
      from eter.games g
      where g.id = game_events.game_id
        and (g.player_a_id = auth.uid() or g.player_b_id = auth.uid())
    )
  );

-- ── grants por columna (defensa en profundidad contra trampas) ──────────────
-- authenticated NO tiene UPDATE sobre games completo: solo la columna
-- player_b_id (join). Todo lo demás (start, state_json, winner, finish)
-- pasa por Edge Function con service_role.
revoke update on eter.games from authenticated, anon;
grant update (player_b_id) on eter.games to authenticated;
grant select, insert on eter.games to authenticated;

-- game_events: inserts solo servidor (service_role).
revoke insert, update, delete on eter.game_events from authenticated, anon;
grant select on eter.game_events to authenticated;

-- profiles: update solo de columnas propias de presentación.
revoke update on eter.profiles from authenticated;
grant update (display_name, username) on eter.profiles to authenticated;
grant select on eter.profiles to authenticated;

-- service_role: acceso total a eter (motor server-authoritative).
grant usage on schema eter to authenticated, service_role;
grant all on all tables in schema eter to service_role;
alter default privileges in schema eter grant all on tables to service_role;

-- anon NO entra al schema del juego (multiplayer exige auth).
revoke usage on schema eter from anon;

-- ── realtime: lobby updates (player_b joined, status changes) ───────────────
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'eter'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table eter.games;
  end if;
end;
$$;
