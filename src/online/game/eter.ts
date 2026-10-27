/**
 * Éter por fuente (Fase 2 — modelo de éter bloqueado).
 *
 * Módulo HOJA: solo importa types/cards — sin ciclos con effectInterpreter /
 * replacements / effectRegistry (ellos importan ESTE; el ciclo que obligó a
 * triplicar la lógica de fin de steal en sesiones anteriores queda cerrado).
 *
 * MODELO (decisión 2026-10-22): la filiación del Éter bloqueado vive en la
 * INSTANCIA del Éter, no en el array del soporte:
 *   - bloqueadoPorEfecto: `${fuenteInstanceId}#${indiceEfecto}` — qué efecto
 *     lo bloqueó. Permite límites contra la FUENTE (b), umbrales/tramos por
 *     fuente (e) y release SELECTIVO del reagrupar por efecto (d).
 *   - pagadoPor: quién lo pagó — la liberación se la devuelve a ÉL (§7.8),
 *     reemplazando las heurísticas stolenBy/owner/ladrón.
 * `eterBloqueado: string[]` queda intacto → UI, invariantes y contract
 * snapshot no cambian.
 *
 * FALLBACK: un Éter SIN tag (estado armado a mano en tests / serie previa)
 * cuenta como propio de CUALQUIER fuente y se libera al pagador implícito
 * que indique el caller — la suite pre-existente queda verde.
 *
 * LÍMITE DOCUMENTADO: los flags card-level (efectoUmbralDisparado,
 * tramosDisparados, copyOneShotDisparado) se limpian cuando la carta queda
 * SIN Éter (total == 0). Si alguna carta declara 2+ efectos con
 * costo-bloqueo, esos flags tendrán que hacerse por efecto — ninguna carta
 * de la colección (FB/DS) lo declara hoy.
 */
import { getCardMeta } from './cards'
import type { EfectoData } from '../../shared/types'
import type { Ctx, GameState, PlayerId } from './types'

/** Clave de filiación efecto → `${fuenteInstanceId}#${indiceEnEfectos}`. */
export function claveEfecto(fuenteId: string, indiceEfecto: number): string {
  return `${fuenteId}#${indiceEfecto}`
}

/**
 * Clave del Éter EXTERNO: bloqueado sobre un Campeón por un efecto que NO es
 * suyo (hoy solo el Pasivo 1A de FB-005/DS-006 vía elegir_opcion). `#ext` nunca
 * colisiona con `claveEfecto` porque el índice siempre es numérico.
 */
export function claveExterno(fuenteId: string): string {
  return `${fuenteId}#ext`
}

/**
 * Etiqueta los Éteres EXTERNOS recién bloqueados sobre `fuenteId` (el Campeón).
 * Conserva `pagadoPor` (§7.8: la liberación se la devuelve a quien lo pagó).
 */
export function etiquetarEterExterno(s: GameState, eterIds: string[], fuenteId: string, pagador: PlayerId): void {
  for (const id of eterIds) {
    const inst = s.instances[id]
    if (!inst) continue
    inst.bloqueadoPorEfecto = claveExterno(fuenteId)
    inst.pagadoPor = pagador
  }
}

/**
 * Etiqueta los Éteres recién bloqueados con su fuente/efecto y pagador.
 * `indiceEfecto < 0` (carta sin efecto fuente) → solo se registra pagadoPor.
 */
export function etiquetarEter(
  s: GameState,
  eterIds: string[],
  fuenteId: string,
  indiceEfecto: number,
  pagador: PlayerId,
): void {
  for (const id of eterIds) {
    const inst = s.instances[id]
    if (!inst) continue
    if (indiceEfecto >= 0) inst.bloqueadoPorEfecto = claveEfecto(fuenteId, indiceEfecto)
    inst.pagadoPor = pagador
  }
}

/**
 * Éteres bloqueados en `cardInstanceId` que pertenecen al efecto `indiceEfecto`.
 * Sin tag cuenta como propio (fallback de compatibilidad).
 */
