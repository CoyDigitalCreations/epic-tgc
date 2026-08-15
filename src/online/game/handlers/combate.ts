/**
 * Handlers de efectos de CARTAS DE COMBATE (3D-3F):
 * FB-024 Filo del Éter Primigenio: "Un Campeón que controle gana +2 de ATQ
 * hasta el final del turno. Si destruye a un Campeón que controla el rival
 * este turno, roba 1 carta."
 *
 * Patrón D7: armado de pendiente → resolución con contextoUso.
 * Requisito de resolución: requiere ≥1 Campeón propio.
 */
import { registrarEfecto, aplicarMod, objetivosCampeonesValidos } from '../efectos'
import { registrarRequisito } from '../effects-guards'
import type { GameState, PlayerId } from '../types'

/** Arma un pendiente FIFO si hay opciones (patrón D1). */
function armarPendiente(s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

export function registrarEfectosCombate(): void {
  // FB-024: "Un Campeón que controle gana +2 de ATQ hasta el final del turno."
  registrarEfecto('al-resolver-cadena', 'FB-024', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      aplicarMod(s, payload.objetivoId!, 'poder', 2, 'ocaso')
      return
    }
    const opciones = objetivosCampeonesValidos(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-resolver-cadena', opciones)
  })

  // Requisito: FB-024 requiere al menos un Campeón propio controlado
  registrarRequisito('FB-024', (s: GameState, jugador: PlayerId) => {
    const opciones = objetivosCampeonesValidos(s, jugador)
    return opciones.length === 0 ? 'Filo del Éter Primigenio requiere un Campeón que controles' : null
  })
}
