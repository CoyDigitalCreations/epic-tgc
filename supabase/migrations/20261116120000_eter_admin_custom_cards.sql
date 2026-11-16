-- =============================================================================
-- Administradores del Card-Maker y cartas custom SOLO para ellos.
--
-- Antes: cualquier usuario `authenticated` (incluidos los anónimos que abre la app para jugar) podía insertar
-- cartas en eter.custom_cards, y el motor carga TODAS esas cartas al validar mazos.
-- Ahora: solo quien esté en eter.admins puede insertar, actualizar o borrar. La lectura sigue abierta a los autenticados.
--
-- La lista de admins NO es legible ni escribible por la API (RLS activa y sin políticas): se gestiona con SQL / service_role.
-- Alta de un admin (después de crear el usuario en Authentication > Users):
--   insert into eter.admins (user_id) select id from auth.users where email = '<correo>';
-- =============================================================================

create table if not exists eter.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table eter.admins enable row level security;

revoke all on eter.admins from anon, authenticated;
grant all on eter.admins to service_role;

-- ¿El usuario de la sesión actual es administrador? SECURITY DEFINER: lee eter.admins aunque la API no pueda.
create or replace function eter.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from eter.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function eter.es_admin() from public, anon;
grant execute on function eter.es_admin() to authenticated, service_role;

-- custom_cards: las políticas «own» dejaban escribir a cualquier autenticado; pasan a exigir administrador
drop policy if exists custom_cards_insert_own on eter.custom_cards;
drop policy if exists custom_cards_update_own on eter.custom_cards;
drop policy if exists custom_cards_delete_own on eter.custom_cards;

create policy custom_cards_insert_admin
  on eter.custom_cards for insert
  to authenticated
  with check ((select eter.es_admin()));

create policy custom_cards_update_admin
  on eter.custom_cards for update
  to authenticated
  using ((select eter.es_admin()))
  with check ((select eter.es_admin()));

create policy custom_cards_delete_admin
  on eter.custom_cards for delete
  to authenticated
  using ((select eter.es_admin()));
