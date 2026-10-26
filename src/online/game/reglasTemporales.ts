/**
 * Reglas modificadas con duración (Capa 2 temporal): "este turno puedes…", "hasta tu próxima Alba…".
 * También los cambios de Esencia/Rol/Facción (`cambiosAtributo`, F9e): mismo ciclo de vida.
 *
 * Módulo HOJA (solo toca el estado): lo importan efectos.ts (para purgar en las transiciones de
 * fase, mismo ciclo de vida que `modificadores`) y reglas.ts (para leerlas). Si importara
 * efectos.ts crearía un ciclo.
 */
import type { CambioAtributo, ExpiraModificador, GameState, PlayerId, ReglaTemporal } from './types'

/** Lo que comparten las listas con duración: quién las creó y cuándo vencen. */
interface Caducable {
  duenio: PlayerId
  expira: ExpiraModificador
  turnosRestantes?: number
  expiraFase?: 'alba' | 'forja' | 'choque' | 'ocaso'
  expiraFaseJugador?: PlayerId
}

/** Registra una modificación temporal; `orden` crece siempre (desempata los `fijar`: gana el más reciente). */
export function aplicarReglaTemporal(s: GameState, regla: Omit<ReglaTemporal, 'orden'>): void {
  const orden = (s.ordenReglas ?? 0) + 1
  s.ordenReglas = orden
  s.reglasTemporales = [...(s.reglasTemporales ?? []), { ...regla, orden }]
}

/** Registra un cambio de Esencia/Rol/Facción (F9e); el más reciente de cada atributo gana. */
export function aplicarCambioAtributo(s: GameState, cambio: CambioAtributo): void {
  s.cambiosAtributo = [...(s.cambiosAtributo ?? []), cambio]
}

/** 'ocaso': decrementa `turnosRestantes` y quita las que llegan a 0 o expiran en 'ocaso'; 'alba-dueño': las de ese jugador. */
function sinVencidas<T extends Caducable>(lista: readonly T[], expira: ExpiraModificador, jugador?: PlayerId): T[] {
  return lista
    .map((r) => (expira === 'ocaso' && r.turnosRestantes !== undefined ? { ...r, turnosRestantes: r.turnosRestantes - 1 } : r))
    .filter((r) => {
      if (expira === 'ocaso') {
        if (r.turnosRestantes !== undefined) return r.turnosRestantes > 0
        return r.expira !== 'ocaso'
      }
      if (jugador !== undefined && r.duenio !== jugador) return true
      return r.expira !== expira
    })
}

/**
 * Misma semántica que purgarEfectosTemporales para `modificadores`:
 * - 'ocaso': decrementa `turnosRestantes` (si lo hay) y purga las que llegan a 0 o expiran en 'ocaso'.
 * - 'alba-dueño': purga las del jugador cuyo Alba es (si se indica) con expira 'alba-dueño'.
 * Aplica a las reglas temporales y a los cambios de atributo.
 */
export function purgarReglasTemporales(s: GameState, expira: ExpiraModificador, jugador?: PlayerId): void {
  if (s.reglasTemporales?.length) {
    const quedan = sinVencidas(s.reglasTemporales, expira, jugador)
    if (quedan.length === 0) delete s.reglasTemporales
    else s.reglasTemporales = quedan
  }
  if (s.cambiosAtributo?.length) {
    const quedan = sinVencidas(s.cambiosAtributo, expira, jugador)
    if (quedan.length === 0) delete s.cambiosAtributo
    else s.cambiosAtributo = quedan
  }
}

/** Al ENTRAR `fase` con `turno` en curso: purga las de duración 'hasta_fase' que vencen ahí. */
export function purgarReglasHastaFase(s: GameState, fase: 'alba' | 'forja' | 'choque' | 'ocaso', turno: PlayerId): void {
  const vence = (r: Caducable) => r.expira === 'hasta-fase' && r.expiraFase === fase && r.expiraFaseJugador === turno
  if (s.reglasTemporales?.length) {
    const quedan = s.reglasTemporales.filter((r) => !vence(r))
    if (quedan.length === 0) delete s.reglasTemporales
    else if (quedan.length !== s.reglasTemporales.length) s.reglasTemporales = quedan
  }
  if (s.cambiosAtributo?.length) {
    const quedan = s.cambiosAtributo.filter((r) => !vence(r))
    if (quedan.length === 0) delete s.cambiosAtributo
    else if (quedan.length !== s.cambiosAtributo.length) s.cambiosAtributo = quedan
  }
}
