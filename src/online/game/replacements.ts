/**
 * Reemplazos de Campeones y Éter (ADR-17).
 *
 * Centraliza la DESTRUCCIÓN (ADR-15): `destruirCarta(s, ctx, id, causa)`
 * consulta keywords según causa (Inmortal→'efecto', Indestructible→'combate',
 * L1209-1210), hooks de reemplazo anti-destrucción (registro vacío — feature
 * no implementada), y el sexto Vínculo (ADR-16, flag anti-bucle) ANTES de
 * `verificarDerrotaVinculos`.
 * El SACRIFICIO no pasa por destruirCarta (no es evitable): usa los helpers
 * compartidos `moverAlCementerio` + `liberarEterBloqueado('2A')`.
 */
import { esCampeon, esVinculo, getCardMeta } from './cards'
import { dispararTrigger } from './efectos'
import type { CausaDestruccion, Ctx, GameState, PlayerId } from './types'

/** Keywords de la instancia (data + override aditivo, patrón combat.ts). */
function keywordsDe(s: GameState, id: string): readonly string[] {
  const inst = s.instances[id]
  const cardId = inst?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  const deData = meta && esCampeon(meta) ? meta.keywords : []
  return [...new Set([...deData, ...(inst?.keywords ?? [])])]
}

/**
 * Mueve una instancia a 2G (cementerio de su dueño). Remueve del grupo de
 * campo donde esté (Campeones/Místicas-Tácticas/Arcanas-Combate); defensivo
 * contra dobles llamadas (no duplica en 2G).
 *
 * C3c (D2): con control prestado (Aurora FB-010) la instancia puede estar en
 * el campo del RIVAL (owner ≠ campo). Se barren AMBOS campos; el destino 2G
 * sigue siendo del DUEÑO (inst.owner).
 */
export function moverAlCementerio(s: GameState, cardInstanceId: string): void {
  const inst = s.instances[cardInstanceId]
  if (!inst) return
  for (const j of ['A', 'B'] as PlayerId[]) {
    const p = s.players[j]
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      const idx = p.campo[grupo].indexOf(cardInstanceId)
      if (idx !== -1) {
        p.campo[grupo][idx] = null
        break
      }
    }
  }
  // Fase 3a: choke point — toda carta que entra a 2G libera su Éter bloqueado
  // (manual §7.7 L912). Los sacrificios ya liberaron a '2A' antes — no-op acá.
  liberarEterBloqueadoCore(s, cardInstanceId, '1A')
  const p = s.players[inst.owner]
  if (!p.cementerio.includes(cardInstanceId)) p.cementerio.push(cardInstanceId)
}

/**
 * Primitiva C5 (change 4): envía una instancia a 2G (cementerio de su dueño)
 * y dispara `al-ser-enviado-al-cementerio` con la carta YA en 2G (glosario
 * L1351). Es la vía ÚNICA de descarte/sacrificio/coste/consumo → 2G con
 * trigger. NO consulta overrides (Inmortal/Indestructible): eso es
 * responsabilidad del caller (destruirCarta lo hace ANTES; el sacrificio y el
 * coste no son evitables por diseño, campeones.test.ts L591).
 */
