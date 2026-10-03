-- =============================================================================
-- Wipe: app de comida (proyecto abandonado por ahora) + schema eter LEGACY
-- Autorizado por el dueño del proyecto (2026-10-02): reusar el proyecto
-- Supabase actual para Éter TGC. La app de comida se recrea después en
-- un proyecto nuevo cuando se retome.
-- =============================================================================

-- ── 1. Tablas de la app de comida (public) ──────────────────────────────────
drop table if exists public.cached_gemini_results cascade;
drop table if exists public.favorites cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.meal_history cascade;
drop table if exists public.meal_plan cascade;
drop table if exists public.pantry_items cascade;
drop table if exists public.recipe_ingredients cascade;
drop table if exists public.recipes cascade;
drop table if exists public.shopping_list_items cascade;

-- ── 2. Schema eter LEGACY (inseguro/incompleto, 0 filas) ────────────────────
-- Motivos del drop (no parcheo):
--   - games.state_json writable por cualquier participante → trampas
--   - sin seed ni snapshot de mazos en games → el servidor no puede iniciar
--   - SELECT no permitía buscar sala por código (unirse a lobby roto)
--   - match_queue era sobre-ingeniería para el MVP de amigos con código
drop schema if exists eter cascade;

-- ── 3. Extensiones que la app de comida dejó en public (advisors) ───────────
drop extension if exists pg_trgm cascade;
drop extension if exists citext cascade;

-- ── 4. Edge Functions de la app de comida ───────────────────────────────────
-- NO se pueden dropear por SQL (las maneja la plataforma Supabase).
-- Borrar manualmente en Dashboard → Edge Functions:
--   recipes, match-ingredients, gemini-orchestrator, ingredients
