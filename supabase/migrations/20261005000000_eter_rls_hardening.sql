-- =============================================================================
-- eter RLS hardening — online server-authoritative (2026-10-05)
--
-- Auditoría previa encontró:
--   1. authenticated tenía SELECT en TODAS las columnas de eter.games
--      incl. state_json, deck_a/deck_b, seed → cualquier JWT podía leer el
--      estado oculto (mano rival, orden de mazo) sin pasar por visibleState.
--   2. INSERT/UPDATE de games permitidos al cliente (camino paralelo a la
--      Edge Function → inconsistencia y superficie de ataque).
--   3. El cliente query-eaba .from('games') sin schema eter y la Edge Function
--      usaba /rest/v1/games — PostgREST no expone `eter` por defecto.
--
-- Modelo resultante:
--   - Cliente: SOLO habla con la Edge Function match-engine (JWT + visibleState).
--   - service_role: única fuente de lectura/escritura de games/game_events.
--   - authenticated: solo profiles (SELECT + update/delete self) para UX.
--   - REQUISITO manual: Dashboard → Settings → API → Exposed schemas → `eter`.
--
-- Idempotente: revoke/drop/grant safe de re-ejecutar.
-- =============================================================================

-- 1. Quitar al cliente todo acceso directo a tablas de partida
revoke all on eter.games from authenticated;
revoke all on eter.game_events from authenticated;

-- 2. Eliminar policies muertas del cliente (el privilegio ya no existe)
drop policy if exists games_insert_own on eter.games;
drop policy if exists games_select_visible on eter.games;
drop policy if exists games_join_open_lobby on eter.games;
drop policy if exists game_events_select_participant on eter.game_events;

-- 3. profiles se mantiene: SELECT (nombres) + update/delete self
--    (ya correcto — no tocar)

-- 4. service_role: acceso total (reafirmar)
grant usage on schema eter to service_role;
grant all on all tables in schema eter to service_role;
alter default privileges in schema eter grant all on tables to service_role;

-- 5. anon sigue sin usage en eter (HTTP sin JWT no entra)
revoke usage on schema eter from anon;

-- 6. authenticated conserva usage en eter SOLO por profiles
grant usage on schema eter to authenticated;
