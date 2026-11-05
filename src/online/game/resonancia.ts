/**
 * Lote 3 (Estásis) — efecto `activar_disparo` («Activa un efecto Disparo de otro Campeón que controles», Aurora: Resonancia).
 *
 * Reglas (decisiones del Lote 3):
 *  - El Disparo que se activa es el MISMO que `activar_habilidad` activaría en ese Campeón: el primero sin trigger.
 *    Un Disparo que a su vez es `activar_disparo` no se puede copiar (corta cualquier cadena de Resonancias).
 *  - Resonancia COMPRUEBA y CONSUME el «una vez por turno» del Disparo copiado (decisión del usuario): si el Campeón ya lo
 *    gastó este turno, no se activa; si se activa, el Campeón ya no podrá usarlo por su cuenta ese turno. Así no hay bucle.
 *  - `sinPagarCosto`: no se cobra el coste del Disparo. Sin esa opción se cobra como una activación normal.
 *  - `sinAgotar`: el Campeón copiado no se agota. Sin esa opción debe estar enderezado y se agota (salvo regla `disparoAgota`).
 *  - La activación resuelve en seguida, dentro de la resolución de la habilidad que la provoca (no abre otra ventana).
 */
import { esCampeon, esCostoBloqueo } from './cards'
import { metaDeInstancia } from './efectosInstancia'
import { efectosNegados, reglaBool } from './reglas'
import { eterIdsParaHabilidad, habilidadUsadaEsteTurno, pagarHabilidad } from './habilidadPago'
import { interpretEffect, objetivoCompleto } from './effectInterpreter'
import { resolveTargets } from './targetResolver'
import type { EfectoData } from '../../shared/types'
import type { Ctx, GameState, PlayerId } from './types'

/** El Disparo activable de un Campeón (índice en sus `efectos[]`), o null si no tiene ninguno copiable. */
export function disparoActivableDe(s: GameState, id: string): { efecto: EfectoData; idx: number } | null {
  const meta = metaDeInstancia(s, id)
  if (!s.instances[id] || !meta || !esCampeon(meta) || !('efectos' in meta) || !meta.efectos) return null
  if (efectosNegados(s, id)) return null
  const idx = meta.efectos.findIndex((e) => e.tipo === 'disparo' && !!e.efecto && (!e.trigger || e.trigger === 'ninguno'))
  if (idx === -1) return null
  const efecto = meta.efectos[idx]
  if (efecto.efecto === 'activar_disparo') return null
  return { efecto, idx }
}

/**
 * ¿Se puede activar AHORA el Disparo `d` del Campeón `tid` con este `activar_disparo`? Su «una vez por turno» no debe estar
 * gastado, el Campeón debe estar enderezado si la activación lo agota (sin `sinAgotar`) y, si hay que pagar su coste
 * (sin `sinPagarCosto`), `jugador` debe poder cubrirlo.
 */
function sePuedeActivar(s: GameState, jugador: PlayerId, tid: string, d: { efecto: EfectoData; idx: number }, efectoData: EfectoData): boolean {
  const tinst = s.instances[tid]
  if (!tinst) return false
  if (esCostoBloqueo(d.efecto.costo) ? tinst.opcionUsadaEsteTurno : habilidadUsadaEsteTurno(s, tid, d.efecto)) return false
  if (efectoData.sinAgotar !== true && tinst.agotado) return false
  if (efectoData.sinPagarCosto !== true && eterIdsParaHabilidad(s, jugador, d.efecto) === null) return false
  return true
}

/**
 * Campeones que `activar_disparo` puede elegir: los del objetivo del efecto (Aurora: otro Campeón propio) con un Disparo
 * copiable que se pueda activar ahora. Sin ninguno, Resonancia ni se ofrece (no se paga en balde).
 */
export function candidatosActivarDisparo(s: GameState, jugador: PlayerId, fuenteId: string, efectoData: EfectoData): string[] {
  if (!efectoData.objetivo) return []
  return resolveTargets(s, objetivoCompleto(efectoData), jugador, fuenteId).filter((id) => {
    const d = disparoActivableDe(s, id)
    return d !== null && sePuedeActivar(s, jugador, id, d, efectoData)
  })
}

/** Ejecuta `activar_disparo` sobre el primer Campeón de `targetIds` (ya elegido). Si no se cumple algo, no pasa nada (el coste de Resonancia ya se pagó). */
export function ejecutarActivarDisparo(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
  efectoData: EfectoData,
): void {
  const tid = targetIds[0]
  const d = tid ? disparoActivableDe(s, tid) : null
  const tinst = tid ? s.instances[tid] : undefined
  if (!tid || !d || !tinst) return
  const sinPagar = efectoData.sinPagarCosto === true
  const sinAgotar = efectoData.sinAgotar === true
  const bloqueo = esCostoBloqueo(d.efecto.costo)

  // 1. Comprobaciones (sin mutar nada): su «una vez por turno», que esté enderezado y que se pueda pagar
  if (!sePuedeActivar(s, jugador, tid, d, efectoData)) return
  const eterIds: string[] = sinPagar ? [] : (eterIdsParaHabilidad(s, jugador, d.efecto) ?? [])

  // 2. Coste, «una vez por turno» y agotamiento
  if (!sinPagar) {
    const agotadoAntes = tinst.agotado
    pagarHabilidad(s, ctx, jugador, tid, d.efecto, eterIds)
    if (sinAgotar) { // pagó, pero esta activación no lo agota
      if (agotadoAntes === undefined) delete tinst.agotado
      else tinst.agotado = agotadoAntes
    }
  } else {
    if (bloqueo) tinst.opcionUsadaEsteTurno = true
    else if (d.efecto.activacion === 'una_por_turno' && !(tinst.efectosUsadosEsteTurno ?? []).includes(d.idx)) {
      tinst.efectosUsadosEsteTurno = [...(tinst.efectosUsadosEsteTurno ?? []), d.idx]
    }
    if (!sinAgotar && reglaBool(s, 'disparoAgota', { instId: tid })) tinst.agotado = true
  }

  // 3. El Disparo resuelve como si lo hubiera activado su Campeón (coste ya tratado arriba)
  interpretEffect(s, ctx, tinst, d.efecto, { jugador, costoPagado: true })
}