export function eterDeEfecto(s: GameState, cardInstanceId: string, indiceEfecto: number): string[] {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado?.length) return []
  const clave = claveEfecto(cardInstanceId, indiceEfecto)
  return inst.eterBloqueado.filter((id) => {
    const tag = s.instances[id]?.bloqueadoPorEfecto
    return tag === undefined || tag === clave
  })
}

/** Éteres bloqueados en `cardInstanceId` que son EXTERNOS (`#ext`, ajenos a todo efecto de la carta). */
export function eterExternoDe(s: GameState, cardInstanceId: string): string[] {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado?.length) return []
  const clave = claveExterno(cardInstanceId)
  return inst.eterBloqueado.filter((id) => s.instances[id]?.bloqueadoPorEfecto === clave)
}

/**
 * Éter que cuenta para UMBRALES / tramos / sostenidos de `indiceEfecto`:
 * PROPIO ∪ EXTERNO (decisión 2.3). NO incluye el Éter etiquetado a otra
 * fuente (ni a otro efecto de la misma carta).
 */
export function eterQueCuenta(s: GameState, cardInstanceId: string, indiceEfecto: number): string[] {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado?.length) return []
  const clave = claveEfecto(cardInstanceId, indiceEfecto)
  const claveExt = claveExterno(cardInstanceId)
  return inst.eterBloqueado.filter((id) => {
    const tag = s.instances[id]?.bloqueadoPorEfecto
    return tag === undefined || tag === clave || tag === claveExt
  })
}

/**
 * Cuántos Éter cuentan para el UMBRAL de un efecto. `eter_bloqueado` ("hasta N")
 * suma externos (eterQueCuenta). `bloqueo_fijo` NO: un externo no completa un
 * bloqueo fijo (decisión 2.4) → solo propio (eterDeEfecto). Sin costo → propio.
 */
export function contarEterUmbral(s: GameState, cardInstanceId: string, indiceEfecto: number, efecto: Pick<EfectoData, 'costo'>): number {
  return efecto.costo?.tipo === 'eter_bloqueado'
    ? eterQueCuenta(s, cardInstanceId, indiceEfecto).length
    : eterDeEfecto(s, cardInstanceId, indiceEfecto).length
}

/** Quita SOLO `ids` del array de Éter bloqueado de la fuente (release selectivo). */
export function quitarEteres(s: GameState, fuenteId: string, ids: string[]): void {
  const inst = s.instances[fuenteId]
  if (!inst?.eterBloqueado) return
  const quedan = inst.eterBloqueado.filter((id) => !ids.includes(id))
  if (quedan.length > 0) inst.eterBloqueado = quedan
  else delete inst.eterBloqueado
}

/**
 * Libera éter AGRUPANDO POR PAGADOR: cada pagador recibe los suyos en su
 * zona destino ('1A' su Éter Pagado / '2A' su Reserva) y se limpia la
 * filiación. `fallbackPagador` para éter sin tag. NO emite eventos (el
 * caller decide: moverAlCementerio es silencioso por diseño, §7.7).
 */
export function liberarEterA(
  s: GameState,
  eteres: string[],
  destino: '1A' | '2A',
  fallbackPagador: PlayerId,
): Partial<Record<PlayerId, string[]>> {
  const grupos: Partial<Record<PlayerId, string[]>> = {}
  for (const id of eteres) {
    const j = s.instances[id]?.pagadoPor ?? fallbackPagador
    ;(grupos[j] ??= []).push(id)
  }
  for (const [jugador, ids] of Object.entries(grupos) as [PlayerId, string[]][]) {
    for (const id of ids) {
      const e = s.instances[id]
      if (e) {
        delete e.bloqueadoPorEfecto
        delete e.pagadoPor
      }
    }
    const p = s.players[jugador]
    if (destino === '2A') p.eterReserva.push(...ids)
    else p.eterPagado.push(...ids)
  }
  return grupos
}

/**
 * Limpia el estado derivado de umbrales/copy/tramos de una fuente. Solo
 * cuando la carta queda SIN Éter (ver LÍMITE DOCUMENTADO arriba).
 */
