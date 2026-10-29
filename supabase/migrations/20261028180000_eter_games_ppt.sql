-- PvP: piedra, papel o tijera en la sala de espera para decidir quién empieza (src/online/game/ppt.ts).
-- Estado del minijuego mientras la sala está en 'lobby'. Null = aún nadie jugó. Lo escribe solo match-engine (service role);
-- el cliente nunca lee games directamente, y las jugadas pendientes del rival no salen del servidor.
alter table eter.games add column if not exists ppt jsonb;

comment on column eter.games.ppt is
  'Minijuego piedra/papel/tijera de la sala: { rev, ronda, jugadas, ultima?, ganador?, primerJugador? }. start exige primerJugador.';
