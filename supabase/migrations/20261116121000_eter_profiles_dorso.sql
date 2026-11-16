-- =============================================================================
-- Reverso de las cartas elegible por el jugador, visible para su rival.
--
-- eter.profiles.dorso: índice (0-4) de uno de los 5 reversos que ofrece la app. Lo edita el dueño con la política profiles_update_self.
-- eter.dorsos_de_partida(p_game): devuelve {"A": n, "B": n} con el reverso de cada asiento de una partida. El cliente no puede leer
-- eter.games (RLS) ni sabe quién es el rival, así que la función es SECURITY DEFINER y solo contesta a quien juega esa partida
-- (si no, devuelve null).
-- =============================================================================

alter table eter.profiles
  add column if not exists dorso smallint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_dorso_rango' and conrelid = 'eter.profiles'::regclass
  ) then
    alter table eter.profiles
      add constraint profiles_dorso_rango check (dorso between 0 and 4);
  end if;
end
$$;

-- Los permisos de eter.profiles son POR COLUMNA: sin esto el jugador no podría cambiar su propio reverso aunque la RLS lo permita
-- (la política profiles_update_self sigue limitando a la fila propia).
grant update (dorso) on eter.profiles to authenticated;

create or replace function eter.dorsos_de_partida(p_game uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('A', coalesce(pa.dorso, 0), 'B', coalesce(pb.dorso, 0))
  from eter.games g
  left join eter.profiles pa on pa.id = g.player_a_id
  left join eter.profiles pb on pb.id = g.player_b_id
  where g.id = p_game
    and (select auth.uid()) in (g.player_a_id, g.player_b_id);
$$;

revoke all on function eter.dorsos_de_partida(uuid) from public, anon;
grant execute on function eter.dorsos_de_partida(uuid) to authenticated, service_role;