export function enviarAlCementerio(s: GameState, ctx: Ctx, cardInstanceId: string): void {
  const inst = s.instances[cardInstanceId]
  if (!inst) return
  // VÍNCULO INVERTIDO (invocar_y_equipar): si esta carta tiene un campeón vinculado,
  // destruir también al campeón ANTES de mover esta carta al cementerio.
  if (inst.vinculadoA) {
    const vinculadoId = inst.vinculadoA
    inst.vinculadoA = undefined
    // Solo destruir si el campeón sigue en campo del dueño
    const p = s.players[inst.owner]
    const slotIdx = p.campo.campeones.indexOf(vinculadoId)
    if (slotIdx !== -1) {
      p.campo.campeones[slotIdx] = null
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: vinculadoId, zona: `2${String.fromCharCode(66 + slotIdx)}` as any, jugador: inst.owner })
      enviarAlCementerio(s, ctx, vinculadoId)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: vinculadoId, zona: '2G', jugador: inst.owner, bocaArriba: true })
    }
  }
  // ARTEFACTO: si esta carta es un Campeón, buscar artefactos equipados y enviarlos al cementerio
  if (inst.cardId) {
    const meta = getCardMeta(inst.cardId)
    if (meta && esCampeon(meta)) {
      for (const otherId of Object.keys(s.instances)) {
        const other = s.instances[otherId]
        if (other && other.equipadoA === cardInstanceId) {
          // Artefacto equipado a este campeón → al cementerio
          other.equipadoA = undefined
          moverAlCementerio(s, otherId)
          ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: otherId, zona: '3A', jugador: other.owner })
          ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: otherId, zona: '2G', jugador: other.owner, bocaArriba: true })
        }
      }
    }
  }
  moverAlCementerio(s, cardInstanceId)
  // Fase 3a: carta va a 2G → Éter bloqueado liberado a 1A (reagrupa próximo Alba).
  // No-op si no tiene eterBloqueado (liberarEterBloqueado lo chequea).
  // Los sacrificios ya liberaron a '2A' antes de llegar acá — segundo call es no-op.
  liberarEterBloqueado(s, ctx, cardInstanceId, '1A')
  dispararTrigger(s, ctx, 'al-ser-enviado-al-cementerio', inst.owner, [cardInstanceId])
}

/**
 * Core de liberación de Éter bloqueado (sin ctx — Fase 3a). Mueve el éter de
 * `inst.eterBloqueado` a la zona del dueño. No-op si no hay éter bloqueado.
 */
function liberarEterBloqueadoCore(s: GameState, cardInstanceId: string, destino: '1A' | '2A'): void {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) return
  const eteres = inst.eterBloqueado
  delete inst.eterBloqueado
  // Fase 3a Phase D + 3c: efectos de umbral/copy se desactivan al liberar Éter (§7.7)
  delete inst.efectoUmbralDisparado
  delete inst.copyOneShotDisparado
  const p = s.players[inst.owner]
  if (destino === '2A') {
    p.eterReserva.push(...eteres)
  } else {
    p.eterPagado.push(...eteres)
  }
}

/**
 * Libera el Éter bloqueado de una instancia que SALE del campo (ADR-17 + Fase 3a).
 *
 * Destino:
 * - '2A' — sacrificio de Soberano/Emperador: el Éter vuelve a la Reserva
 *   INMEDIATO (glosario L1351-1352; manual 7.2 L937). Fix del gap #1223:
 *   antes el Éter quedaba atascado en la instancia que iba a 2G.
 * - '1A' — salida del campo (muerte, exilio, return_hand, chain, equipado
 *   destruido): el Éter vuelve a Éter Pagado y se reagrupa en el próximo
 *   Alba (ADR-14), silencioso. Manual §7.7 L912.
 *
 * Es silencioso: no emite eventos; el reagrupado del 1A lo cubre
 * `eter_reagrupado` en el Alba.
 */
export function liberarEterBloqueado(s: GameState, _ctx: Ctx, cardInstanceId: string, destino: '1A' | '2A'): void {
  liberarEterBloqueadoCore(s, cardInstanceId, destino)
}

/**
 * Verifica derrota por Vínculos (5.7/13, reemplaza a PE, L859): si `owner`
 * queda con 0 Vínculos VIVOS (boca abajo) → partida_terminada(ganador=rival,
 * motivo='vinculos'). No-op si la partida ya terminó.
 */
export function verificarDerrotaVinculos(s: GameState, ctx: Ctx, owner: PlayerId): void {
  if (s.fase === 'terminada') return
  const vivos = s.players[owner].vinculos.filter((id): id is string => {
    if (!id) return false
    const inst = s.instances[id]
    return !!inst && !inst.bocaArriba
  }).length
  if (vivos === 0) {
    const ganador: PlayerId = owner === 'A' ? 'B' : 'A'
    s.fase = 'terminada'
    s.ganador = ganador
    s.motivo = 'vinculos'
    ctx.emit({ type: 'partida_terminada', ganador, motivo: 'vinculos' })
  }
}

