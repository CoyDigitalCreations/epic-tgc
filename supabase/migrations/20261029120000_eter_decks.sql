-- Mazos personalizados en la nube: pertenecen a la cuenta (eter.profiles), no al navegador.
-- El id lo puede fijar el cliente (uuid) para que sincronizar sea un upsert idempotente; el dueño siempre es quien hace la
-- petición (RLS) y el servidor de partidas lee el mazo por id + dueño en vez de fiarse del arreglo que mande el cliente.
create table if not exists eter.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references eter.profiles (id) on delete cascade,
  name text not null,
  cards text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decks_name_length check (char_length(btrim(name)) between 1 and 40),
  constraint decks_cards_total check (cardinality(cards) = 66)
);

create index if not exists decks_owner_idx on eter.decks (owner_id);

drop trigger if exists decks_touch_updated_at on eter.decks;
create trigger decks_touch_updated_at
  before update on eter.decks
  for each row execute function eter.set_updated_at();

-- Tope de mazos por jugador (el cliente también lo avisa, pero aquí no se salta con una llamada directa)
create or replace function eter.decks_limit_per_owner()
returns trigger
language plpgsql
set search_path = eter, pg_temp
as $$
begin
  if (select count(*) from eter.decks where owner_id = new.owner_id) >= 5 then
    raise exception 'máximo 5 mazos personalizados' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists decks_limit on eter.decks;
create trigger decks_limit
  before insert on eter.decks
  for each row execute function eter.decks_limit_per_owner();

alter table eter.decks enable row level security;

drop policy if exists decks_select_own on eter.decks;
create policy decks_select_own on eter.decks for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists decks_insert_own on eter.decks;
create policy decks_insert_own on eter.decks for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists decks_update_own on eter.decks;
create policy decks_update_own on eter.decks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists decks_delete_own on eter.decks;
create policy decks_delete_own on eter.decks for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on eter.decks from anon;
grant select, insert, update, delete on eter.decks to authenticated;
grant all on eter.decks to service_role;

comment on table eter.decks is 'Mazos personalizados del jugador (66 cardIds expandidos). Máximo 5 por jugador.';