export function limpiarFlagsUmbralSiVacia(s: GameState, fuenteId: string): void {
  const inst = s.instances[fuenteId]
  if (!inst || (inst.eterBloqueado?.length ?? 0) > 0) return
  delete inst.efectoUmbralDisparado
  delete inst.copyOneShotDisparado
  delete inst.tramosDisparados
  delete inst.fijadoExhaustTargetId
  delete inst.sostenidos
  delete inst.efectosUmbralDisparados
}

/**
 * Fin de steal 'mientras_ester_bloqueado' (Fase 2 (d)): la duración termina
 * cuando la fuente queda SIN Éter — ≥1 Éter de CUALQUIER fuente la sostiene.
 * ÚNICO dueño de esta regla (antes estaba inline ×3: replacements,
 * effectRegistry —que ni devolvía el éter del ladrón—, effectInterpreter).
 */
export function evaluarFinSteal(s: GameState, ctx: Ctx, fuenteId: string): void {
  const inst = s.instances[fuenteId]
  if (!inst?.cardId) return
  if ((inst.eterBloqueado?.length ?? 0) > 0) return
  const meta = getCardMeta(inst.cardId)
  const stealEfecto = meta && 'efectos' in meta
    ? meta.efectos?.find((e) => e.efecto === 'steal_champion' && e.duracion === 'mientras_ester_bloqueado')
    : undefined
  if (!stealEfecto) return
  retornarCampeonesRobados(s, ctx, fuenteId, inst.owner)
}

/**
 * Termina un steal 'mientras_ester_bloqueado': campeones con stolenBy=fuente.
 * - Siguen en el campo del ladrón:
 *   - Rival (dueño original) con slot libre → regresa a ese slot.
 *   - Rival lleno → SE QUEDA controlado (stolenBy se limpia).
 * - Ya fuera del campo del ladrón: solo limpia stolenBy.
 *
 * §7.8: al perder el control, el Éter bloqueado en el Campeón robado se
 * libera POR PAGADOR (el del dueño original ya se reagrupó al robar; el que
 * quede es del ladrón) → liberarEterA con fallback = ladrón.
 */
export function retornarCampeonesRobados(
  s: GameState,
  ctx: Ctx,
  fuenteId: string,
  ladron: PlayerId,
): void {
  for (const other of Object.values(s.instances)) {
    if (other.stolenBy !== fuenteId) continue
    const enCampoLadron = s.players[ladron].campo.campeones.includes(other.cardInstanceId)
    if (!enCampoLadron) {
      // Salió del campo del ladrón: ya no hay control que devolver
      delete other.stolenBy
      continue
    }
    // Dueño original del campeón robado (other.owner se conservó al robar)
    const duenoOriginal = other.owner
    const campoOriginal = s.players[duenoOriginal].campo.campeones
    const slotLibre = campoOriginal.indexOf(null)
    if (slotLibre !== -1 && duenoOriginal !== ladron) {
      if (other.eterBloqueado && other.eterBloqueado.length > 0) {
        const eteres = [...other.eterBloqueado]
        delete other.eterBloqueado
        delete other.efectoUmbralDisparado
        delete other.copyOneShotDisparado
        delete other.tramosDisparados
        delete other.fijadoExhaustTargetId
        delete other.sostenidos
        delete other.efectosUmbralDisparados
        const grupos = liberarEterA(s, eteres, '2A', ladron)
        for (const [jugador, ids] of Object.entries(grupos) as [PlayerId, string[]][]) {
          ctx.emit({ type: 'eter_reagrupado', jugador, eterIds: ids })
        }
      }
      const idxLadron = s.players[ladron].campo.campeones.indexOf(other.cardInstanceId)
      if (idxLadron !== -1) s.players[ladron].campo.campeones[idxLadron] = null
      campoOriginal[slotLibre] = other.cardInstanceId
      delete other.stolenBy
      ctx.emit({
        type: 'carta_entrada_a_zona',
        cardInstanceId: other.cardInstanceId,
        zona: `2${String.fromCharCode(66 + slotLibre)}` as '2B' | '2C' | '2D' | '2E' | '2F',
        jugador: duenoOriginal,
        bocaArriba: true,
      })
    } else {
      // Campo rival lleno (o edge case): el control persiste en el campo del ladrón
      delete other.stolenBy
    }
  }
}
