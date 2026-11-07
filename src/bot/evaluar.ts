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
  /**
   * Por punto de ATQ + RES de un Campeón en la mano propia. Sin esto todos los Campeones del mismo coste valían igual en la mano y
   * el bot no sabía elegir entre ellos al buscar en el mazo (el Emisario del Nudo traía a Ragnar 1 de cada 15 veces, siendo 9/9).
   */
  manoCampeon: number
  /** Éter (reserva + pagado + bloqueado): recurso. */
  eter: number
  /**
   * Éter arrebatado (Disonancia): se mira el DUEÑO (`inst.owner`), no la zona, porque el motor lo devuelve a la Reserva de su
   * dueño en el Alba de su dueño (`reagruparEter`). Fracción de su valor que conserva el dueño mientras el rival lo tiene prestado
   * (1 = no pierde nada, porque vuelve). Antes se contaba por zona y el dueño lo daba por perdido (0).
   */
  eterRobado: number
  /**
   * Fracción del valor de un Éter que tienes PRESTADO (ajeno): solo lo puedes gastar, no activa sus efectos, no se bloquea y se te va
   * en el Alba de su dueño. Antes valía como uno propio (1).
   */
  eterPrestado: number
  /** Cartas de soporte en el campo (Místicas/Arcanas colocadas). */
  soporte: number
  /**
   * Bonus por cada Arcana colocada. Al bajarla deja de contar en la mano (`mano + manoCoste × coste`, hasta 1.9) y su efecto es
   * futuro, así que el tablero solo la veía como `soporte`: el saldo salía negativo y el bot nunca las colocaba (FB-023/024: 0 de
   * ~70 veces vistas). Plano a propósito: la Arcana rival está boca abajo y su coste no se debe leer.
   */
  arcanaColocada: number
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
  manoCampeon: 0.2,
  eter: 0.4,
  eterRobado: 1,
  eterPrestado: 0.25,
  soporte: 1.5,
  arcanaColocada: 1,
  mazoBajo: 6,
  mazoBajoUmbral: 6,
  excesoMano: 50,
}

/** Los pesos de ANTES de valorar el Éter arrebatado por dueño: línea base para medir la mejora en la arena (`dificil-antes`). */
export const PESOS_ANTES: Pesos = { ...PESOS, eterRobado: 0, eterPrestado: 1, arcanaColocada: 0, manoCampeon: 0 }

/** Los pesos de ANTES de bonificar la Arcana colocada: línea base de ese único cambio (`dificil-sin-arcana`). */
export const PESOS_SIN_ARCANA: Pesos = { ...PESOS, arcanaColocada: 0, manoCampeon: 0 }

/** Los pesos de ANTES de valorar los stats de los Campeones en la mano: línea base de ese único cambio (`dificil-sin-mano-campeon`). */
export const PESOS_SIN_MANO_CAMPEON: Pesos = { ...PESOS, manoCampeon: 0 }

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
  for (const id of s.players[j].campo.arcanasCombate) if (id) v += w.arcanaColocada
  return v
}

/**
 * Éter de `j` en unidades de «Éter propio». Cuenta por DUEÑO: el prestado que tiene `j` pesa `eterPrestado`, y el suyo que tiene el
 * rival en la Reserva o la zona de pago pesa `eterRobado` (vuelve en su Alba). Sin Éter arrebatado en juego da lo mismo que antes.
 */
function eterDe(s: GameState, j: PlayerId, w: Pesos): number {
  const p = s.players[j]
  const rival = s.players[j === 'A' ? 'B' : 'A']
  let n = 0
  for (const id of [...p.eterReserva, ...p.eterPagado]) n += (s.instances[id]?.owner ?? j) === j ? 1 : w.eterPrestado
  for (const id of [...rival.eterReserva, ...rival.eterPagado]) if (s.instances[id]?.owner === j) n += w.eterRobado
  for (const id of p.campo.campeones) if (id) n += s.instances[id]?.eterBloqueado?.length ?? 0
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) if (id) n += s.instances[id]?.eterBloqueado?.length ?? 0
  return n
}

function costeDe(s: GameState, id: string): number {
  const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
  const stats = meta && 'stats' in meta ? (meta.stats as { cost?: number } | undefined) : undefined
  return stats?.cost ?? 0
}

/** ATQ + RES base de una carta (0 si no es Campeón). */
function statsSumaDe(s: GameState, id: string): number {
  const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
  const stats = meta && 'stats' in meta ? (meta.stats as { poder?: number; resistencia?: number } | undefined) : undefined
  return (stats?.poder ?? 0) + (stats?.resistencia ?? 0)
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
  v += w.eter * (eterDe(s, yo, w) - eterDe(s, rival, w))

  // Mano: la mía por lo que valen mis cartas; la del rival solo por su tamaño (no sé qué tiene)
  for (const id of s.players[yo].mano) v += w.mano + w.manoCoste * costeDe(s, id) + w.manoCampeon * statsSumaDe(s, id)
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
