/**
 * Reglas modificadas con duración (Capa 2 temporal): "este turno puedes…", "hasta tu próxima Alba…".
 *
 * Módulo HOJA (solo toca el estado): lo importan efectos.ts (para purgar en las transiciones de
 * fase, mismo ciclo de vida que `modificadores`) y reglas.ts (para leerlas). Si importara
 * efectos.ts crearía un ciclo.
 */
import type { ExpiraModificador, GameState, PlayerId, ReglaTemporal } from './types'

/** Registra una modificación temporal; `orden` crece siempre (desempata los `fijar`: gana el más reciente). */
export function aplicarReglaTemporal(s: GameState, regla: Omit<ReglaTemporal, 'orden'>): void {
  const orden = (s.ordenReglas ?? 0) + 1
  s.ordenReglas = orden
  s.reglasTemporales = [...(s.reglasTemporales ?? []), { ...regla, orden }]
}

/**
 * Misma semántica que purgarEfectosTemporales para `modificadores`:
 * - 'ocaso': decrementa `turnosRestantes` (si lo hay) y purga las que llegan a 0 o expiran en 'ocaso'.
 * - 'alba-dueño': purga las del jugador cuyo Alba es (si se indica) con expira 'alba-dueño'.
 */
export function purgarReglasTemporales(s: GameState, expira: ExpiraModificador, jugador?: PlayerId): void {
  if (!s.reglasTemporales?.length) return
  const quedan = s.reglasTemporales
    .map((r) => (expira === 'ocaso' && r.turnosRestantes !== undefined ? { ...r, turnosRestantes: r.turnosRestantes - 1 } : r))
    .filter((r) => {
      if (expira === 'ocaso') {
        if (r.turnosRestantes !== undefined) return r.turnosRestantes > 0
        return r.expira !== 'ocaso'
      }
      if (jugador !== undefined && r.duenio !== jugador) return true
      return r.expira !== expira
    })
  if (quedan.length === 0) delete s.reglasTemporales
  else s.reglasTemporales = quedan
}

/** Al ENTRAR `fase` con `turno` en curso: purga las de duración 'hasta_fase' que vencen ahí. */
export function purgarReglasHastaFase(s: GameState, fase: 'alba' | 'forja' | 'choque' | 'ocaso', turno: PlayerId): void {
  if (!s.reglasTemporales?.length) return
  const quedan = s.reglasTemporales.filter(
    (r) => !(r.expira === 'hasta-fase' && r.expiraFase === fase && r.expiraFaseJugador === turno),
  )
  if (quedan.length === 0) delete s.reglasTemporales
  else if (quedan.length !== s.reglasTemporales.length) s.reglasTemporales = quedan
}
