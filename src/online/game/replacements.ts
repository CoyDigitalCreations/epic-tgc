/**
 * Reemplazos de Campeones y Éter (ADR-17).
 *
 * Centraliza la DESTRUCCIÓN (ADR-15): `destruirCarta(s, ctx, id, causa)`
 * consulta keywords según causa (Inmortal→'efecto', Indestructible→'combate',
 * L1209-1210), hooks de reemplazo anti-destrucción (registro VACÍO en este
 * change; Rowena FB-018 / Último Refugio FB-022 se registran en change 3) y
 * el sexto Vínculo (ADR-16, flag anti-bucle) ANTES de `verificarDerrotaVinculos`.
 * El SACRIFICIO no pasa por destruirCarta (no es evitable): usa los helpers
 * compartidos `moverAlCementerio` + `liberarEterBloqueado('2A')`.
 */
import { esCampeon, esVinculo, getCardMeta } from './cards'
import type { CausaDestruccion, Ctx, GameState, PlayerId } from './types'

/** Registro de reemplazos anti-destrucción (ADR-15): vacío consultable. */
const reemplazos = new Map<string, (s: GameState, ctx: Ctx, cardInstanceId: string, causa: CausaDestruccion) => boolean>()

/**
 * Registra un reemplazo anti-destrucción para un cardId (change 3: Rowena,
 * Último Refugio). El handler devuelve true si REEMPLAZÓ la destrucción
 * (la carta no se destruye y se emite destruccion_prevenida).
 */
export function registrarReemplazo(cardId: string, fn: (s: GameState, ctx: Ctx, cardInstanceId: string, causa: CausaDestruccion) => boolean): void {
  reemplazos.set(cardId, fn)
}

/** Consulta pública del registro (API de change 3; vacío hoy). */
export function reemplazosRegistrados(): { cardId: string }[] {
  return [...reemplazos.keys()].map((cardId) => ({ cardId }))
}

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
  const p = s.players[inst.owner]
  if (!p.cementerio.includes(cardInstanceId)) p.cementerio.push(cardInstanceId)
}

/**
 * Libera el Éter bloqueado de una instancia que SALE del campo (ADR-17).
 *
 * Destino:
 * - '2A' — sacrificio de Soberano/Emperador: el Éter vuelve a la Reserva
 *   INMEDIATO (glosario L1351-1352; manual 7.2 L937). Fix del gap #1223:
 *   antes el Éter quedaba atascado en la instancia que iba a 2G.
 * - '1A' — muerte en combate (C3): el Éter vuelve a Éter Pagado y se
 *   reagrupa en el próximo Alba (ADR-14), silencioso.
 *
 * Es silencioso: no emite eventos; el reagrupado del 1A lo cubre
 * `eter_reagrupado` en el Alba.
 */
export function liberarEterBloqueado(s: GameState, _ctx: Ctx, cardInstanceId: string, destino: '1A' | '2A'): void {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) return
  const eteres = inst.eterBloqueado
  delete inst.eterBloqueado
  const p = s.players[inst.owner]
  if (destino === '2A') {
    p.eterReserva.push(...eteres)
  } else {
    p.eterPagado.push(...eteres)
  }
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
 * Destrucción centralizada (ADR-15): Campeón → 2G + Éter 1A + carta_muerta +
 * destruccion; Vínculo → bocaArriba=true (permanece en su slot, L848) + solo
 * destruccion. Prevenido (keywords según causa o reemplazo registrado) →
 * SOLO destruccion_prevenida, sin movimiento.
 * @returns true si la carta se destruyó; false si se previno (keyword/reemplazo)
 * o la instancia no existe. Aditivo (C3 D5): los callers actuales ignoran el
 * retorno; al-matar-en-combate lo usa para confirmar la muerte.
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

  // (b) Hooks de reemplazo anti-destrucción (registro vacío en este change)
  const fn = cardId ? reemplazos.get(cardId) : undefined
  if (fn && fn(s, ctx, cardInstanceId, causa)) {
    ctx.emit({ type: 'destruccion_prevenida', cardInstanceId, jugador: inst.owner, causa })
    return false
  }

  if (esVinculoCard) {
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
    ctx.emit({ type: 'destruccion', cardInstanceId, jugador: inst.owner, causa })
    verificarDerrotaVinculos(s, ctx, inst.owner)
    return true
  }

  // Campeón: → 2G + Éter 1A + carta_muerta + destruccion (ADR-14)
  moverAlCementerio(s, cardInstanceId)
  liberarEterBloqueado(s, ctx, cardInstanceId, '1A')
  ctx.emit({ type: 'carta_muerta', cardInstanceId, jugador: inst.owner, causa })
  ctx.emit({ type: 'destruccion', cardInstanceId, jugador: inst.owner, causa })
  return true
}
