/**
 * Redirect (F9d): «cambia el objetivo del efecto que está justo debajo en la pila».
 *
 * Una carta con `redirect` se juega como RESPUESTA (o es un trigger apilado) y elige, al declararse, el NUEVO objetivo
 * como cualquier otra elección. Al resolverse (LIFO) reescribe el objetivo ya guardado de la entrada inmediatamente
 * inferior, que aún no ha resuelto: un trigger (`objetivoId`), una respuesta (`respuestas[id].objetivos`) o el opener
 * (`opener.objetivos`). El nuevo objetivo debe ser candidato de ESE efecto, con sus mismos filtros y zona; si no lo es,
 * o no hay nada debajo con objetivo, el redirect no hace nada.
 *
 * La posición del paso en curso la lleva `GameState.pasoResolviendo` (chain.resolverPila).
 */
import { getCardMeta } from './cards'
import { objetivoCompleto } from './effectInterpreter'
import { reglaBool } from './reglas'
import { resolveTargets } from './targetResolver'
import { ordenResolucion, type PasoResolucion } from './triggers'
import type { EfectoData } from '../../shared/types'
import type { CardInstance, Ctx, GameState, PlayerId } from './types'

/** ¿Es `paso` la entrada de la pila que corresponde a la carta `id`? */
function esDeFuente(paso: PasoResolucion | undefined, id: string): boolean {
  if (!paso) return false
  return 'respuesta' in paso ? paso.respuesta === id : paso.trigger.cardInstanceId === id
}

/** El nuevo objetivo debe ser candidato del efecto redirigido (mismos filtros y zona), visto desde su controlador. */
function esCandidato(s: GameState, efecto: EfectoData | undefined, controlador: PlayerId, fuenteId: string, nuevo: string): boolean {
  if (!efecto?.objetivo || efecto.objetivo.tipo === 'self') return false
  return resolveTargets(s, objetivoCompleto(efecto), controlador, fuenteId).includes(nuevo)
}

/**
 * Reescribe el primer objetivo guardado (por índice de efecto) al que `nuevo` pueda apuntar.
 * Devuelve true si cambió alguno.
 */
function redirigirObjetivos(
  s: GameState,
  objetivos: Record<number, string> | undefined,
  cardInstanceId: string,
  controlador: PlayerId,
  nuevo: string,
): boolean {
  const cardId = s.instances[cardInstanceId]?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  const efectos = meta && 'efectos' in meta ? meta.efectos : undefined
  if (!objetivos || !efectos) return false
  const indices = Object.keys(objetivos).map(Number).sort((a, b) => a - b)
  const idx = indices.find((i) => esCandidato(s, efectos[i], controlador, cardInstanceId, nuevo))
  if (idx === undefined) return false
  objetivos[idx] = nuevo
  return true
}

/** Ejecuta `redirect` de `fuente` (controlada por `jugador`) hacia el objetivo ya elegido `targetIds[0]`. */
export function ejecutarRedirect(s: GameState, ctx: Ctx, fuente: CardInstance, targetIds: string[], jugador: PlayerId): void {
  const nuevo = targetIds[0]
  const cadena = s.cadena
  const i = s.pasoResolviendo
  if (!nuevo || !s.instances[nuevo] || !cadena || i === undefined) return
  const pasos = ordenResolucion(cadena)
  // El paso en curso debe ser el de ESTA carta (un trigger anidado que resuelve ya no tiene entrada debajo)
  if (!esDeFuente(pasos[i], fuente.cardInstanceId)) return

  const debajo = pasos[i + 1]
  // INEGABLE (§10): un efecto del rival no puede contrarrestar los efectos de una carta con `puedeSerNegada` apagada
  const cartaDebajo = debajo ? ('trigger' in debajo ? debajo.trigger.cardInstanceId : debajo.respuesta) : cadena.opener?.cardInstanceId
  const duenioDebajo = debajo
    ? 'trigger' in debajo ? debajo.trigger.jugador : (cadena.respuestas?.[debajo.respuesta]?.jugador ?? s.instances[debajo.respuesta]?.owner)
    : cadena.opener?.jugador
  if (cartaDebajo && duenioDebajo !== jugador && !reglaBool(s, 'puedeSerNegada', { instId: cartaDebajo })) return
  let entrada: string | undefined
  let cambio = false
  if (debajo && 'trigger' in debajo) {
    const t = debajo.trigger
    const cardId = s.instances[t.cardInstanceId]?.cardId
    const meta = cardId ? getCardMeta(cardId) : null
    const efecto = meta && 'efectos' in meta ? meta.efectos?.[t.efectoIdx] : undefined
    if (t.objetivoId !== undefined && esCandidato(s, efecto, t.jugador, t.cardInstanceId, nuevo)) {
      t.objetivoId = nuevo
      entrada = t.cardInstanceId
      cambio = true
    }
  } else if (debajo) {
    const datos = cadena.respuestas?.[debajo.respuesta]
    const controlador = datos?.jugador ?? s.instances[debajo.respuesta]?.owner
    if (controlador && redirigirObjetivos(s, datos?.objetivos, debajo.respuesta, controlador, nuevo)) {
      entrada = debajo.respuesta
      cambio = true
    }
  } else if (cadena.opener && !cadena.opener.negada) {
    const o = cadena.opener
    if (o.tipo === 'habilidad') {
      // la habilidad guarda su objetivo por índice del efecto que se activó
      const cardId = s.instances[o.cardInstanceId]?.cardId
      const meta = cardId ? getCardMeta(cardId) : null
      const efecto = meta && 'efectos' in meta ? meta.efectos?.[o.efectoIdx ?? -1] : undefined
      if (o.objetivos && o.efectoIdx !== undefined && esCandidato(s, efecto, o.jugador, o.cardInstanceId, nuevo)) {
        o.objetivos[o.efectoIdx] = nuevo
        entrada = o.cardInstanceId
        cambio = true
      }
    } else if (redirigirObjetivos(s, o.objetivos, o.cardInstanceId, o.jugador, nuevo)) {
      entrada = o.cardInstanceId
      cambio = true
    }
  }
  if (cambio && entrada) ctx.emit({ type: 'objetivo_redirigido', jugador, cardInstanceId: entrada, objetivoId: nuevo })
}
