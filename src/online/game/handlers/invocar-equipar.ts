/**
 * Handler genérico para el efecto compuesto invocar_y_equipar.
 *
 * Invoca un Campeón desde una zona (cementerio/exilio/mano/mazo) y equipa
 * esta carta a ese Campeón. Si esta carta se remueve, el Campeón también.
 */
import { getCardMeta, esCampeon } from '../cards'
import { registrarEfectoGenerico } from '../efectos'
import type { Ctx, GameState, PlayerId } from '../types'

/** Agrega un objetivo pendiente a la cola del jugador */
function armarPendiente(s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

/** Busca campeones en una zona específica del jugador */
function campeonesEnZona(s: GameState, jugador: PlayerId, zona: string): string[] {
  const p = s.players[jugador]
  const zonaArray = zona === 'cementerio' ? p.cementerio
    : zona === 'exilio' ? p.exilio
    : zona === 'mano' ? p.mano
    : zona === 'mazo' ? p.mazo
    : []
  return zonaArray.filter((id): id is string => {
    if (!id) return false
    const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
    return !!meta && esCampeon(meta)
  })
}

/** Mueve un campeón desde una zona al campo y lo marca como invocado cansado */
function invocarAlCampo(s: GameState, ctx: Ctx, jugador: PlayerId, campeonId: string): boolean {
  const p = s.players[jugador]
  const zonas: Array<{ arr: string[]; nombre: string }> = [
    { arr: p.cementerio, nombre: 'cementerio' },
    { arr: p.exilio, nombre: 'exilio' },
    { arr: p.mano, nombre: 'mano' },
    { arr: p.mazo, nombre: 'mazo' },
  ]
  for (const { arr } of zonas) {
    const idx = arr.indexOf(campeonId)
    if (idx !== -1) {
      arr.splice(idx, 1)
      const slotLibre = p.campo.campeones.indexOf(null)
      if (slotLibre === -1) return false
      p.campo.campeones[slotLibre] = campeonId
      s.instances[campeonId].agotado = true
      s.instances[campeonId].entradaEsteTurno = true
      ctx.emit({ type: 'carta_invocada', cardInstanceId: campeonId, tipo: 'Campeón', slot: slotLibre })
      return true
    }
  }
  return false
}

/**
 * Registra el handler genérico para invocar_y_equipar.
 * Se llama desde registrarEfectos() al inicio del juego.
 */
export function registrarInvocarEquipar(): void {
  registrarEfectoGenerico('invocar_y_equipar', (s, _ctx, inst, payload) => {
    const cardId = inst.cardId
    if (!cardId) return
    const meta = getCardMeta(cardId)
    if (!meta || !('efectos' in meta)) return

    const efecto = (meta as any).efectos?.find((e: any) => e.efecto === 'invocar_y_equipar')
    if (!efecto) return

    const zonaOrigen = efecto.zonaOrigen ?? 'cementerio'

    // RESOLUCIÓN: el jugador ya eligió el campeón
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivoId = payload.objetivoId
      if (!objetivoId) return
      if (!invocarAlCampo(s, _ctx, payload.jugador, objetivoId)) return
      // Equipar esta carta al campeón invocado
      inst.equipadoA = objetivoId
      // Vincular: si esta carta se remueve, el campeón también
      inst.vinculadoA = objetivoId
      return
    }

    // ARMADO: mostrar opciones de campeones en la zona
    const opciones = campeonesEnZona(s, payload.jugador, zonaOrigen)
    if (opciones.length === 0) return
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-jugar-mistica', opciones)
  })
}
