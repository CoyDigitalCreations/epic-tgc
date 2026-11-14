/**
 * Observadores de jugadas (Purga): «cuando juegues / el rival juegue una Mística» y «cuando actives / el rival active una Arcana».
 *
 * Las cartas en juego de AMBOS jugadores los observan (Arcanas con trigger como Registro del Tribunal o Reflejo del Cambio; el filtro
 * propio/rival vive en `triggersQueMatchean`, con `victimaId` = la carta jugada y `controladorVictima` = quien la jugó). Además el
 * efecto de COMANDANTE con ese trigger (Idris: «cuando juegues una Mística, tus Campeones ganan 1 de ATQ») reacciona cuando juega
 * SU controlador: no es un aura permanente sino un evento (efectos.ts `esComandanteConTrigger`).
 *
 * Son inmediatos (no se apilan), como los demás triggers de observación (`cuando-campeon-al-cementerio`).
 */
import { efectosComandante } from '../../shared/efectoComandante'
import { getCardMeta } from './cards'
import { dispararTrigger, instanciasEnCampo } from './efectos'
import { ejecutarComandanteConTrigger } from './effectInterpreter'
import type { Ctx, GameState, PlayerId } from './types'

type TriggerJugada = 'cuando-juegas-mistica' | 'cuando-activas-arcana'

const JSON_DE: Record<TriggerJugada, string> = {
  'cuando-juegas-mistica': 'cuando_juegas_mistica',
  'cuando-activas-arcana': 'cuando_activas_arcana',
}

/** `jugador` acaba de jugar la Mística / activar la Arcana `cartaId`: avisa a las cartas en juego y al Comandante propio. */
export function dispararObservadoresJugada(s: GameState, ctx: Ctx, trigger: TriggerJugada, jugador: PlayerId, cartaId: string): void {
  const orden: PlayerId[] = s.turno === 'A' ? ['A', 'B'] : ['B', 'A']
  for (const j of orden) {
    dispararTrigger(s, ctx, trigger, j, instanciasEnCampo(s, j), { victimaId: cartaId, controladorVictima: jugador })
  }
  // El Comandante reacciona solo a lo que hace su controlador (los efectos de Comandante son inmutables y de su facción, §10)
  for (const id of s.players[jugador].campo.campeones) {
    const inst = id ? s.instances[id] : undefined
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!id || !inst || !meta || meta.type !== 'Campeón') continue
    for (const efecto of efectosComandante(meta.efectoComandante)) {
      if (efecto.trigger === JSON_DE[trigger] && efecto.controladorTrigger !== 'rival') ejecutarComandanteConTrigger(s, ctx, inst, efecto, jugador)
    }
  }
}
