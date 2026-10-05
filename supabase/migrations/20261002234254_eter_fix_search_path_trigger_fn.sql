-- =============================================================================
-- eter_fix_search_path_trigger_fn (aplicado en remoto 2026-10-02)
--
-- Las funciones trigger deben declarar search_path explícito (empty) para
-- que no dependan del search_path del rol que las invoca. El CREATE inicial
-- ya lo incluía; esta migración asegura el estado en proyectos donde se
-- crearon sin él (defensa en profundidad, idempotente).
-- =============================================================================

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
