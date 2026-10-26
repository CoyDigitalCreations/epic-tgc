-- F6 (manual §13): un EMPATE termina la partida sin ganador (winner null) con finish_reason = 'empate'.
-- games_finished_has_outcome sigue cumpliéndose: finish_reason no es null. Solo se amplía el CHECK de finish_reason.
-- NO desplegada todavía: se aplica junto con el bundle del motor (engine.js) al final de F6.
alter table eter.games drop constraint games_finish_reason_check;
alter table eter.games add constraint games_finish_reason_check check (
  finish_reason in ('rendicion', 'mazo_vacio', 'vinculos', 'empate', 'abandono', 'desconexion')
);
