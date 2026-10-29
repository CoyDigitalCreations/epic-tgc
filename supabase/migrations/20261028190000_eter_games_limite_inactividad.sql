-- PvP: límite de inactividad configurable por sala (lo elige quien la crea, entre valores fijos del lobby).
-- Quien debe actuar y no lo hace dentro de este plazo pierde por 'abandono' (ver src/online/game/inactividad.ts).
-- Default 300 s (5 min): con 180 las partidas se cerraban demasiado rápido. Las partidas existentes quedan en 300.
alter table eter.games
  add column if not exists limite_inactividad_s integer not null default 300;

alter table eter.games drop constraint if exists games_limite_inactividad_check;
alter table eter.games
  add constraint games_limite_inactividad_check check (limite_inactividad_s in (60, 120, 180, 300, 600));

comment on column eter.games.limite_inactividad_s is
  'Segundos que tiene quien debe actuar antes de perder por abandono. Valores fijos: 60, 120, 180, 300 o 600.';
