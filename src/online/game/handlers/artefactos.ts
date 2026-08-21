/**
 * Handlers de ARTEFACTOS (keyword ARTEFACTO en Místicas):
 * Cuando se juegan, arman un pendiente de `elegir_objetivo` con los
 * Campeones propios en campo. Al resolver, equipan la carta al campeón
 * seleccionado y registran un aura de campo que aplica el efecto continuo.
 *
 * Cartas:
 * - FB-021 Marcha de las Primeras: +1 ATQ al campeón equipado
 * - FB-022 Último Refugio: el campeón equipado puede invocar del cementerio
 * - DS-021 El Nudo Aprieta: +1 ATQ al equipado
 * - DS-022 Maldición del Sur: +1 ATQ al equipado
 */
import { getCardMeta, esCampeon } from '../cards'
import { registrarEfecto, registrarAuraCampo } from '../efectos'
import type { GameState, PlayerId } from '../types'

/** Arma un pendiente FIFO de elegir_objetivo si hay opciones (patrón D1). */
function armarPendiente(s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

/** Campeones propios en campo. */
function campeonesPropios(s: GameState, jugador: PlayerId): string[] {
  return s.players[jugador].campo.campeones.filter((id): id is string => id !== null)
}

/** Champions en cementerio del jugador con coste ≤3. */
function campeonesEnCementerio(s: GameState, jugador: PlayerId): string[] {
  return s.players[jugador].cementerio.filter((id): id is string => {
    const inst = s.instances[id]
    const cardId = inst?.cardId
    if (!cardId) return false
    const meta = getCardMeta(cardId)
    if (!meta || !esCampeon(meta)) return false
    return (meta.stats.cost ?? 99) <= 3
  })
}

export function registrarEfectosArtefactos(): void {
  // ─── FB-021 Marcha de las Primeras ───
  registrarEfecto('al-jugar-mistica', 'FB-021', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', campeonesPropios(s, payload.jugador))
  })

  registrarAuraCampo('FB-021', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })

  // ─── FB-022 Último Refugio ───
  // Equipar: al jugar la Mística
  registrarEfecto('al-jugar-mistica', 'FB-022', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', campeonesPropios(s, payload.jugador))
  })

  // Habilidad activa: invocar del cementerio (se dispara cuando el campeón equipado activa)
  registrarEfecto('al-activar-habilidad', 'FB-022', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      // Invocar el campeón seleccionado del cementerio → campo
      const objetivoId = payload.objetivoId
      if (!objetivoId) return
      const p = s.players[payload.jugador]
      const idx = p.cementerio.indexOf(objetivoId)
      if (idx === -1) return
      const slotLibre = p.campo.campeones.indexOf(null)
      if (slotLibre === -1) return
      // Mover del cementerio al campo (sin pagar éter)
      p.cementerio.splice(idx, 1)
      p.campo.campeones[slotLibre] = objetivoId
      // Invocación cansada: agotado + entradaEsteTurno
      s.instances[objetivoId].agotado = true
      s.instances[objetivoId].entradaEsteTurno = true
      ctx.emit({ type: 'carta_invocada', cardInstanceId: objetivoId, tipo: 'Campeón', slot: slotLibre })
      return
    }
    // Armar pendiente con campeones del cementerio (coste ≤3)
    const opciones = campeonesEnCementerio(s, payload.jugador)
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-activar-habilidad', opciones)
  })

  // ─── DS-021 El Nudo Aprieta ───
  registrarEfecto('al-jugar-mistica', 'DS-021', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', campeonesPropios(s, payload.jugador))
  })

  registrarAuraCampo('DS-021', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })

  // ─── DS-022 Maldición del Sur ───
  registrarEfecto('al-jugar-mistica', 'DS-022', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const artefacto = s.instances[inst.cardInstanceId]
      if (artefacto) artefacto.equipadoA = payload.objetivoId
      return
    }
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', campeonesPropios(s, payload.jugador))
  })

  registrarAuraCampo('DS-022', (s, fuente, objetivo) => {
    const inst = s.instances[fuente]
    if (!inst?.equipadoA || inst.equipadoA !== objetivo) return null
    return { atq: 1 }
  })
}
