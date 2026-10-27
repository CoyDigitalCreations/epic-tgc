/**
 * Evaluación de un tablero desde la perspectiva de un jugador (positivo = va ganando).
 *
 * SOLO usa información que ese jugador conoce: el tablero (público), los conteos de las zonas ocultas del rival
 * (tamaño de mano y de mazo) y SU PROPIA mano. Nunca mira las cartas de la mano ni del mazo del rival.
 */
import { getCardMeta, keywordsDe, LIMITE_MANO, statsDe } from '../online/game'
import type { GameState, PlayerId } from '../online/game'

export interface Pesos {
  /** Vínculo vivo propio / del rival: es lo que decide la partida (sin Vínculos se pierde). */
  vinculo: number
  /** Último Vínculo vivo: a un golpe de perder / ganar. */
  ultimoVinculo: number
  /** Campeón en el campo (existir) y por punto de poder / resistencia. */
  campeon: number
  poder: number
  resistencia: number
  /** Campeón agotado: no puede bloquear. Fracción del valor del campeón que se pierde. */
  agotado: number
  /** Cada carta de la mano propia, más su coste. */
  mano: number
  manoCoste: number
  /** Éter (reserva + pagado + bloqueado): recurso. */
  eter: number
  /** Cartas de soporte en el campo (Místicas/Arcanas colocadas). */
  soporte: number
  /** Mazo propio por debajo de `mazoBajoUmbral`: cada carta que falta penaliza (perder por mazo vacío). */
  mazoBajo: number
  mazoBajoUmbral: number
  /** Cada carta de más sobre el límite de mano al terminar el turno (se descarta de todos modos). */
  excesoMano: number
}

export const PESOS: Pesos = {
  vinculo: 30,
  ultimoVinculo: 40,
  campeon: 4,
  poder: 1.5,
  resistencia: 1,
  agotado: 0.2,
  mano: 1,
  manoCoste: 0.3,
  eter: 0.4,
  soporte: 1.5,
  mazoBajo: 6,
  mazoBajoUmbral: 6,
  excesoMano: 50,
}

const VICTORIA = 1e6

function vinculosVivos(s: GameState, j: PlayerId): number {
  let n = 0
  for (const id of s.players[j].vinculos) if (id && !s.instances[id]?.bocaArriba) n++
  return n
}

function valorTablero(s: GameState, j: PlayerId, w: Pesos): number {
  let v = 0
  for (const id of s.players[j].campo.campeones) {
    if (!id) continue
    const st = statsDe(s, id)
    let valor = w.campeon + w.poder * st.poder + w.resistencia * st.resistencia
    const inst = s.instances[id]
    if (inst?.agotado) valor *= 1 - w.agotado
    if (keywordsDe(s, id).length > 0) valor += 0.5
    v += valor
  }
  for (const id of [...s.players[j].campo.misticasTacticas, ...s.players[j].campo.arcanasCombate]) if (id) v += w.soporte
  return v
}

function eterDe(s: GameState, j: PlayerId): number {
  const p = s.players[j]
  let n = p.eterReserva.length + p.eterPagado.length
  for (const id of p.campo.campeones) if (id) n += s.instances[id]?.eterBloqueado?.length ?? 0
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) if (id) n += s.instances[id]?.eterBloqueado?.length ?? 0
  return n
}

function costeDe(s: GameState, id: string): number {
  const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
  const stats = meta && 'stats' in meta ? (meta.stats as { cost?: number } | undefined) : undefined
  return stats?.cost ?? 0
}

/** Valor de `s` para `yo` (la diferencia entre lo suyo y lo del rival). */
export function evaluar(s: GameState, yo: PlayerId, w: Pesos = PESOS): number {
  const rival: PlayerId = yo === 'A' ? 'B' : 'A'
  if (s.fase === 'terminada') {
    if (!s.ganador) return 0
    return s.ganador === yo ? VICTORIA : -VICTORIA
  }

  const mios = vinculosVivos(s, yo)
  const suyos = vinculosVivos(s, rival)
  let v = w.vinculo * (mios - suyos)
  if (mios === 1) v -= w.ultimoVinculo
  if (suyos === 1) v += w.ultimoVinculo

  v += valorTablero(s, yo, w) - valorTablero(s, rival, w)
  v += w.eter * (eterDe(s, yo) - eterDe(s, rival))

  // Mano: la mía por lo que valen mis cartas; la del rival solo por su tamaño (no sé qué tiene)
  for (const id of s.players[yo].mano) v += w.mano + w.manoCoste * costeDe(s, id)
  v -= w.mano * s.players[rival].mano.length

  // Ocaso con la mano pasada del límite: el descarte es OBLIGATORIO. Sin esto «tener más cartas» parecía bueno y el bot
  // descartaba y recuperaba la misma carta una y otra vez (la que se devuelve a la mano al ir al Cementerio).
  if (s.fase === 'ocaso') {
    const exceso = s.players[yo].mano.length - LIMITE_MANO
    if (exceso > 0) v -= w.excesoMano * exceso
  }

  // Mazo: quedarse sin cartas es perder; que el rival se quede, ganar
  const miMazo = s.players[yo].mazo.length
  const suMazo = s.players[rival].mazo.length
  if (miMazo < w.mazoBajoUmbral) v -= w.mazoBajo * (w.mazoBajoUmbral - miMazo)
  if (suMazo < w.mazoBajoUmbral) v += w.mazoBajo * (w.mazoBajoUmbral - suMazo)
  return v
}