/**
 * Busca en el campo del `dueno` una fuente elegible para prevent_destroy
 * (Fase 2c — data-driven desde efectos[], sin handlers):
 * efecto 'prevent_destroy' + trigger 'cuando_vinculo_seria_destruido' +
 * costo 'exile_self'. Devuelve la primera en orden de slot (determinista).
 */
export function buscarFuentePreventDestroy(s: GameState, dueno: PlayerId): string | null {
  const p = s.players[dueno]
  for (const fuenteId of p.campo.campeones) {
    if (!fuenteId) continue
    const inst = s.instances[fuenteId]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta || !('efectos' in meta) || !meta.efectos) continue
    const elegible = meta.efectos.some(
      (e) =>
        e.efecto === 'prevent_destroy' &&
        e.trigger === 'cuando_vinculo_seria_destruido' &&
        e.costo?.tipo === 'exile_self',
    )
    if (elegible) return fuenteId
  }
  return null
}

/**
 * Ejecuta la destrucción de un Vínculo (camino diferido y directo comparten
 * esta función): bocaArriba + al-ser-destruido-vinculo + destruccion +
 * verificarDerrotaVinculos. Limpia destruccionPendiente.
 */
function ejecutarDestruccionVinculo(s: GameState, ctx: Ctx, cardInstanceId: string, causa: CausaDestruccion): boolean {
  const inst = s.instances[cardInstanceId]
  if (!inst) return false
  delete inst.destruccionPendiente
  // (c) Sexto Vínculo (ADR-16): la destrucción deja al dueño con 0 Vivos →
  // hook NO-OP (change 3 registra el efecto real) resuelto UNA vez (flag).
  const vivos = s.players[inst.owner].vinculos.filter((id): id is string => {
    if (!id) return false
    const v = s.instances[id]
    return !!v && !v.bocaArriba
  }).length
  if (vivos - 1 <= 0 && !s.sextoVinculoResuelto) {
    s.sextoVinculoResuelto = true
  }
  inst.bocaArriba = true
  // §5.5: al destruirse, activa su efecto PERMANENTE a favor del jugador que recibió el daño
  dispararTrigger(s, ctx, 'al-ser-destruido-vinculo', inst.owner, [cardInstanceId])
  ctx.emit({ type: 'destruccion', cardInstanceId, jugador: inst.owner, causa })
  verificarDerrotaVinculos(s, ctx, inst.owner)
  return true
}

/** Validador responder_prevenicion (Fase 2c — checkpoint): solo el frente de la cola. */
export function validarResponderPrevenicion(state: GameState, jugador: PlayerId): string | null {
  const front = state.preventivosPendientes?.[0]
  if (!front) return 'no hay prevenicion pendiente'
  if (front.jugador !== jugador) return 'no es tu turno de responder la prevenicion'
  return null
}

/**
 * Resuelve el frente de la cola de preveniciones (Fase 2c).
 * - prevenir=true (y la fuente sigue en campo): la fuente se exilia (costo
 *   exile_self), la víctima queda viva, destruccion_prevenida.
 * - prevenir=false (o la fuente ya no está): se ejecuta AHORA la destrucción
 *   diferida (mismo camino que destruirCarta para vínculos).
 */
