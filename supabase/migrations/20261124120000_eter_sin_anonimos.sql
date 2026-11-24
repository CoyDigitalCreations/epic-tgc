-- Invitado limitado: las cuentas anónimas dejan de poder escribir en la base.
-- El invitado juega contra el bot en su navegador (sin servidor) y sus mazos viven en localStorage; la nube (mazos, perfil) y las
-- partidas contra personas son solo para cuentas de Google. La Edge Function match-engine rechaza el JWT anónimo (403); aquí se cierra
-- lo que se puede tocar directo por la API de datos. Las políticas son RESTRICTIVE: se suman a las permisivas de dueño sin reemplazarlas.
-- Idempotente.

drop policy if exists decks_sin_anonimos on eter.decks;
create policy decks_sin_anonimos on eter.decks
  as restrictive for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true')
  with check (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true');

drop policy if exists profiles_update_sin_anonimos on eter.profiles;
create policy profiles_update_sin_anonimos on eter.profiles
  as restrictive for update to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true')
  with check (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true');
