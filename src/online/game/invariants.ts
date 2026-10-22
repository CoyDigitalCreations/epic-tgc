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
    // Mano: la cota del MANUAL (≤ 6 tras OCASO) es de FASE y la hace valer el
    // motor (validarPasarTurno no deja pasar con > 6 — descarte obligatorio).
    // NO es invariante de estado arbitrario: en Forja/Choque crece con efectos
    // (p.ej. activar una Arcana que roba 2 → 8 legítimo) y en Ocaso estás en
    // pleno descarte. Aquí queda solo la cota de SANIDAD: nunca más que las
    // 45 cartas del Mazo Principal en mano (corta duplicaciones descabelladas;
    // la integridad total 66 zonas más abajo es la guarda dura real).
    if (st.mano.length > 45) violaciones.push(`${p}: mano ${st.mano.length} > 45 (imposible: mazo principal = 45)`)

    // 15 Éter: 2A + 1A + bloqueados (el bloqueado vive en inst.eterBloqueado
    // de CUALQUIER carta en campo — Campeones 2B-2F y Artefactos 3A-3F, Fase 3a)
    let bloqueados = 0
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      for (const id of st.campo[grupo]) {
        if (!id) continue
        bloqueados += estado.instances[id]?.eterBloqueado?.length ?? 0
      }
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