export function ejecutarResponderPrevenicion(s: GameState, ctx: Ctx, jugador: PlayerId, prevenir: boolean): void {
  const pendientes = s.preventivosPendientes ?? []
  const front = pendientes[0]
  if (!front || front.jugador !== jugador) return
  s.preventivosPendientes = pendientes.slice(1)

  const victim = s.instances[front.victimId]
  const fuenteEnCampo = s.players[jugador].campo.campeones.includes(front.fuenteId)

  if (prevenir && fuenteEnCampo && victim && victim.destruccionPendiente) {
    // Costo exile_self: la fuente sale del campo al exilio (1G)
    const p = s.players[jugador]
    const slot = p.campo.campeones.indexOf(front.fuenteId)
    if (slot !== -1) p.campo.campeones[slot] = null
    if (!p.exilio.includes(front.fuenteId)) p.exilio.push(front.fuenteId)
    ctx.emit({ type: 'carta_exiliada', cardInstanceId: front.fuenteId, jugador })
    // La víctima queda viva
    delete victim.destruccionPendiente
    ctx.emit({ type: 'destruccion_prevenida', cardInstanceId: front.victimId, jugador, causa: front.causa })
    return
  }

  // Declinar (o fuente ya no elegible): ejecutar la destrucción diferida
  if (victim?.destruccionPendiente) {
    ejecutarDestruccionVinculo(s, ctx, front.victimId, front.causa)
  }
}

/**
 * Destrucción centralizada (ADR-15): Campeón → 2G + Éter 1A + carta_muerta +
 * destruccion; Vínculo → bocaArriba=true (permanece en su slot, L848) + solo
 * destruccion. Prevenido (keywords según causa o reemplazo registrado) →
 * SOLO destruccion_prevenida, sin movimiento.
 * Fase 2c: prevent_destroy (FB-018) DIFIERE la muerte del Vínculo hasta
 * responder_prevenicion (checkpoint de elección del controlador).
 * @returns true si la carta se destruyó; false si se previno (keyword/reemplazo),
 * quedó pendiente de prevenión, o la instancia no existe.
 */
export function destruirCarta(s: GameState, ctx: Ctx, cardInstanceId: string, causa: CausaDestruccion): boolean {
  const inst = s.instances[cardInstanceId]
  if (!inst) return false
  const cardId = inst.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  const esCampeonCard = meta !== null && esCampeon(meta)
  const esVinculoCard = meta !== null && esVinculo(meta)

  // (a) Keywords según causa (L1209-1210)
  if (esCampeonCard) {
    const kw = keywordsDe(s, cardInstanceId)
    if ((causa === 'efecto' && kw.includes('Inmortal')) || (causa === 'combate' && kw.includes('Indestructible'))) {
      ctx.emit({ type: 'destruccion_prevenida', cardInstanceId, jugador: inst.owner, causa })
      return false
    }
  }

  // (a2) prevent_destroy (Fase 2c): Vínculo con fuente elegible → muerte DIFERIDA
  // hasta que el controlador responda (checkpoint preventivosPendientes).
  if (esVinculoCard && !inst.destruccionPendiente) {
    const fuente = buscarFuentePreventDestroy(s, inst.owner)
    if (fuente) {
      inst.destruccionPendiente = true
      s.preventivosPendientes = [...(s.preventivosPendientes ?? []), {
        jugador: inst.owner,
        fuenteId: fuente,
        victimId: cardInstanceId,
        causa,
      }]
      ctx.emit({ type: 'prevenicion_pendiente', victimId: cardInstanceId, fuenteId: fuente, jugador: inst.owner, causa })
      return false
    }
  }

  // (b) Hooks de reemplazo anti-destrucción — feature no implementada (registro vacío)

  if (esVinculoCard) {
    return ejecutarDestruccionVinculo(s, ctx, cardInstanceId, causa)
  }

  // Campeón: → 2G + Éter 1A + carta_muerta + destruccion (ADR-14)
  moverAlCementerio(s, cardInstanceId)
  liberarEterBloqueado(s, ctx, cardInstanceId, '1A')
  // C5 (change 4): trigger al-ser-enviado-al-cementerio (carta YA en 2G)
  dispararTrigger(s, ctx, 'al-ser-enviado-al-cementerio', inst.owner, [cardInstanceId])
  ctx.emit({ type: 'carta_muerta', cardInstanceId, jugador: inst.owner, causa })
  ctx.emit({ type: 'destruccion', cardInstanceId, jugador: inst.owner, causa })
  return true
}
