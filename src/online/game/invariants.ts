/**
 * Invariantes del motor (extraídas de __tests__/simulacion.test.ts, C4):
 * verificaciones de zona/Éter válidas para TODO estado de partida con mazo
 * estándar (66 cartas = 15 Éter + 45 Principal + 6 Vínculos). Usadas por
 * bot-combat.test.ts y simulacion.test.ts; el bot nunca debe violarlas.
 */
import type { GameState, PlayerId } from './types'

/** Devuelve las violaciones encontradas (vacío = estado válido). */
export function verificarInvariantes(estado: GameState): string[] {
  const violaciones: string[] = []
  for (const p of ['A', 'B'] as PlayerId[]) {
    const st = estado.players[p]
    // Mano ≤ 7: el Alba roba 1 sobre 6 (descarte a 6 recién en Ocaso; el fin de
    // partida por mazo_vacio puede dejar 7). Cota dura, no la de Ocaso.
    if (st.mano.length > 7) violaciones.push(`${p}: mano ${st.mano.length} > 7`)

    // 15 Éter: 2A + 1A + bloqueados (el bloqueado vive en Campeón.eterBloqueado)
    let bloqueados = 0
    for (const id of st.campo.campeones) {
      if (!id) continue
      bloqueados += estado.instances[id]?.eterBloqueado?.length ?? 0
    }
    const eter = st.eterReserva.length + st.eterPagado.length + bloqueados
    if (eter !== 15) violaciones.push(`${p}: ${eter} Éter ≠ 15`)

    const campeones = st.campo.campeones.filter((x): x is string => x !== null).length
    if (campeones > 5) violaciones.push(`${p}: ${campeones} Campeones > 5`)
    const misticas = st.campo.misticasTacticas.filter((x): x is string => x !== null).length
    if (misticas > 3) violaciones.push(`${p}: ${misticas} Místicas/Tácticas > 3`)
    const arcanas = st.campo.arcanasCombate.filter((x): x is string => x !== null).length
    if (arcanas > 3) violaciones.push(`${p}: ${arcanas} Arcanas/Combates > 3`)

    // Las 66 cartas del dueño siguen en sus zonas (nada se duplica ni se pierde)
    const vinculos = st.vinculos.filter((x): x is string => x !== null).length
    const total =
      st.mano.length +
      st.mazo.length +
      st.cementerio.length +
      st.exilio.length +
      st.eterReserva.length +
      st.eterPagado.length +
      campeones +
      misticas +
      arcanas +
      vinculos +
      bloqueados
    if (total !== 66) violaciones.push(`${p}: ${total} cartas ≠ 66`)
  }
  return violaciones
}
