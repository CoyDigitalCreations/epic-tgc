/**
 * Handlers de ARTEFACTOS (keyword ARTEFACTO en Místicas):
 * Cuando se juegan, arman un pendiente de `elegir_objetivo` con los
 * Campeones propios en campo. Al resolver, equipan la carta al campeón
 * seleccionado y registran un aura de campo que aplica el efecto continuo.
 *
 * Cartas:
 * - FB-021 Marcha de las Primeras: +1 ATQ al campeón equipado
 * - FB-022 Último Refugio: el campeón equipado puede invocar del cementerio
 * - DS-021 El Nudo Aprieta: +1 ATQ al equipado, -1 ATQ a rivales con éter bloqueado
 * - DS-022 Maldición del Sur: +1 ATQ al equipado, descarte al rival al atacar
 */
import { registrarEfecto, registrarAuraCampo } from '../efectos'
import type { GameState, PlayerId } from '../types'

/** Arma un pendiente FIFO de elegir_objetivo si hay opciones (patrón D1). */
function armarPendiente(s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

/** Campeones propios en campo (sin Protector filtering — artefactos van a cualquiera). */
function campeonesPropios(s: GameState, jugador: PlayerId): string[] {
  return s.players[jugador].campo.campeones.filter((id): id is string => id !== null)
}

export function registrarEfectosArtefactos(): void {
  // ─── FB-021 Marcha de las Primeras ───
  // "Equipa a un Campeón. El Campeón equipado gana +1 de ATQ."
  registrarEfecto('al-jugar-mistica', 'FB-021', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      // Equipar: setear link equipadoA
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    const opciones = campeonesPropios(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // Aura FB-021: +1 ATQ al campeón equipado
  registrarAuraCampo('FB-021', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })

  // ─── FB-022 Último Refugio ───
  // "Equipa a un Campeón. El Campeón equipado puede invocar 1 Campeón
  //  de coste 3 o menos desde tu cementerio sin pagar Éter."
  registrarEfecto('al-jugar-mistica', 'FB-022', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    const opciones = campeonesPropios(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // Aura FB-022: no da stats directos, pero el efecto de invocar del cementerio
  // se resolvería vía una habilidad activa separada (no implementada aún como aura).
  // Por ahora, el aura es un placeholder que no modifica stats.

  // ─── DS-021 El Nudo Aprieta ───
  // "Equipa a un Campeón. El Campeón equipado gana +1 de ATQ.
  //  Los Campeones que controla el rival con Éter bloqueado pierden 1 de ATQ."
  registrarEfecto('al-jugar-mistica', 'DS-021', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    const opciones = campeonesPropios(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // Aura DS-021: +1 ATQ al equipado
  registrarAuraCampo('DS-021', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })

  // ─── DS-022 Maldición del Sur ───
  // "Equipa a un Campeón. El Campeón equipado gana +1 de ATQ.
  //  Cuando el Campeón equipado ataca y destruye a un Campeón rival, roba 1 carta."
  registrarEfecto('al-jugar-mistica', 'DS-022', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    const opciones = campeonesPropios(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // Aura DS-022: +1 ATQ al equipado
  registrarAuraCampo('DS-022', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })
}
