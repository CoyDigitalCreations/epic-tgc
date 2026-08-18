/**
 * Handlers de SOPORTE (ADR-26) — C5 (change 4, mazo 45): MECÁNICA TUTOR
 * (D1 interactivo): la carta al activarse ARMA un pendiente de
 * `elegir_objetivo` con las cartas del propio mazo que cumplen el filtro;
 * la resolución re-despacha el MISMO trigger con `contextoUso:
 * 'objetivo-elegido'` + objetivoId y el handler mueve mazo → mano del
 * payload.jugador emitiendo `carta_robada`.
 *
 * - FB-031 / DS-031 (al-ser-enviado-al-cementerio): Campeón de coste ≤ 2.
 * - FB-032 (al-jugar-mistica): carta de coste ≤ 2.
 * - DS-033 (al-jugar-mistica): Campeón sin límite de coste.
 * - DS-032 (al-inicio-choque): condición 2+ Campeones propios con Éter
 *   bloqueado → carta de coste ≤ 3.
 *
 * El trigger al-ser-enviado-al-cementerio llega desde la primitiva
 * `enviarAlCementerio` (replacements.ts), que cubre los 6 puntos de entrada:
 * destrucción, resolución de cadena 9.6, descarte de Ocaso, sacrificio
 * Soberano/Emperador, auto-sacrificio Transmutar y efectos que descartan
 * (DS-004).
 */
import { esCampeon, getCardMeta } from '../cards'
import { registrarEfecto, type PayloadEfecto } from '../efectos'
import { enviarAlCementerio } from '../replacements'
import type { Ctx, GameState, PlayerId } from '../types'

/** Coste del meta de una instancia (toda carta tiene stats.cost). */
function costeDe(s: GameState, id: string): number | null {
  const cardId = s.instances[id]?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  return meta?.stats?.cost ?? null
}

/** true si la instancia es un Campeón. */
function esCampeonInst(s: GameState, id: string): boolean {
  const cardId = s.instances[id]?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  return meta !== null && esCampeon(meta)
}

/** Arma un pendiente FIFO de elegir_objetivo si hay opciones (patrón D1, campeones.ts). */
function armarPendiente(s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

/** Fase 2 (resolución): mazo → mano del payload.jugador + evento carta_robada. */
function resolverTutor(s: GameState, ctx: Ctx, payload: PayloadEfecto): void {
  const objetivoId = payload.objetivoId
  if (!objetivoId) return
  const p = s.players[payload.jugador]
  const idx = p.mazo.indexOf(objetivoId)
  if (idx === -1) return // defensivo: opciones ya filtradas
  p.mazo.splice(idx, 1)
  p.mano.push(objetivoId)
  ctx.emit({ type: 'carta_robada', jugador: payload.jugador, cardInstanceId: objetivoId })
}

export function registrarEfectosSoporte(): void {
  // FB-031 / DS-031: "Al ser enviada al Cementerio desde cualquier zona:
  // agrega de tu mazo a tu mano 1 carta Campeón de coste 2 o menos."
  const tutorCampeonBarato = (cardId: string) => {
    registrarEfecto('al-ser-enviado-al-cementerio', cardId, (s, ctx, inst, payload) => {
      if (payload.contextoUso === 'objetivo-elegido') {
        resolverTutor(s, ctx, payload)
        return
      }
      const opciones = s.players[payload.jugador].mazo.filter(
        (id) => esCampeonInst(s, id) && (costeDe(s, id) ?? 99) <= 2,
      )
      armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-ser-enviado-al-cementerio', opciones)
    })
  }
  tutorCampeonBarato('FB-031')
  tutorCampeonBarato('DS-031')

  // FB-032 (Mística): "Agrega de tu mazo a tu mano 1 carta de coste 2 o menos."
  registrarEfecto('al-jugar-mistica', 'FB-032', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      resolverTutor(s, ctx, payload)
      return
    }
    const opciones = s.players[payload.jugador].mazo.filter((id) => (costeDe(s, id) ?? 99) <= 2)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // DS-033 (Mística): "Agrega de tu mazo a tu mano 1 carta Campeón."
  registrarEfecto('al-jugar-mistica', 'DS-033', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      resolverTutor(s, ctx, payload)
      return
    }
    const opciones = s.players[payload.jugador].mazo.filter((id) => esCampeonInst(s, id))
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })

  // DS-032 (Arcana): "Al inicio de tu Choque, si controlas 2 o más Campeones
  // con Éter bloqueado: agrega de tu mazo a tu mano 1 carta de coste 3 o menos."
  registrarEfecto('al-inicio-choque', 'DS-032', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      resolverTutor(s, ctx, payload)
      return
    }
    const conEter = s.players[payload.jugador].campo.campeones.filter(
      (id) => id !== null && (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1,
    ).length
    if (conEter < 2) return
    const opciones = s.players[payload.jugador].mazo.filter((id) => (costeDe(s, id) ?? 99) <= 3)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-inicio-choque', opciones)
  })
}
