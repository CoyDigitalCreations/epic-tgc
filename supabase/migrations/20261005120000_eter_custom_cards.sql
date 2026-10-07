-- =============================================================================
-- eter.custom_cards — Cartas custom de Éter Forge para partidas JvJ
--
-- Modelo Option C simplificado:
--   - El dueño de la carta la sube al guardarla en el Forge (auto-upload)
--   - El curador (usuario del repo) valida antes de que lleguen acá
--   - Edge Function carga estas definiciones al crear/unirse a salas JvJ
--   - registrarCartas() las registra en el motor antes de createInitialState
--
-- Aplicada en remoto 2026-10-05 via foodsupa_apply_migration.
-- =============================================================================

create table if not exists eter.custom_cards (
  id text primary key,
  definition jsonb not null,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_cards_id_format
    check (id ~ '^[a-z0-9][a-z0-9-]{1,63}$')
);

-- Trigger updated_at
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

drop trigger if exists custom_cards_touch_updated_at on eter.custom_cards;
create trigger custom_cards_touch_updated_at
  before update on eter.custom_cards
  for each row execute function eter.set_updated_at();

-- RLS
alter table eter.custom_cards enable row level security;

-- SELECT: todos los autenticados pueden leer (necesario para armar mazos JvJ)
create policy custom_cards_select_authenticated
  on eter.custom_cards for select
  to authenticated
  using (true);

-- INSERT: solo las propias
create policy custom_cards_insert_own
  on eter.custom_cards for insert
  to authenticated
  with check (created_by = auth.uid());

-- UPDATE/DELETE: solo las propias (el dueño puede corregir su carta)
create policy custom_cards_update_own
  on eter.custom_cards for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy custom_cards_delete_own
  on eter.custom_cards for delete
  to authenticated
  using (created_by = auth.uid());

-- Grants
grant usage on schema eter to authenticated;
grant select, insert, update, delete on eter.custom_cards to authenticated;
grant all on eter.custom_cards to service_role;
